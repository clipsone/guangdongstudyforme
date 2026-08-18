import prisma from '../utils/prisma.js';
import { checkAndUnlockAchievements } from '../services/achievement.service.js';
import { recordMasterySnapshot } from '../services/mastery.service.js';

// 判分：选择题精确比对字母；其他题型归一化（去空白/标点）比对
function gradeQuestion(question, userAnswer) {
  const ua = String(userAnswer || '').trim().toLowerCase();
  const ans = String(question.answer || '').trim().toLowerCase();
  if (!ua) return false;
  if (question.type === 'choice') return ua === ans;
  const norm = (s) => s.replace(/[\s，。、；：,.!?；'"“”]/g, '');
  return norm(ua) === norm(ans);
}

// 获取模考模板列表
export const getExamTemplates = async (req, res) => {
  try {
    const templates = await prisma.examTemplate.findMany({
      include: { subject: true },
      orderBy: { createdAt: 'asc' }
    });

    // 计算每个模板的题库覆盖率（各分区可用题目数 vs 需要数）
    const enriched = [];
    for (const t of templates) {
      const sections = (t.config && t.config.sections) || [];
      const sectionNames = sections.map((s) => s.name).filter(Boolean);
      let counts = [];
      if (sectionNames.length > 0) {
        const groups = await prisma.question.groupBy({
          by: ['section'],
          where: { subjectId: t.subjectId, section: { in: sectionNames }, status: 'active' },
          _count: { _all: true },
        });
        const map = new Map(groups.map((g) => [g.section, g._count._all]));
        counts = sections.map((s) => ({
          name: s.name,
          type: s.type,
          need: s.count,
          available: s.name ? map.get(s.name) || 0 : null,
        }));
      }
      enriched.push({ ...t, coverage: counts });
    }
    res.json({ data: enriched });
  } catch (error) {
    res.status(500).json({ error: { message: error.message, status: 500 } });
  }
};

// 创建模考（按模板配置抽题）
export const createExam = async (req, res) => {
  try {
    const { templateId } = req.body;
    const userId = req.userId;

    const template = await prisma.examTemplate.findUnique({
      where: { id: templateId },
      include: { subject: true }
    });
    if (!template) {
      return res.status(404).json({ error: { message: '模板不存在', status: 404 } });
    }

    const config = template.config || {};
    const sections = config.sections || [{ type: 'choice', count: 10, scorePer: 10 }];
    const fixedIds = Array.isArray(config.fixedQuestionIds) ? config.fixedQuestionIds : [];

    // 固定真题卷：按卷面题目顺序取题；仿真卷：按题型分区抽题
    let pickedQuestions = [];

    // 该用户已做过的题（练习+模考记录），抽题时优先排除，降低重复率
    const [doneEx, doneExam] = await Promise.all([
      prisma.exerciseQuestion.findMany({ where: { exercise: { userId } }, select: { questionId: true } }),
      prisma.examQuestion.findMany({ where: { exam: { userId } }, select: { questionId: true } }),
    ]);
    const doneIds = new Set([...doneEx.map((r) => r.questionId), ...doneExam.map((r) => r.questionId)]);

    if (fixedIds.length > 0) {
      const fixed = await prisma.question.findMany({
        where: { id: { in: fixedIds }, status: 'active' },
      });
      const byId = new Map(fixed.map((q) => [q.id, q]));
      pickedQuestions = fixedIds.map((id) => byId.get(id)).filter(Boolean);
    } else {
      for (const section of sections) {
        // 有分区名时按分区抽题（同区可含混合题型，如完形填空的 choice/fill 版式）；
        // 无分区名时回退按题型抽题
        const where = { subjectId: template.subjectId, status: 'active' };
        if (section.name) where.section = section.name;
        else where.type = section.type;
        const pool = await prisma.question.findMany({ where, take: Math.max(section.count * 6, 60) });
        // 优先未做过的题；未做不足时再从全池补足（保证满卷）
        const fresh = pool.filter((q) => !doneIds.has(q.id));
        const source = fresh.length >= section.count ? fresh : pool;
        const shuffled = [...source].sort(() => Math.random() - 0.5).slice(0, section.count);
        pickedQuestions = pickedQuestions.concat(shuffled);
      }
    }

    if (pickedQuestions.length === 0) {
      return res.status(400).json({ error: { message: '该模板下暂无可用题目，请先用 AI 出题扩充题库或导入真题', status: 400 } });
    }

    // 每道题分值：优先按题目所属分区，其次按题型
    const scoreBySection = {};
    const scoreByType = {};
    for (const s of sections) {
      if (s.name) scoreBySection[s.name] = s.scorePer;
      scoreByType[s.type] = s.scorePer;
    }
    const scoreOf = (q) => (q.section && scoreBySection[q.section] ? scoreBySection[q.section] : scoreByType[q.type] || 5);

    const exam = await prisma.exam.create({
      data: {
        userId,
        templateId,
        startTime: new Date(),
        status: 'in_progress',
        questions: {
          create: pickedQuestions.map((q) => ({ questionId: q.id, score: scoreOf(q) }))
        }
      },
      include: {
        template: { include: { subject: true } },
        questions: {
          include: {
            question: {
              include: {
                questionKnowledge: { include: { knowledgePoint: true } }
              }
            }
          }
        }
      }
    });

    // 统计缺失分区（题库不足被跳过的部分）
    const pickedBySection = {};
    for (const q of pickedQuestions) {
      const key = q.section || q.type;
      pickedBySection[key] = (pickedBySection[key] || 0) + 1;
    }
    const missingSections = sections
      .filter((s) => s.name && (pickedBySection[s.name] || 0) < s.count)
      .map((s) => `${s.name}（差 ${s.count - (pickedBySection[s.name] || 0)} 题）`);

    res.json({ data: { ...exam, missingSections } });
  } catch (error) {
    res.status(500).json({ error: { message: error.message, status: 500 } });
  }
};

// 获取模考列表
export const getExams = async (req, res) => {
  try {
    const userId = req.userId;
    const exams = await prisma.exam.findMany({
      where: userId ? { userId } : {},
      include: {
        template: { include: { subject: true } }
      },
      orderBy: { createdAt: 'desc' },
      take: 20
    });
    res.json({ data: exams });
  } catch (error) {
    res.status(500).json({ error: { message: error.message, status: 500 } });
  }
};

// 获取模考详情
export const getExamById = async (req, res) => {
  try {
    const { id } = req.params;
    const exam = await prisma.exam.findUnique({
      where: { id },
      include: {
        template: { include: { subject: true } },
        questions: {
          include: {
            question: {
              include: {
                questionKnowledge: { include: { knowledgePoint: true } }
              }
            }
          }
        }
      }
    });
    if (!exam) {
      return res.status(404).json({ error: { message: '模考不存在', status: 404 } });
    }
    res.json({ data: exam });
  } catch (error) {
    res.status(500).json({ error: { message: error.message, status: 500 } });
  }
};

// 提交模考：判分 + 总分 + 更新掌握度
export const submitExam = async (req, res) => {
  try {
    const { id } = req.params;
    const { answers } = req.body; // [{ questionId, userAnswer }]

    const exam = await prisma.exam.findUnique({
      where: { id },
      include: {
        questions: {
          include: {
            question: {
              include: {
                questionKnowledge: { include: { knowledgePoint: true } }
              }
            }
          }
        }
      }
    });
    if (!exam) {
      return res.status(404).json({ error: { message: '模考不存在', status: 404 } });
    }
    if (exam.status === 'completed') {
      return res.status(400).json({ error: { message: '该模考已提交过', status: 400 } });
    }

    const answerMap = {};
    for (const a of answers || []) answerMap[a.questionId] = a.userAnswer;

    let score = 0;
    const correctCount = { total: 0, correct: 0 };
    const knowledgeStats = {};

    const updates = exam.questions.map(async (eq) => {
      const userAnswer = answerMap[eq.questionId] || '';
      const isCorrect = gradeQuestion(eq.question, userAnswer);
      correctCount.total++;
      if (isCorrect) correctCount.correct++;

      // 统计知识点正确率
      for (const qk of eq.question.questionKnowledge || []) {
        const kpId = qk.knowledgePoint.id;
        if (!knowledgeStats[kpId]) knowledgeStats[kpId] = { total: 0, correct: 0 };
        knowledgeStats[kpId].total++;
        if (isCorrect) knowledgeStats[kpId].correct++;
      }

      return prisma.examQuestion.update({
        where: { id: eq.id },
        data: { userAnswer, isCorrect }
      });
    });
    await Promise.all(updates);

    // 计算得分：答对得该题满分，答错 0 分（简化）
    for (const eq of exam.questions) {
      const userAnswer = answerMap[eq.questionId] || '';
      if (gradeQuestion(eq.question, userAnswer)) score += eq.score || 0;
    }

    // 模考错题自动入错题本（与练习一致：1 天后安排复习）
    const wrongUpserts = exam.questions
      .filter((eq) => {
        const ua = answerMap[eq.questionId] || '';
        return ua && !gradeQuestion(eq.question, ua);
      })
      .map((eq) =>
        prisma.wrongQuestion.upsert({
          where: { userId_questionId: { userId: exam.userId, questionId: eq.questionId } },
          create: {
            userId: exam.userId,
            questionId: eq.questionId,
            wrongCount: 1,
            lastWrongAt: new Date(),
            nextReviewAt: new Date(Date.now() + 86400000),
          },
          update: {
            wrongCount: { increment: 1 },
            lastWrongAt: new Date(),
            mastered: false,
            nextReviewAt: new Date(Date.now() + 86400000),
          },
        })
      );
    await Promise.all(wrongUpserts);

    // 掌握度更新 + 成就解锁 并行执行（互不依赖，减少交卷等待）
    const [newAchievements] = await Promise.all([
      checkAndUnlockAchievements(exam.userId).catch(() => []),
      (async () => {
        const kpIds = Object.keys(knowledgeStats);
        if (kpIds.length === 0) return;
        // 批量查出所有知识点，避免逐题 findUnique 往返
        const kps = await prisma.knowledgePoint.findMany({ where: { id: { in: kpIds } } });
        await Promise.all(
          kps.map(async (kp) => {
            const stats = knowledgeStats[kp.id];
            const accuracy = (stats.correct / stats.total) * 100;
            let newMastery = kp.mastery;
            if (accuracy >= 80) newMastery = Math.min(100, kp.mastery + 8);
            else if (accuracy < 40) newMastery = Math.max(0, kp.mastery - 8);
            else newMastery = Math.min(100, Math.max(0, kp.mastery + (accuracy - 50) / 12));
            await prisma.knowledgePoint.update({
              where: { id: kp.id },
              data: { mastery: Math.round(newMastery) }
            });
          })
        );
      })(),
    ]);

    const updated = await prisma.exam.update({
      where: { id },
      data: { score, status: 'completed', endTime: new Date() },
      include: {
        template: { include: { subject: true } },
        // 交卷后返回完整题目+判分结果，前端成绩页据此渲染逐题解析
        questions: {
          include: {
            question: {
              include: {
                questionKnowledge: { include: { knowledgePoint: true } },
              },
            },
          },
        },
      },
    });

    recordMasterySnapshot(exam.userId).catch(() => {});

    res.json({
      data: updated,
      summary: {
        total: correctCount.total,
        correct: correctCount.correct,
        accuracy: correctCount.total ? Math.round((correctCount.correct / correctCount.total) * 100) : 0
      },
      newAchievements
    });
  } catch (error) {
    res.status(500).json({ error: { message: error.message, status: 500 } });
  }
};
