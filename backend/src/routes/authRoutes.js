// 认证路由：注册/登录公开（带限速），登出/me/改密需要鉴权
import express from 'express';
import rateLimit from 'express-rate-limit';
import * as authController from '../controllers/authController.js';
import authMiddleware from '../middleware/auth.js';

const router = express.Router();

// 登录/注册限速：同一 IP 15 分钟内最多 20 次尝试，防暴力破解
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: { message: '尝试次数过多，请 15 分钟后再试', status: 429 } },
});

router.post('/register', authLimiter, authController.register);
router.post('/login', authLimiter, authController.login);
router.post('/logout', authMiddleware, authController.logout);
router.get('/me', authMiddleware, authController.me);
router.post('/change-password', authMiddleware, authController.changePassword);

export default router;
