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
    res.json({ data: templates });
  } catch (error) {
    res.status(500).json({ error: { message: error.message, status: 500 } });
  }
};

// 创建模考（按模板配置抽题）
export const createExam = async (req, res) => {
  try {
    const { userId, templateId } = req.body;

    const template = await prisma.examTemplate.findUnique({
      where: { id: templateId },
      include: { subject: true }
    });
    if (!template) {
      return res.status(404).json({ error: { message: '模板不存在', status: 404 } });
    }

    const sections = (template.config && template.config.sections) || [{ type: 'choice', count: 10, scorePer: 10 }];

    // 按题型抽题
    let pickedQuestions = [];
    for (const section of sections) {
      const pool = await prisma.question.findMany({
        where: { subjectId: template.subjectId, type: section.type, status: 'active' },
        take: Math.max(section.count * 3, 30)
      });
      const shuffled = [...pool].sort(() => Math.random() - 0.5).slice(0, section.count);
      pickedQuestions = pickedQuestions.concat(shuffled);
    }

    if (pickedQuestions.length === 0) {
      return res.status(400).json({ error: { message: '该模板下暂无可用题目，请先导入题库', status: 400 } });
    }

    // 每道题按所属题型计分
    const scoreOf = {};
    for (const section of sections) {
      scoreOf[section.type] = section.scorePer;
    }

    const exam = await prisma.exam.create({
      data: {
        userId,
        templateId,
        startTime: new Date(),
        status: 'in_progress',
        questions: {
          create: pickedQuestions.map((q) => ({ questionId: q.id, score: scoreOf[q.type] || 0 }))
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

    res.json({ data: exam });
  } catch (error) {
    res.status(500).json({ error: { message: error.message, status: 500 } });
  }
};

// 获取模考列表
export const getExams = async (req, res) => {
  try {
    const { userId } = req.query;
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

    // 更新掌握度
    for (const [kpId, stats] of Object.entries(knowledgeStats)) {
      const accuracy = (stats.correct / stats.total) * 100;
      const kp = await prisma.knowledgePoint.findUnique({ where: { id: kpId } });
      if (!kp) continue;
      let newMastery = kp.mastery;
      if (accuracy >= 80) newMastery = Math.min(100, kp.mastery + 8);
      else if (accuracy < 40) newMastery = Math.max(0, kp.mastery - 8);
      else newMastery = Math.min(100, Math.max(0, kp.mastery + (accuracy - 50) / 12));
      await prisma.knowledgePoint.update({
        where: { id: kpId },
        data: { mastery: Math.round(newMastery) }
      });
    }

    const updated = await prisma.exam.update({
      where: { id },
      data: { score, status: 'completed', endTime: new Date() },
      include: {
        template: { include: { subject: true } }
      }
    });

    const newAchievements = await checkAndUnlockAchievements(exam.userId).catch(() => []);
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
