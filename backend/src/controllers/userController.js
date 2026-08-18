import prisma from '../utils/prisma.js';

// 剔除敏感字段
const safeUser = (u) => ({
  id: u.id,
  username: u.username,
  email: u.email,
  targetScore: u.targetScore,
  examDate: u.examDate,
  role: u.role || 'user',
  createdAt: u.createdAt,
});

// 获取当前登录用户
export const getMe = async (req, res) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.userId } });

    if (!user) {
      return res.status(404).json({ error: { message: '用户不存在', status: 404 } });
    }

    res.json({ data: safeUser(user) });
  } catch (error) {
        console.error('[API错误]', error?.message || error);
        res.status(500).json({ error: { message: '服务器内部错误', status: 500 } });
  }
};

// 更新当前用户（考试日期/目标分）
export const updateMe = async (req, res) => {
  try {
    const { targetScore, examDate } = req.body;
    const updated = await prisma.user.update({
      where: { id: req.userId },
      data: {
        ...(targetScore !== undefined ? { targetScore: Number(targetScore) } : {}),
        ...(examDate ? { examDate: new Date(examDate) } : {})
      }
    });

    res.json({ data: safeUser(updated) });
  } catch (error) {
        console.error('[API错误]', error?.message || error);
        res.status(500).json({ error: { message: '服务器内部错误', status: 500 } });
  }
};
