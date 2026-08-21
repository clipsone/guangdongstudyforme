import prisma from '../utils/prisma.js';

// 获取科目列表
export const getSubjects = async (req, res) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.userId }, select: { examMode: true } });
    const allowedCodes = user?.examMode === 'undergraduate'
      ? ['CET4', 'CET6', 'IELTS', 'TOEFL', 'LAW', 'UNIV', 'PAPER']
      : ['Y', 'M', 'E'];
    const subjects = await prisma.subject.findMany({
      where: { code: { in: allowedCodes } },
      orderBy: { code: 'asc' }
    });

    res.json({ data: subjects });
  } catch (error) {
        console.error('[API错误]', error?.message || error);
        res.status(500).json({ error: { message: '服务器内部错误', status: 500 } });
  }
};
