// 单用户模式：直接注入默认用户 ID，不做真实登录校验
const authMiddleware = (req, res, next) => {
  try {
    req.userId = process.env.DEFAULT_USER_ID || 'default-user-id';
    next();
  } catch (error) {
    res.status(401).json({ error: { message: '未授权访问', status: 401 } });
  }
};

export default authMiddleware;
