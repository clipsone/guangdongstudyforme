import prisma from '../utils/prisma.js';

// 获取成就列表（含当前用户解锁状态）
export const getAchievements = async (req, res) => {
  try {
    const { userId } = req.query;

    const [all, unlocked] = await Promise.all([
      prisma.achievement.findMany({ orderBy: { createdAt: 'asc' } }),
      userId
        ? prisma.userAchievement.findMany({ where: { userId } })
        : Promise.resolve([])
    ]);
    const unlockedMap = new Map(unlocked.map((u) => [u.achievementId, u.unlockedAt]));

    const list = all.map((a) => ({
      id: a.id,
      name: a.name,
      description: a.description,
      icon: a.icon,
      unlocked: unlockedMap.has(a.id),
      unlockedAt: unlockedMap.get(a.id) || null
    }));

    res.json({ data: list });
  } catch (error) {
    res.status(500).json({ error: { message: error.message, status: 500 } });
  }
};
