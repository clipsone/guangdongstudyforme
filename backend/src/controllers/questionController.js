import prisma from '../utils/prisma.js';

// 获取题目列表
export const getQuestions = async (req, res) => {
  try {
    const {
      subjectId,
      type,
      difficulty,
      knowledgePointId,
      limit = 20,
      offset = 0
    } = req.query;

    const where = {};

    if (subjectId) where.subjectId = subjectId;
    if (type) where.type = type;
    if (difficulty) where.difficulty = parseInt(difficulty);

    if (knowledgePointId) {
      const questionKnowledge = await prisma.questionKnowledge.findMany({
        where: { knowledgePointId },
        select: { questionId: true }
      });
      where.id = { in: questionKnowledge.map(q => q.questionId) };
    }

    const [questions, total] = await Promise.all([
      prisma.question.findMany({
        where,
        include: {
          subject: true,
          questionKnowledge: {
            include: {
              knowledgePoint: true
            }
          }
        },
        take: parseInt(limit),
        skip: parseInt(offset),
        orderBy: { createdAt: 'desc' }
      }),
      prisma.question.count({ where })
    ]);

    res.json({
      data: questions,
      meta: {
        total,
        limit: parseInt(limit),
        offset: parseInt(offset)
      }
    });
  } catch (error) {
    res.status(500).json({ error: { message: error.message, status: 500 } });
  }
};

// 获取单个题目详情
export const getQuestionById = async (req, res) => {
  try {
    const { id } = req.params;

    const question = await prisma.question.findUnique({
      where: { id },
      include: {
        subject: true,
        questionKnowledge: {
          include: {
            knowledgePoint: {
              include: {
                chapter: true
              }
            }
          }
        }
      }
    });

    if (!question) {
      return res.status(404).json({ error: { message: '题目不存在', status: 404 } });
    }

    res.json({ data: question });
  } catch (error) {
    res.status(500).json({ error: { message: error.message, status: 500 } });
  }
};