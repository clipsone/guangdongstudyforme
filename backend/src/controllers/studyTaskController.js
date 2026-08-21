import prisma from '../utils/prisma.js';
import { getUserMasteryMap } from '../services/mastery.service.js';
import { checkAndUnlockAchievements } from '../services/achievement.service.js';

// 每天首次访问时按薄弱考点生成当日任务（懒生成）
async function ensureTodayTasks(userId, date) {
  const existing = await prisma.studyTask.findMany({ where: { userId, dueDate: date } });
  if (existing.length > 0) return existing;

  // 找薄弱考点：各科掌握度最低的考点（按用户掌握度）
  const masteryMap = await getUserMasteryMap(userId);
  const allPoints = await prisma.knowledgePoint.findMany({
    where: { level: 2 },
    include: { chapter: { include: { subject: true } } }
  });
  const weak = allPoints
    .map((p) => ({ ...p, mastery: masteryMap.get(p.id) || 0 }))
    .filter((p) => p.mastery < 60)
    .sort((a, b) => a.mastery - b.mastery)
    .slice(0, 6);

  const mathPoint = weak.find((k) => k.chapter.subject.code === 'M') || weak[0];
  const chinesePoint = weak.find((k) => k.chapter.subject.code === 'Y');
  const englishPoint = weak.find((k) => k.chapter.subject.code === 'E');
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
  // 2. 语文微任务：不要求整篇死背，先做识别、翻译和句式小练习
  if (chinesePoint) {
    tasks.push({
      userId,
      type: 'knowledge',
      targetId: chinesePoint.id,
      title: `语文 5 分钟：${chinesePoint.name}`,
      description: '完成 3 个古诗文/文言文小题：词义、翻译或修辞辨析',
      targetCount: 3,
      dueDate: date
    });
  }
  // 3. 英语微任务：通过短题练语法和上下文，不一次背整章
  if (englishPoint) {
    tasks.push({
      userId,
      type: 'knowledge',
      targetId: englishPoint.id,
      title: `英语 5 分钟：${englishPoint.name}`,
      description: '完成 5 道语态/时态/完形线索小题，并复习 3 个错题',
      targetCount: 5,
      dueDate: date
    });
  }
  // 4. 错题复习
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
  // 5. 背诵打卡
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
    const { date } = req.query;
    const userId = req.userId;
    if (!userId) return res.json({ data: [] });

    const today = date ? new Date(date) : new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const tasks = await ensureTodayTasks(userId, today);

    const filtered = tasks.filter((t) => t.dueDate >= today && t.dueDate < tomorrow);
    res.json({ data: filtered });
  } catch (error) {
        console.error('[API错误]', error?.message || error);
        res.status(500).json({ error: { message: '服务器内部错误', status: 500 } });
  }
};

// 创建学习任务
export const createStudyTask = async (req, res) => {
  try {
    const { type, targetId, title, description, targetCount, dueDate } = req.body;
    const userId = req.userId;

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
        console.error('[API错误]', error?.message || error);
        res.status(500).json({ error: { message: '服务器内部错误', status: 500 } });
  }
};

// 完成任务打卡
export const completeStudyTask = async (req, res) => {
  try {
    const { id } = req.params;

    const task = await prisma.studyTask.update({
      where: { id, userId: req.userId },
      data: {
        completed: true,
        completedAt: new Date()
      }
    });
    if (!task) return res.status(404).json({ error: { message: '任务不存在', status: 404 } });

    const newAchievements = await checkAndUnlockAchievements(task.userId).catch(() => []);

    res.json({ data: task, newAchievements });
  } catch (error) {
        console.error('[API错误]', error?.message || error);
        res.status(500).json({ error: { message: '服务器内部错误', status: 500 } });
  }
};