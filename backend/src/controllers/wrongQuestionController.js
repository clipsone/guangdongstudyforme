import prisma from '../utils/prisma.js';
import { checkAndUnlockAchievements } from '../services/achievement.service.js';

// 艾宾浩斯复习间隔（天）：按已复习次数递进
const REVIEW_INTERVALS = [1, 3, 7, 15, 30];
const nextReviewDate = (reviewCount) => {
  const days = REVIEW_INTERVALS[Math.min(reviewCount, REVIEW_INTERVALS.length - 1)];
  return new Date(Date.now() + days * 86400000);
};

// 今日待复习错题（到期未掌握的）
export const getReviewDue = async (req, res) => {
  try {
    const userId = req.userId;
    const now = new Date();
    const wrongQuestions = await prisma.wrongQuestion.findMany({
      where: {
        userId,
        mastered: false,
        OR: [{ nextReviewAt: { lte: now } }, { nextReviewAt: null }],
      },
      include: {
        question: {
          include: {
            subject: true,
            questionKnowledge: { include: { knowledgePoint: true } },
          },
        },
      },
      orderBy: { nextReviewAt: 'asc' },
      take: 30,
    });
    res.json({ data: wrongQuestions });
  } catch (error) {
        console.error('[API错误]', error?.message || error);
        res.status(500).json({ error: { message: '服务器内部错误', status: 500 } });
  }
};

// 获取错题本
export const getWrongQuestions = async (req, res) => {
  try {
    const { knowledgePointId, mastered, limit = 20 } = req.query;
    const userId = req.userId;

    const where = {};
    if (userId) where.userId = userId;
    if (mastered !== undefined) where.mastered = mastered === 'true';

    let wrongQuestions = await prisma.wrongQuestion.findMany({
      where,
      include: {
        question: {
          include: {
            subject: true,
            questionKnowledge: {
              include: {
                knowledgePoint: true
              }
            }
          }
        }
      },
      orderBy: { lastWrongAt: 'desc' },
      take: parseInt(limit)
    });

    // 按知识点筛选
    if (knowledgePointId) {
      wrongQuestions = wrongQuestions.filter(wq =>
        wq.question.questionKnowledge.some(qk => qk.knowledgePoint.id === knowledgePointId)
      );
    }

    res.json({ data: wrongQuestions });
  } catch (error) {
        console.error('[API错误]', error?.message || error);
        res.status(500).json({ error: { message: '服务器内部错误', status: 500 } });
  }
};

// 错题重练提交
export const reviewWrongQuestion = async (req, res) => {
  try {
    const { id } = req.params;
    const { isCorrect } = req.body;

    const wrongQuestion = await prisma.wrongQuestion.findUnique({
      where: { id }
    });

    if (!wrongQuestion) {
      return res.status(404).json({ error: { message: '错题不存在', status: 404 } });
    }
    if (wrongQuestion.userId !== req.userId) {
      return res.status(403).json({ error: { message: '无权操作他人的错题', status: 403 } });
    }

    const updated = await prisma.wrongQuestion.update({
      where: { id },
      data: {
        reviewCount: wrongQuestion.reviewCount + 1,
        mastered: isCorrect && wrongQuestion.reviewCount >= 1,
        // 掌握后不再安排；未掌握按艾宾浩斯递进安排下次复习（复习后间隔递增：1→3→7→15→30 天）
        nextReviewAt: isCorrect && wrongQuestion.reviewCount >= 1 ? null : nextReviewDate(wrongQuestion.reviewCount + 1),
      }
    });

    const newAchievements = await checkAndUnlockAchievements(wrongQuestion.userId).catch(() => []);

    res.json({ data: updated, newAchievements });
  } catch (error) {
        console.error('[API错误]', error?.message || error);
        res.status(500).json({ error: { message: '服务器内部错误', status: 500 } });
  }
};

// 批量错题重练
export const batchReviewWrongQuestions = async (req, res) => {
  try {
    const { questionIds } = req.body;
    const userId = req.userId;

    const results = await Promise.all(
      questionIds.map(async (questionId) => {
        const wrongQuestion = await prisma.wrongQuestion.findUnique({
          where: {
            userId_questionId: {
              userId,
              questionId
            }
          }
        });

        if (wrongQuestion) {
          return prisma.wrongQuestion.update({
            where: { id: wrongQuestion.id },
            data: {
              reviewCount: wrongQuestion.reviewCount + 1,
              mastered: true,
              nextReviewAt: null,
            }
          });
        }
        return null;
      })
    );

    res.json({ data: results.filter(r => r !== null) });
  } catch (error) {
        console.error('[API错误]', error?.message || error);
        res.status(500).json({ error: { message: '服务器内部错误', status: 500 } });
  }
};