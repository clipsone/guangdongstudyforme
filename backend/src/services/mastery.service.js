import prisma from '../utils/prisma.js';

// ISO 周数
function weekNumber(date = new Date()) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
}

// 记录当前各科平均掌握度快照（每周每科最多一条）
export async function recordMasterySnapshot(userId) {
  const subjects = await prisma.subject.findMany();
  const week = weekNumber();
  const year = new Date().getFullYear();

  for (const subject of subjects) {
    const exists = await prisma.masterySnapshot.findFirst({
      where: { userId, subjectId: subject.id, weekNumber: week, recordedAt: { gte: new Date(`${year}-01-01`) } }
    });
    if (exists) continue;

    const points = await prisma.knowledgePoint.findMany({
      where: { chapter: { subjectId: subject.id } },
      select: { mastery: true }
    });
    const avg = points.length > 0
      ? Math.round(points.reduce((s, p) => s + p.mastery, 0) / points.length)
      : 0;

    await prisma.masterySnapshot.create({
      data: {
        userId,
        subjectId: subject.id,
        mastery: avg,
        weekNumber: week
      }
    });
  }
}
