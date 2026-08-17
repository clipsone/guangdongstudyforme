import prisma from '../utils/prisma.js';

// 智能组卷：按薄弱考点加权抽取题目
// 权重设计：掌握度越低权重越高，未做过的考点视为薄弱
function weightOf(kp) {
  const mastery = kp.mastery || 0;
  if (mastery < 30) return 5;      // 严重薄弱
  if (mastery < 50) return 3.5;    // 薄弱
  if (mastery < 80) return 1.5;    // 一般
  return 0.4;                       // 已掌握，少量覆盖
}

/**
 * 生成一份练习卷
 * @param {object} opts { userId, subjectId, count, difficulty?, knowledgeIds? }
 * @returns {Promise<Array>} 题目数组
 */
export async function generatePaper({ userId, subjectId, count = 10, difficulty, knowledgeIds = [] }) {
  const where = { status: 'active' };
  if (subjectId) where.subjectId = subjectId;

  // 该用户已做过的题（练习+模考），优先排除以降低重复率
  const [doneEx, doneExam] = await Promise.all([
    prisma.exerciseQuestion.findMany({ where: { exercise: { userId } }, select: { questionId: true } }),
    prisma.examQuestion.findMany({ where: { exam: { userId } }, select: { questionId: true } }),
  ]);
  const doneIds = new Set([...doneEx.map((r) => r.questionId), ...doneExam.map((r) => r.questionId)]);
  const freshOnly = (list) => {
    const fresh = list.filter((q) => !doneIds.has(q.id));
    // 未做过的题不足时允许复用（保证出满题量）
    return fresh.length > 0 ? fresh : list;
  };

  // 1. 目标知识点池
  let targetPoints = [];
  if (knowledgeIds && knowledgeIds.length > 0) {
    targetPoints = await prisma.knowledgePoint.findMany({
      where: { id: { in: knowledgeIds } },
      select: { id: true, mastery: true }
    });
  } else {
    // 智能模式：取该科目全部考点按权重排序
    targetPoints = await prisma.knowledgePoint.findMany({
      where: subjectId ? { chapter: { subjectId } } : {},
      select: { id: true, mastery: true }
    });
  }

  if (targetPoints.length === 0) {
    // 无考点数据时退化为随机抽题
    const fallback = await prisma.question.findMany({
      where,
      take: count * 3,
      include: {
        subject: true,
        questionKnowledge: { include: { knowledgePoint: true } }
      }
    });
    return freshOnly(fallback).slice(0, count);
  }

  // 2. 按考点权重随机抽样（加权不放回）
  const weightedIds = [];
  for (const kp of targetPoints) {
    const w = Math.round(weightOf(kp) * 10);
    for (let i = 0; i < w; i++) weightedIds.push(kp.id);
  }
  // 打乱权重池，取前 N 个不同考点
  for (let i = weightedIds.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [weightedIds[i], weightedIds[j]] = [weightedIds[j], weightedIds[i]];
  }
  const pickedPointIds = Array.from(new Set(weightedIds)).slice(0, Math.max(6, Math.min(count * 2, weightedIds.length)));

  // 3. 抽取这些考点下的题目
  const questionKnowledge = await prisma.questionKnowledge.findMany({
    where: { knowledgePointId: { in: pickedPointIds } },
    select: { questionId: true, knowledgePointId: true }
  });

  // 每题命中考点数 → 分值权重（覆盖多个薄弱考点优先）
  const hitCount = {};
  for (const qk of questionKnowledge) {
    hitCount[qk.questionId] = (hitCount[qk.questionId] || 0) + 1;
  }
  const questionIds = Object.keys(hitCount);
  if (questionIds.length === 0) {
    const fallback = await prisma.question.findMany({
      where,
      take: count * 3,
      include: {
        subject: true,
        questionKnowledge: { include: { knowledgePoint: true } }
      }
    });
    return freshOnly(fallback).slice(0, count);
  }

  let questions = await prisma.question.findMany({
    where: {
      ...where,
      id: { in: questionIds }
    },
    include: {
      subject: true,
      questionKnowledge: { include: { knowledgePoint: true } }
    }
  });

  // 难度过滤
  if (difficulty) {
    const parts = String(difficulty).split('-').map(Number);
    if (parts.length === 2) {
      const [lo, hi] = parts;
      questions = questions.filter((q) => q.difficulty >= lo && q.difficulty <= hi);
    } else {
      questions = questions.filter((q) => q.difficulty === parts[0]);
    }
  }

  // 优先未做过的题（降低重复率）；未做不足时允许复用已做
  const freshQs = questions.filter((q) => !doneIds.has(q.id));
  if (freshQs.length > 0) questions = freshQs;

  // 加权随机排序：命中考点越多越靠前
  questions.sort((a, b) => (hitCount[b.id] || 0) - (hitCount[a.id] || 0));
  const picked = [];
  const used = new Set();
  // 前一半从高权重取，其余打乱补足
  for (const q of questions) {
    if (picked.length >= count) break;
    if (!used.has(q.id)) {
      picked.push(q);
      used.add(q.id);
    }
  }
  const rest = questions.filter((q) => !used.has(q.id)).sort(() => Math.random() - 0.5);
  while (picked.length < count && rest.length > 0) {
    picked.push(rest.shift());
  }

  return picked;
}
