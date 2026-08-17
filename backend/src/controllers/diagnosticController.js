import prisma from '../utils/prisma.js';

// 计算某科的学习诊断
async function buildDiagnosis(userId, subject) {
  const [points, exercises, exams, wrongCount, recitations] = await Promise.all([
    prisma.knowledgePoint.findMany({
      where: { chapter: { subjectId: subject.id } },
      orderBy: { mastery: 'asc' }
    }),
    prisma.exerciseRecord.findMany({
      where: { userId, subjectId: subject.id },
      select: { accuracy: true, totalQuestions: true, correctCount: true }
    }),
    prisma.exam.findMany({
      where: { userId, status: 'completed', template: { subjectId: subject.id } },
      select: { score: true, template: { select: { totalScore: true } } }
    }),
    prisma.wrongQuestion.count({ where: { userId, mastered: false, question: { subjectId: subject.id } } }),
    prisma.recitationItem.count({ where: { subjectId: subject.id } })
  ]);

  const exerciseCount = exercises.length;
  const exerciseAccuracy = exerciseCount > 0
    ? exercises.reduce((s, x) => s + x.accuracy, 0) / exerciseCount
    : 0;
  const examAvg = exams.length > 0
    ? exams.reduce((s, x) => s + (x.score || 0) / (x.template?.totalScore || 100) * 100, 0) / exams.length
    : 0;
  const avgMastery = points.length > 0
    ? points.reduce((s, p) => s + p.mastery, 0) / points.length
    : 0;

  const weak = points.slice(0, 5).map((p) => ({ code: p.code, name: p.name, mastery: p.mastery }));
  const strong = [...points].sort((a, b) => b.mastery - a.mastery).slice(0, 3)
    .map((p) => ({ code: p.code, name: p.name, mastery: p.mastery }));

  // 总评
  const overall = [];
  if (exerciseCount === 0 && exams.length === 0) {
    overall.push('尚未开始该科练习，建议先做一组专项练习建立基础数据。');
  } else {
    if (avgMastery < 40) overall.push('整体掌握度偏低，建议从章节层级系统过一遍知识图谱。');
    else if (avgMastery < 70) overall.push('掌握度中等，重点是查漏补缺，针对薄弱考点做专项练习。');
    else overall.push('掌握度良好，可以进入综合卷和模考检验阶段。');

    if (examAvg > 0 && examAvg < 60) overall.push('模考成绩偏低，建议优先补齐薄弱考点后再回归模考。');
    if (exerciseAccuracy >= 80) overall.push('专项练习正确率高，保持节奏，增加题量冲刺。');
    else if (exerciseAccuracy > 0 && exerciseAccuracy < 50) overall.push('专项练习正确率偏低，注意先复习知识点再刷题。');
    if (wrongCount > 10) overall.push(`未消化错题 ${wrongCount} 道，建议每天安排错题重练。`);
  }

  const suggestions = [
    weak[0] ? `优先攻克「${weak[0].name}」（掌握度 ${Math.round(weak[0].mastery)}%）` : '保持当前节奏',
    wrongCount > 0 ? `每天重练 ${Math.min(wrongCount, 5)} 道错题，连对 2 次消化` : '错题已清零，继续保持',
    `建议每周完成 1 次${subject.name}全真模考检验综合水平`
  ];

  return {
    subjectId: subject.id,
    subjectName: subject.name,
    summary: overall.join(''),
    metrics: {
      exerciseCount,
      exerciseAccuracy: Math.round(exerciseAccuracy),
      examCount: exams.length,
      examAvgAccuracy: exams.length ? Math.round(examAvg) : null,
      avgMastery: Math.round(avgMastery),
      pendingWrong: wrongCount,
      recitationItems: recitations
    },
    weak,
    strong,
    suggestions
  };
}

// 生成学习诊断（缺省对全部科目生成）
export const generateDiagnostic = async (req, res) => {
  try {
    const { subjectId } = req.body;
    const userId = req.userId;
    if (!userId) return res.status(400).json({ error: { message: '缺少 userId', status: 400 } });

    const subjects = subjectId
      ? await prisma.subject.findMany({ where: { id: subjectId } })
      : await prisma.subject.findMany();

    const results = [];
    for (const subject of subjects) {
      const diagnosis = await buildDiagnosis(userId, subject);
      const record = await prisma.diagnosticRecord.create({
        data: {
          userId,
          subjectId: subject.id,
          diagnosis: {
            summary: diagnosis.summary,
            metrics: diagnosis.metrics,
            weak: diagnosis.weak,
            strong: diagnosis.strong
          },
          suggestions: diagnosis.suggestions
        }
      });
      results.push({ id: record.id, subjectId: subject.id, subjectName: subject.name, diagnosis: record.diagnosis, suggestions: record.suggestions, createdAt: record.createdAt });
    }

    res.json({ data: results });
  } catch (error) {
    res.status(500).json({ error: { message: error.message, status: 500 } });
  }
};

// 获取历史诊断（每科最新一条）
export const getDiagnostics = async (req, res) => {
  try {
    const userId = req.userId;
    if (!userId) return res.json({ data: [] });

    const records = await prisma.diagnosticRecord.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 30
    });

    const map = new Map();
    for (const r of records) {
      if (!map.has(r.subjectId)) map.set(r.subjectId, r);
    }
    const subjectName = {};
    for (const s of await prisma.subject.findMany()) subjectName[s.id] = s.name;

    const data = [...map.values()].map((r) => ({
      id: r.id,
      subjectId: r.subjectId,
      subjectName: subjectName[r.subjectId] || '未知',
      diagnosis: r.diagnosis,
      suggestions: r.suggestions,
      createdAt: r.createdAt
    }));
    res.json({ data });
  } catch (error) {
    res.status(500).json({ error: { message: error.message, status: 500 } });
  }
};
