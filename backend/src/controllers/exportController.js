import prisma from '../utils/prisma.js';

// 导出全部学习数据（JSON 备份）
export const exportData = async (req, res) => {
  try {
    const userId = req.userId;
    if (!userId) {
      return res.status(400).json({ error: { message: '缺少 userId', status: 400 } });
    }

    const [exercises, wrongQuestions, recitations, exams, tasks, achievements] = await Promise.all([
      prisma.exerciseRecord.findMany({
        where: { userId },
        include: {
          subject: { select: { name: true } },
          exerciseQuestions: {
            include: { question: { select: { stem: true, answer: true, type: true } } }
          }
        },
        orderBy: { createdAt: 'desc' },
        take: 500
      }),
      prisma.wrongQuestion.findMany({
        where: { userId },
        include: { question: { select: { stem: true, answer: true, type: true } } }
      }),
      prisma.recitationRecord.findMany({ where: { userId }, orderBy: { updatedAt: 'desc' } }),
      prisma.exam.findMany({
        where: { userId },
        include: { template: { include: { subject: true } } },
        orderBy: { createdAt: 'desc' }
      }),
      prisma.studyTask.findMany({ where: { userId }, orderBy: { dueDate: 'desc' } }),
      prisma.userAchievement.findMany({
        where: { userId },
        include: { achievement: true }
      })
    ]);

    res.json({
      data: {
        exportedAt: new Date().toISOString(),
        user: { userId },
        summary: {
          exercises: exercises.length,
          wrongQuestions: wrongQuestions.length,
          recitations: recitations.length,
          exams: exams.length,
          tasks: tasks.length,
          achievements: achievements.length
        },
        exercises,
        wrongQuestions,
        recitations,
        exams,
        tasks,
        achievements
      }
    });
  } catch (error) {
    res.status(500).json({ error: { message: error.message, status: 500 } });
  }
};
