import prisma from '../utils/prisma.js';
import { checkAndUnlockAchievements } from '../services/achievement.service.js';

// 每天首次访问时按薄弱考点生成当日任务（懒生成）
async function ensureTodayTasks(userId, date) {
  const existing = await prisma.studyTask.findMany({ where: { userId, dueDate: date } });
  if (existing.length > 0) return existing;

  // 找薄弱考点：各科掌握度最低的考点
  const weak = await prisma.knowledgePoint.findMany({
    where: {
      level: 2,
      mastery: { lt: 60 }
    },
    orderBy: { mastery: 'asc' },
    take: 6,
    include: { chapter: { include: { subject: true } } }
  });

  const mathPoint = weak.find((k) => k.chapter.subject.code === 'M') || weak[0];
  const subjectName = (kp) => (kp?.chapter?.subject?.name || '数学');

  const tasks = [];
  // 1. 薄弱考点专项练习
  if (mathPoint) {
    tasks.push({
      userId,
      type: 'exercise',
      title: `完成${subjectName(mathPoint)}「${mathPoint.name}」专项练习`,
      description: `薄弱考点强化：${mathPoint.code} ${mathPoint.name}（当前掌握度 ${Math.round(mathPoint.mastery)}%）`,
      targetCount: 10,
      dueDate: date
    });
  }
  // 2. 错题复习
  const pendingWrong = await prisma.wrongQuestion.count({
    where: { userId, mastered: false }
  });
  if (pendingWrong > 0) {
    tasks.push({
      userId,
      type: 'review',
      title: `复习错题本 ${Math.min(pendingWrong, 5)} 题`,
      description: `当前有 ${pendingWrong} 道未消化错题，连对 2 次即可消化`,
      targetCount: Math.min(pendingWrong, 5),
      dueDate: date
    });
  }
  // 3. 背诵打卡
  tasks.push({
    userId,
    type: 'recitation',
    title: '完成今日背诵打卡',
    description: '坚持艾宾浩斯记忆法，按计划背诵或复习',
    targetCount: 1,
    dueDate: date
  });

  await prisma.studyTask.createMany({ data: tasks });
  return prisma.studyTask.findMany({ where: { userId, dueDate: date } });
}

// 获取每日任务（无当日任务时自动生成）
export const getStudyTasks = async (req, res) => {
  try {
    const { userId, date } = req.query;
    if (!userId) return res.json({ data: [] });

    const today = date ? new Date(date) : new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const tasks = await ensureTodayTasks(userId, today);

    const filtered = tasks.filter((t) => t.dueDate >= today && t.dueDate < tomorrow);
    res.json({ data: filtered });
  } catch (error) {
    res.status(500).json({ error: { message: error.message, status: 500 } });
  }
};

// 创建学习任务
export const createStudyTask = async (req, res) => {
  try {
    const { userId, type, targetId, title, description, targetCount, dueDate } = req.body;

    const task = await prisma.studyTask.create({
      data: {
        userId,
        type,
        targetId,
        title,
        description,
        targetCount,
        dueDate: new Date(dueDate)
      }
    });

    res.json({ data: task });
  } catch (error) {
    res.status(500).json({ error: { message: error.message, status: 500 } });
  }
};

// 完成任务打卡
export const completeStudyTask = async (req, res) => {
  try {
    const { id } = req.params;

    const task = await prisma.studyTask.update({
      where: { id },
      data: {
        completed: true,
        completedAt: new Date()
      }
    });

    const newAchievements = await checkAndUnlockAchievements(task.userId).catch(() => []);

    res.json({ data: task, newAchievements });
  } catch (error) {
    res.status(500).json({ error: { message: error.message, status: 500 } });
  }
};