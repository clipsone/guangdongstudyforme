import prisma from '../utils/prisma.js';

// ISO 周数（周一为一周开始）
function weekNumber(date = new Date()) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
}

// 生成本周学习报告
export const generateWeeklyReport = async (req, res) => {
  try {
    const userId = req.userId;
    if (!userId) return res.status(400).json({ error: { message: '缺少 userId', status: 400 } });

    const now = new Date();
    const weekStart = new Date(now);
    weekStart.setDate(weekStart.getDate() - 7);

    const [exercises, sessions, wrongTotal, exams] = await Promise.all([
      prisma.exerciseRecord.findMany({
        where: { userId, createdAt: { gte: weekStart } },
        select: { accuracy: true, totalQuestions: true }
      }),
      prisma.studySession.findMany({
        where: { userId, startedAt: { gte: weekStart } },
        select: { duration: true }
      }),
      prisma.wrongQuestion.count({ where: { userId, mastered: false } }),
      prisma.exam.findMany({
        where: { userId, status: 'completed', createdAt: { gte: weekStart } },
        select: { score: true, template: { select: { totalScore: true, subject: true } } }
      })
    ]);

    const totalTime = sessions.reduce((s, x) => s + x.duration, 0);
    const exerciseCount = exercises.reduce((s, x) => s + x.totalQuestions, 0);
    const accuracy = exercises.length > 0
      ? Math.round(exercises.reduce((s, x) => s + x.accuracy, 0) / exercises.length)
      : 0;

    // 本周薄弱考点
    const weak = await prisma.knowledgePoint.findMany({
      where: { level: 2, mastery: { lt: 60 } },
      orderBy: { mastery: 'asc' },
      take: 3,
      select: { name: true, mastery: true, chapter: { select: { subject: { select: { name: true } } } } }
    });

    const highlights = [];
    if (exercises.length > 0) highlights.push(`本周完成 ${exercises.length} 组练习（共 ${exerciseCount} 题），平均正确率 ${accuracy}%`);
    if (exams.length > 0) {
      const avg = Math.round(exams.reduce((s, x) => s + (x.score || 0) / (x.template?.totalScore || 100) * 100, 0) / exams.length);
      highlights.push(`完成 ${exams.length} 次全真模考，平均得分率 ${avg}%`);
    }
    if (totalTime > 0) highlights.push(`累计学习 ${Math.round(totalTime / 60)} 分钟`);
    if (weak.length > 0) highlights.push(`本周薄弱考点：${weak.map((w) => `${w.chapter.subject.name}·${w.name}`).join('、')}`);
    if (highlights.length === 0) highlights.push('本周暂无学习记录，加油开始吧！');

    const suggestions = [
      weak[0] ? `优先复习「${weak[0].chapter.subject.name}·${weak[0].name}」` : '各科掌握度均衡，保持节奏',
      wrongTotal > 0 ? `错题本还有 ${wrongTotal} 道未消化，建议每天清理` : '错题已清零，继续保持',
      '坚持每日任务 + 每周一次全真模考，形成稳定学习循环'
    ];

    const report = await prisma.weeklyReport.create({
      data: {
        userId,
        weekNumber: weekNumber(now),
        year: now.getFullYear(),
        totalTime,
        exerciseCount,
        accuracy,
        highlights,
        improvements: suggestions
      }
    });

    res.json({ data: report });
  } catch (error) {
    res.status(500).json({ error: { message: error.message, status: 500 } });
  }
};

// 获取最新周报
export const getWeeklyReports = async (req, res) => {
  try {
    const userId = req.userId;
    if (!userId) return res.json({ data: [] });

    const reports = await prisma.weeklyReport.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 12
    });
    res.json({ data: reports });
  } catch (error) {
    res.status(500).json({ error: { message: error.message, status: 500 } });
  }
};
