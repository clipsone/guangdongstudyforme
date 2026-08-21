import prisma from '../utils/prisma.js';
import { getUserMasteryMap, upsertUserMastery } from '../services/mastery.service.js';

// 获取知识图谱
export const getKnowledge = async (req, res) => {
  try {
    const { subjectId } = req.query;

    const user = await prisma.user.findUnique({ where: { id: req.userId }, select: { examMode: true } });
    const allowedCodes = user?.examMode === 'undergraduate'
      ? ['CET4', 'CET6', 'IELTS', 'TOEFL', 'LAW', 'UNIV', 'PAPER']
      : ['Y', 'M', 'E'];
    const where = { chapter: { subject: { code: { in: allowedCodes } } } };
    if (subjectId) where.chapter.subjectId = subjectId;

    const knowledgePoints = await prisma.knowledgePoint.findMany({
      where,
      include: {
        chapter: {
          include: {
            subject: true
          }
        },
        children: true,
        parent: true
      },
      orderBy: [
        { chapter: { order: 'asc' } },
        { code: 'asc' }
      ]
    });

    // 按用户掌握度覆盖（新用户全 0）
    const masteryMap = await getUserMasteryMap(req.userId);
    const data = knowledgePoints.map((kp) => ({
      ...kp,
      mastery: masteryMap.get(kp.id) ?? 0,
      status: (masteryMap.get(kp.id) ?? 0) >= 80 ? 'mastered' : kp.status,
    }));

    res.json({ data });
  } catch (error) {
        console.error('[API错误]', error?.message || error);
        res.status(500).json({ error: { message: '服务器内部错误', status: 500 } });
  }
};

// 获取单个考点详情
export const getKnowledgeById = async (req, res) => {
  try {
    const { id } = req.params;

    const knowledgePoint = await prisma.knowledgePoint.findUnique({
      where: { id },
      include: {
        chapter: {
          include: {
            subject: true
          }
        },
        parent: true,
        children: true
      }
    });

    if (!knowledgePoint) {
      return res.status(404).json({ error: { message: '考点不存在', status: 404 } });
    }

    // 前置依赖详情：prerequisites 字段存的是考点 code 数组
    let prerequisitesDetails = [];
    if (Array.isArray(knowledgePoint.prerequisites) && knowledgePoint.prerequisites.length > 0) {
      prerequisitesDetails = await prisma.knowledgePoint.findMany({
        where: { code: { in: knowledgePoint.prerequisites } }
      });
    }

    // 获取相关题目统计
    const questionStats = await prisma.questionKnowledge.groupBy({
      by: ['questionId'],
      where: { knowledgePointId: id },
      _count: true
    });

    res.json({
      data: { ...knowledgePoint, prerequisitesDetails, mastery: (await getUserMasteryMap(req.userId)).get(id) ?? 0 },
      stats: {
        questionCount: questionStats.length
      }
    });
  } catch (error) {
        console.error('[API错误]', error?.message || error);
        res.status(500).json({ error: { message: '服务器内部错误', status: 500 } });
  }
};

// 更新知识点掌握度（按用户）
export const updateMastery = async (req, res) => {
  try {
    const { id } = req.params;
    const { mastery } = req.body;
    const userId = req.userId;

    await upsertUserMastery(userId, id, Number(mastery) || 0);

    res.json({ data: { id, mastery: Number(mastery) || 0 } });
  } catch (error) {
        console.error('[API错误]', error?.message || error);
        res.status(500).json({ error: { message: '服务器内部错误', status: 500 } });
  }
};