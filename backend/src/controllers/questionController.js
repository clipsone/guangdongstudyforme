import prisma from '../utils/prisma.js';

// 获取题目列表
export const getQuestions = async (req, res) => {
  try {
    const {
      subjectId,
      type,
      section,
      difficulty,
      knowledgePointId,
      limit = 20,
      offset = 0
    } = req.query;

    const where = {};

    if (subjectId) where.subjectId = subjectId;
    if (type) where.type = type;
    if (section) where.section = section;
    if (difficulty) where.difficulty = parseInt(difficulty);

    if (knowledgePointId) {
      const questionKnowledge = await prisma.questionKnowledge.findMany({
        where: { knowledgePointId },
        select: { questionId: true }
      });
      where.id = { in: questionKnowledge.map(q => q.questionId) };
    }

    const [questions, total] = await Promise.all([
      prisma.question.findMany({
        where,
        include: {
          subject: true,
          questionKnowledge: {
            include: {
              knowledgePoint: true
            }
          }
        },
        take: parseInt(limit),
        skip: parseInt(offset),
        orderBy: { createdAt: 'desc' }
      }),
      prisma.question.count({ where })
    ]);

    res.json({
      data: questions,
      meta: {
        total,
        limit: parseInt(limit),
        offset: parseInt(offset)
      }
    });
  } catch (error) {
        console.error('[API错误]', error?.message || error);
        res.status(500).json({ error: { message: '服务器内部错误', status: 500 } });
  }
};

// 获取单个题目详情
export const getQuestionById = async (req, res) => {
  try {
    const { id } = req.params;

    const question = await prisma.question.findUnique({
      where: { id },
      include: {
        subject: true,
        questionKnowledge: {
          include: {
            knowledgePoint: {
              include: {
                chapter: true
              }
            }
          }
        }
      }
    });

    if (!question) {
      return res.status(404).json({ error: { message: '题目不存在', status: 404 } });
    }

    res.json({ data: question });
  } catch (error) {
        console.error('[API错误]', error?.message || error);
        res.status(500).json({ error: { message: '服务器内部错误', status: 500 } });
  }
};
// 提交题目纠错反馈（AI 生成题答案可能有误，收集后复核修正）
export const submitQuestionFeedback = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const userId = req.userId;

    const question = await prisma.question.findUnique({ where: { id } });
    if (!question) {
      return res.status(404).json({ error: { message: '题目不存在', status: 404 } });
    }
    const r = String(reason || '').trim();
    if (!r) {
      return res.status(400).json({ error: { message: '请填写反馈原因', status: 400 } });
    }

    // 同一用户对同一题只记一条待处理反馈
    const existing = await prisma.questionFeedback.findFirst({
      where: { questionId: id, userId, status: 'pending' },
    });
    if (existing) {
      return res.json({ data: { ok: true, duplicate: true } });
    }

    const fb = await prisma.questionFeedback.create({
      data: { questionId: id, userId, reason: r.slice(0, 300) },
    });
    res.json({ data: { ok: true, id: fb.id } });
  } catch (error) {
        console.error('[API错误]', error?.message || error);
        res.status(500).json({ error: { message: '服务器内部错误', status: 500 } });
  }
};
