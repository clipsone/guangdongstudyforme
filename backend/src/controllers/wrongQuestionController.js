import prisma from '../utils/prisma.js';
import { checkAndUnlockAchievements } from '../services/achievement.service.js';

// 获取错题本
export const getWrongQuestions = async (req, res) => {
  try {
    const { userId, knowledgePointId, mastered, limit = 20 } = req.query;

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
    res.status(500).json({ error: { message: error.message, status: 500 } });
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

    const updated = await prisma.wrongQuestion.update({
      where: { id },
      data: {
        reviewCount: wrongQuestion.reviewCount + 1,
        mastered: isCorrect && wrongQuestion.reviewCount >= 1
      }
    });

    const newAchievements = await checkAndUnlockAchievements(wrongQuestion.userId).catch(() => []);

    res.json({ data: updated, newAchievements });
  } catch (error) {
    res.status(500).json({ error: { message: error.message, status: 500 } });
  }
};

// 批量错题重练
export const batchReviewWrongQuestions = async (req, res) => {
  try {
    const { userId, questionIds } = req.body;

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
              mastered: true
            }
          });
        }
        return null;
      })
    );

    res.json({ data: results.filter(r => r !== null) });
  } catch (error) {
    res.status(500).json({ error: { message: error.message, status: 500 } });
  }
};