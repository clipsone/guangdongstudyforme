import prisma from '../utils/prisma.js';

// 成就判定规则（condition.type 与 service 中一致）
const RULES = {
  first_exercise: async (userId) => (await prisma.exerciseRecord.count({ where: { userId } })) >= 1,
  exercise_10: async (userId) => (await prisma.exerciseRecord.count({ where: { userId } })) >= 10,
  questions_100: async (userId) => {
    const aggr = await prisma.exerciseQuestion.aggregate({
      where: { exercise: { userId }, isCorrect: true },
      _count: { id: true }
    });
    return aggr._count.id >= 100;
  },
  wrong_mastered: async (userId) => {
    const [pending, total] = await Promise.all([
      prisma.wrongQuestion.count({ where: { userId, mastered: false } }),
      prisma.wrongQuestion.count({ where: { userId } })
    ]);
    return total > 0 && pending === 0;
  },
  recitation_first: async (userId) => (await prisma.recitationRecord.count({ where: { userId } })) >= 1,
  recitation_10: async (userId) => (await prisma.recitationRecord.count({ where: { userId } })) >= 10,
  task_first: async (userId) => (await prisma.studyTask.count({ where: { userId, completed: true } })) >= 1,
  exam_first: async (userId) => (await prisma.exam.count({ where: { userId, status: 'completed' } })) >= 1,
  subject_mastered: async () => {
    const subjects = await prisma.subject.findMany();
    for (const subject of subjects) {
      const points = await prisma.knowledgePoint.findMany({
        where: { chapter: { subjectId: subject.id } },
        select: { mastery: true }
      });
      if (points.length === 0) continue;
      const avg = points.reduce((s, p) => s + p.mastery, 0) / points.length;
      if (avg >= 80) return true;
    }
    return false;
  },
};

/**
 * 检查并解锁成就，返回本次新解锁的成就列表
 */
export async function checkAndUnlockAchievements(userId) {
  const all = await prisma.achievement.findMany();
  const unlocked = await prisma.userAchievement.findMany({
    where: { userId },
    select: { achievementId: true }
  });
  const unlockedIds = new Set(unlocked.map((u) => u.achievementId));

  const newlyUnlocked = [];
  for (const achievement of all) {
    if (unlockedIds.has(achievement.id)) continue;
    const condition = achievement.condition || {};
    const checker = RULES[condition.type];
    if (!checker) continue;
    try {
      const passed = await checker(userId);
      if (passed) {
        await prisma.userAchievement.create({
          data: { userId, achievementId: achievement.id }
        });
        newlyUnlocked.push(achievement);
      }
    } catch (e) {
      console.error('成就判定失败:', achievement.name, e.message);
    }
  }
  return newlyUnlocked;
}
