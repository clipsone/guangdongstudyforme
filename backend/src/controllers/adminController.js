// 管理员后台：数据总览 / 题库管理 / 纠错反馈 / 用户管理
import prisma from '../utils/prisma.js';
import { syncLawCurriculum as syncLawData, ensureLawExamTemplates } from '../services/lawCurriculum.service.js';


// 幂等同步本科法学课程、知识点和基础练习题（管理员专用）
export const syncLawCurriculum = async (_req, res) => {
  try { res.json({ data: await syncLawData() }); }
  catch (error) { console.error('[法学课程同步]', error); res.status(500).json({ error: { message: '法学课程同步失败', status: 500 } }); }
};

// 数据总览
export const getStats = async (req, res) => {
  try {
    const [users, questions, bySubject, feedbacks, exams, exercises] = await Promise.all([
      prisma.user.count(),
      prisma.question.count(),
      prisma.question.groupBy({ by: ['subjectId'], _count: { _all: true } }),
      prisma.questionFeedback.count({ where: { status: 'pending' } }),
      prisma.exam.count({ where: { status: 'completed' } }),
      prisma.exerciseRecord.count(),
    ]);
    const subjects = await prisma.subject.findMany();
    res.json({
      data: {
        users,
        questions,
        pendingFeedbacks: feedbacks,
        exams,
        exercises,
        bySubject: bySubject.map((b) => ({
          name: subjects.find((s) => s.id === b.subjectId)?.name || '?',
          count: b._count._all,
        })),
      },
    });
  } catch (error) {
        console.error('[API错误]', error?.message || error);
        res.status(500).json({ error: { message: '服务器内部错误', status: 500 } });
  }
};


// 分区覆盖度（管理员补题用）：模板各区需求 vs 题库现有
export const getCoverage = async (req, res) => {
  try {
    const { subjectId } = req.query;
    if (!subjectId) return res.status(400).json({ error: { message: '缺少 subjectId', status: 400 } });
    const template = await prisma.examTemplate.findFirst({ where: { subjectId } });
    if (!template) return res.status(404).json({ error: { message: '模板不存在', status: 404 } });
    const sections = (template.config && template.config.sections) || [];
    const groups = await prisma.question.groupBy({
      by: ['section'],
      where: { subjectId, status: 'active' },
      _count: { _all: true },
    });
    const map = new Map(groups.map((g) => [g.section, g._count._all]));
    res.json({
      data: sections.map((s) => ({
        name: s.name,
        type: s.type,
        countPerExam: s.count,
        have: map.get(s.name) || 0,
      })),
    });
  } catch (error) {
        console.error('[API错误]', error?.message || error);
        res.status(500).json({ error: { message: '服务器内部错误', status: 500 } });
  }
};

// 题目列表（管理）
export const getQuestions = async (req, res) => {
  try {
    const { subjectId, section, status = 'active', page = 1, pageSize = 20 } = req.query;
    const where = {};
    if (subjectId) where.subjectId = subjectId;
    if (section) where.section = section;
    if (status) where.status = status;

    const [total, questions] = await Promise.all([
      prisma.question.count({ where }),
      prisma.question.findMany({
        where,
        include: { subject: true },
        orderBy: { createdAt: 'desc' },
        skip: (parseInt(page) - 1) * parseInt(pageSize),
        take: parseInt(pageSize),
      }),
    ]);
    res.json({ data: { total, list: questions } });
  } catch (error) {
        console.error('[API错误]', error?.message || error);
        res.status(500).json({ error: { message: '服务器内部错误', status: 500 } });
  }
};

// 编辑题目
export const updateQuestion = async (req, res) => {
  try {
    const { id } = req.params;
    const { stem, options, answer, analysis, section, difficulty } = req.body;
    const existing = await prisma.question.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ error: { message: '题目不存在', status: 404 } });

    const data = {};
    if (stem !== undefined) data.stem = String(stem).trim();
    if (options !== undefined) data.options = Array.isArray(options) ? options.map((o) => String(o).trim()) : null;
    if (answer !== undefined) data.answer = String(answer).trim();
    if (section !== undefined) data.section = section || null;
    if (difficulty !== undefined) data.difficulty = Math.min(5, Math.max(1, parseInt(difficulty) || 3));
    if (analysis !== undefined) {
      const sol = existing.solution || {};
      data.solution = { ...sol, analysis: String(analysis).trim() };
    }
    if (Object.keys(data).length === 0) {
      return res.status(400).json({ error: { message: '没有可更新的字段', status: 400 } });
    }

    const updated = await prisma.question.update({ where: { id }, data });
    res.json({ data: updated });
  } catch (error) {
        console.error('[API错误]', error?.message || error);
        res.status(500).json({ error: { message: '服务器内部错误', status: 500 } });
  }
};

// 删除题目（软删）
export const archiveQuestion = async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.question.update({ where: { id }, data: { status: 'archived' } });
    res.json({ data: { ok: true } });
  } catch (error) {
    if (error.code === 'P2025') return res.status(404).json({ error: { message: '题目不存在', status: 404 } });
        console.error('[API错误]', error?.message || error);
        res.status(500).json({ error: { message: '服务器内部错误', status: 500 } });
  }
};

// 纠错反馈列表
export const getFeedbacks = async (req, res) => {
  try {
    const { status = 'pending' } = req.query;
    const feedbacks = await prisma.questionFeedback.findMany({
      where: { status },
      include: {
        question: { include: { subject: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    res.json({ data: feedbacks });
  } catch (error) {
        console.error('[API错误]', error?.message || error);
        res.status(500).json({ error: { message: '服务器内部错误', status: 500 } });
  }
};

// 处理纠错反馈：fixed / ignored
export const resolveFeedback = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body; // fixed / ignored
    if (!['fixed', 'ignored'].includes(status)) {
      return res.status(400).json({ error: { message: 'status 需为 fixed 或 ignored', status: 400 } });
    }
    const updated = await prisma.questionFeedback.update({ where: { id }, data: { status } });
    res.json({ data: updated });
  } catch (error) {
    if (error.code === 'P2025') return res.status(404).json({ error: { message: '反馈不存在', status: 404 } });
        console.error('[API错误]', error?.message || error);
        res.status(500).json({ error: { message: '服务器内部错误', status: 500 } });
  }
};

// 用户列表
export const getUsers = async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        username: true,
        role: true,
        targetScore: true,
        createdAt: true,
        _count: { select: { exerciseRecords: true, examRecords: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ data: users });
  } catch (error) {
        console.error('[API错误]', error?.message || error);
        res.status(500).json({ error: { message: '服务器内部错误', status: 500 } });
  }
};

// 设置/取消管理员
export const setUserRole = async (req, res) => {
  try {
    const { id } = req.params;
    const { role } = req.body; // admin / user
    if (!['admin', 'user'].includes(role)) {
      return res.status(400).json({ error: { message: 'role 需为 admin 或 user', status: 400 } });
    }
    if (id === req.userId && role !== 'admin') {
      return res.status(400).json({ error: { message: '不能取消自己的管理员权限', status: 400 } });
    }
    const updated = await prisma.user.update({ where: { id }, data: { role } });
    res.json({ data: { id: updated.id, username: updated.username, role: updated.role } });
  } catch (error) {
    if (error.code === 'P2025') return res.status(404).json({ error: { message: '用户不存在', status: 404 } });
        console.error('[API错误]', error?.message || error);
        res.status(500).json({ error: { message: '服务器内部错误', status: 500 } });
  }
};

// 删除用户
export const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;
    if (id === req.userId) {
      return res.status(400).json({ error: { message: '不能删除自己', status: 400 } });
    }
    await prisma.user.delete({ where: { id } });
    res.json({ data: { ok: true } });
  } catch (error) {
    if (error.code === 'P2025') return res.status(404).json({ error: { message: '用户不存在', status: 404 } });
        console.error('[API错误]', error?.message || error);
        res.status(500).json({ error: { message: '服务器内部错误', status: 500 } });
  }
};
