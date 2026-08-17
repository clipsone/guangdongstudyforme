import prisma from '../utils/prisma.js';
import { generatePaper } from '../services/paper.service.js';
import { checkAndUnlockAchievements } from '../services/achievement.service.js';
import { recordMasterySnapshot } from '../services/mastery.service.js';

// 生成练习 AI 小结（mock，基于正确率与薄弱考点）
async function buildAiSummary(userId, subjectId, accuracy, correctCount, totalCount) {
  const subjects = await prisma.subject.findMany();
  const subject = subjects.find((s) => s.id === subjectId);
  const subjectName = subject?.name || '该科';
  const weak = await prisma.knowledgePoint.findMany({
    where: {
      mastery: { lt: 50 },
      ...(subjectId ? { chapter: { subjectId } } : {})
    },
    take: 3,
    orderBy: { mastery: 'asc' }
  });
  const weakNames = weak.map((k) => `${k.name}`).join('、');
  if (accuracy >= 80) {
    return `本组${subjectName}练习正确率 ${Math.round(accuracy)}%，表现很棒！${weakNames ? `接下来可以挑战更高难度的题目巩固：${weakNames}。` : '继续保持，可以尝试全真模考检验综合水平。'}`;
  }
  if (accuracy >= 50) {
    return `本组${subjectName}练习正确率 ${Math.round(accuracy)}%（答对 ${correctCount}/${totalCount} 题）。薄弱考点：${weakNames || '暂无'}。建议针对薄弱考点做专项练习，先回顾知识点再刷题。`;
  }
  return `本组${subjectName}练习正确率偏低（${Math.round(accuracy)}%）。别灰心，建议先回到「学习」页复习以下薄弱考点：${weakNames || '本组涉及考点'}，再回来巩固练习。错题已自动收录到错题本。`;
}

// 智能组卷（薄弱考点加权）
export const generateExercisePaper = async (req, res) => {
  try {
    const { userId, subjectId, count = 10, difficulty, knowledgeIds } = req.body;
    const questions = await generatePaper({ userId, subjectId, count, difficulty, knowledgeIds });
    res.json({ data: { questions } });
  } catch (error) {
    res.status(500).json({ error: { message: error.message, status: 500 } });
  }
};

// 创建练习记录
export const createExercise = async (req, res) => {
  try {
    const { userId, subjectId, questions } = req.body;

    // 预计算判分结果（前端已判分，服务端据此统计）
    const correctCount = questions.filter(q => q.isCorrect).length;
    const accuracy = questions.length > 0 ? (correctCount / questions.length) * 100 : 0;

    // 创建练习记录
    const exercise = await prisma.exerciseRecord.create({
      data: {
        userId,
        subjectId,
        startTime: new Date(),
        endTime: new Date(),
        totalQuestions: questions.length,
        correctCount,
        wrongCount: questions.length - correctCount,
        accuracy,
        status: 'completed',
        exerciseQuestions: {
          create: questions.map(q => ({
            questionId: q.id,
            userAnswer: q.userAnswer,
            isCorrect: q.isCorrect,
            wrongReason: q.wrongReason,
            timeSpent: q.timeSpent
          }))
        }
      },
      include: {
        exerciseQuestions: {
          include: {
            question: {
              include: {
                questionKnowledge: {
                  include: {
                    knowledgePoint: true
                  }
                }
              }
            }
          }
        }
      }
    });

    // 更新练习记录（刷新最终统计）
    const updatedExercise = await prisma.exerciseRecord.update({
      where: { id: exercise.id },
      data: {
        correctCount,
        wrongCount: questions.length - correctCount,
        accuracy,
        status: 'completed'
      }
    });

    // 更新错题本
    for (const eq of exercise.exerciseQuestions) {
      if (!eq.isCorrect) {
        const existingWrong = await prisma.wrongQuestion.findUnique({
          where: {
            userId_questionId: {
              userId,
              questionId: eq.questionId
            }
          }
        });

        if (existingWrong) {
          await prisma.wrongQuestion.update({
            where: { id: existingWrong.id },
            data: {
              wrongCount: existingWrong.wrongCount + 1,
              lastWrongAt: new Date(),
              mastered: false
            }
          });
        } else {
          await prisma.wrongQuestion.create({
            data: {
              userId,
              questionId: eq.questionId,
              wrongCount: 1,
              lastWrongAt: new Date()
            }
          });
        }
      }
    }

    // 更新知识点掌握度
    await updateKnowledgeMastery(userId, exercise.exerciseQuestions);

    // 生成 AI 小结
    const aiSummary = await buildAiSummary(userId, subjectId, accuracy, correctCount, questions.length);
    const withSummary = await prisma.exerciseRecord.update({
      where: { id: exercise.id },
      data: { aiSummary }
    });

    // 成就判定 + 掌握度快照
    const newAchievements = await checkAndUnlockAchievements(userId).catch(() => []);
    recordMasterySnapshot(userId).catch(() => {});

    res.json({ data: withSummary, newAchievements });
  } catch (error) {
    res.status(500).json({ error: { message: error.message, status: 500 } });
  }
};

// 获取练习历史
export const getExercises = async (req, res) => {
  try {
    const { userId, subjectId, limit = 10 } = req.query;

    const where = {};
    if (userId) where.userId = userId;
    if (subjectId) where.subjectId = subjectId;

    const exercises = await prisma.exerciseRecord.findMany({
      where,
      include: {
        subject: true,
        exerciseQuestions: {
          take: 5,
          include: {
            question: true
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: parseInt(limit)
    });

    res.json({ data: exercises });
  } catch (error) {
    res.status(500).json({ error: { message: error.message, status: 500 } });
  }
};

// 获取练习详情
export const getExerciseById = async (req, res) => {
  try {
    const { id } = req.params;

    const exercise = await prisma.exerciseRecord.findUnique({
      where: { id },
      include: {
        subject: true,
        exerciseQuestions: {
          include: {
            question: {
              include: {
                questionKnowledge: {
                  include: {
                    knowledgePoint: true
                  }
                }
              }
            }
          }
        }
      }
    });

    if (!exercise) {
      return res.status(404).json({ error: { message: '练习记录不存在', status: 404 } });
    }

    res.json({ data: exercise });
  } catch (error) {
    res.status(500).json({ error: { message: error.message, status: 500 } });
  }
};

// 更新知识点掌握度
async function updateKnowledgeMastery(userId, exerciseQuestions) {
  const knowledgeStats = {};

  // 统计每个知识点的正确率
  for (const eq of exerciseQuestions) {
    const knowledgePoints = eq.question.questionKnowledge.map(qk => qk.knowledgePoint);
    for (const kp of knowledgePoints) {
      if (!knowledgeStats[kp.id]) {
        knowledgeStats[kp.id] = { total: 0, correct: 0 };
      }
      knowledgeStats[kp.id].total++;
      if (eq.isCorrect) knowledgeStats[kp.id].correct++;
    }
  }

  // 更新掌握度
  for (const [knowledgePointId, stats] of Object.entries(knowledgeStats)) {
    const accuracy = (stats.correct / stats.total) * 100;
    const currentKp = await prisma.knowledgePoint.findUnique({
      where: { id: knowledgePointId }
    });

    let newMastery = currentKp.mastery;
    let newStatus = currentKp.status;

    if (accuracy >= 80 && stats.total >= 5) {
      newStatus = 'mastered';
      newMastery = Math.min(100, currentKp.mastery + 10);
    } else if (accuracy < 40) {
      newStatus = 'learning';
      newMastery = Math.max(0, currentKp.mastery - 10);
    } else {
      newStatus = 'learning';
      newMastery = Math.min(100, Math.max(0, currentKp.mastery + (accuracy - 50) / 10));
    }

    await prisma.knowledgePoint.update({
      where: { id: knowledgePointId },
      data: {
        mastery: Math.round(newMastery),
        status: newStatus
      }
    });
  }
}