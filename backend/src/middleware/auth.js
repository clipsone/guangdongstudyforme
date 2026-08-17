// 多用户鉴权：从 Authorization: Bearer <token> 解析会话，注入 req.userId
import prisma from '../utils/prisma.js';

const authMiddleware = async (req, res, next) => {
  try {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7).trim() : '';

    if (!token) {
      return res.status(401).json({ error: { message: '请先登录', status: 401 } });
    }

    const session = await prisma.session.findUnique({ where: { token } });

    if (!session || session.expiresAt.getTime() < Date.now()) {
      // 过期会话顺手清理
      if (session) {
        await prisma.session.delete({ where: { id: session.id } }).catch(() => {});
      }
      return res.status(401).json({ error: { message: '登录已过期，请重新登录', status: 401 } });
    }

    req.userId = session.userId;
    req.token = token;
    next();
  } catch (error) {
    res.status(401).json({ error: { message: '未授权访问', status: 401 } });
  }
};

export default authMiddleware;
