import prisma from '../utils/prisma.js';

// 获取科目列表
export const getSubjects = async (req, res) => {
  try {
    const subjects = await prisma.subject.findMany({
      orderBy: { code: 'asc' }
    });

    res.json({ data: subjects });
  } catch (error) {
    res.status(500).json({ error: { message: error.message, status: 500 } });
  }
};
