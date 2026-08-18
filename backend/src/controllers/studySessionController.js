import prisma from '../utils/prisma.js';

// 记录一段学习时长（练习/模考结束时调用）
export const createStudySession = async (req, res) => {
  try {
    const { subjectId, duration, taskId } = req.body;
    const userId = req.userId;
    const seconds = Math.max(0, Math.round(Number(duration) || 0));

    const endedAt = new Date();
    const startedAt = new Date(endedAt.getTime() - seconds * 1000);

    const session = await prisma.studySession.create({
      data: {
        userId,
        subjectId,
        taskId: taskId || null,
        duration: seconds,
        startedAt,
        endedAt
      }
    });

    res.json({ data: session });
  } catch (error) {
        console.error('[API错误]', error?.message || error);
        res.status(500).json({ error: { message: '服务器内部错误', status: 500 } });
  }
};

// 查询学习时长（可带 days 参数聚合今日/近 N 天）
export const getStudySessions = async (req, res) => {
  try {
    const { days } = req.query;
    const userId = req.userId;
    if (!userId) return res.json({ data: { totalSeconds: 0, sessions: [] } });

    const where = { userId };
    if (days) {
      const start = new Date();
      start.setDate(start.getDate() - Number(days));
      where.startedAt = { gte: start };
    }

    const sessions = await prisma.studySession.findMany({
      where,
      orderBy: { startedAt: 'desc' },
      take: 100
    });
    const totalSeconds = sessions.reduce((s, x) => s + x.duration, 0);

    res.json({ data: { totalSeconds, sessions } });
  } catch (error) {
        console.error('[API错误]', error?.message || error);
        res.status(500).json({ error: { message: '服务器内部错误', status: 500 } });
  }
};
