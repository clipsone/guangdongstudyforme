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

    const avg = await subjectMasteryFor(userId, subject.id);

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

// ===== 按用户掌握度（KnowledgeMastery）=====

// 取某用户全部考点掌握度 Map<knowledgePointId, mastery>（无记录=0）
export async function getUserMasteryMap(userId) {
  if (!userId) return new Map();
  const rows = await prisma.knowledgeMastery.findMany({
    where: { userId },
    select: { knowledgePointId: true, mastery: true },
  });
  return new Map(rows.map((r) => [r.knowledgePointId, r.mastery]));
}

// 写入/更新某用户某考点掌握度
export async function upsertUserMastery(userId, knowledgePointId, mastery) {
  const value = Number.isFinite(Number(mastery))
    ? Math.max(0, Math.min(100, Math.round(Number(mastery))))
    : 0;
  return prisma.knowledgeMastery.upsert({
    where: { userId_knowledgePointId: { userId, knowledgePointId } },
    create: { userId, knowledgePointId, mastery: value },
    update: { mastery: value },
  });
}

// 算某用户某科目平均掌握度（无记录=0）
export async function subjectMasteryFor(userId, subjectId) {
  const map = await getUserMasteryMap(userId);
  const points = await prisma.knowledgePoint.findMany({
    where: { chapter: { subjectId } },
    select: { id: true },
  });
  if (points.length === 0) return 0;
  const sum = points.reduce((s, p) => s + (map.get(p.id) || 0), 0);
  return Math.round(sum / points.length);
}
