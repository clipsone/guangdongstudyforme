import prisma from '../utils/prisma.js';

// 获取当前用户（单用户模式：默认取 seed 创建的 student 用户）
export const getMe = async (req, res) => {
  try {
    const user = await prisma.user.findFirst({
      where: { username: 'student' },
      orderBy: { createdAt: 'asc' }
    });

    if (!user) {
      return res.status(404).json({ error: { message: '默认用户不存在，请先运行种子导入', status: 404 } });
    }

    res.json({ data: user });
  } catch (error) {
    res.status(500).json({ error: { message: error.message, status: 500 } });
  }
};

// 更新用户（考试日期/目标分）
export const updateMe = async (req, res) => {
  try {
    const user = await prisma.user.findFirst({
      where: { username: 'student' },
      orderBy: { createdAt: 'asc' }
    });

    if (!user) {
      return res.status(404).json({ error: { message: '默认用户不存在', status: 404 } });
    }

    const { targetScore, examDate } = req.body;
    const updated = await prisma.user.update({
      where: { id: user.id },
      data: {
        ...(targetScore !== undefined ? { targetScore: Number(targetScore) } : {}),
        ...(examDate ? { examDate: new Date(examDate) } : {})
      }
    });

    res.json({ data: updated });
  } catch (error) {
    res.status(500).json({ error: { message: error.message, status: 500 } });
  }
};
