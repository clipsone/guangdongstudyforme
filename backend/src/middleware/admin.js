// 管理员鉴权：需已登录且 role=admin
import prisma from '../utils/prisma.js';

export default async function adminMiddleware(req, res, next) {
  try {
    const userId = req.userId;
    if (!userId) {
      return res.status(401).json({ error: { message: '请先登录', status: 401 } });
    }
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ error: { message: '无管理员权限', status: 403 } });
    }
    next();
  } catch (error) {
    res.status(500).json({ error: { message: error.message, status: 500 } });
  }
}
