// 认证控制器：注册 / 登录 / 登出 / 当前用户
import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import prisma from '../utils/prisma.js';

const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 天

const safeUser = (u) => ({
  id: u.id,
  username: u.username,
  email: u.email,
  targetScore: u.targetScore,
  examDate: u.examDate,
  createdAt: u.createdAt,
});

const createSession = async (userId) => {
  const token = crypto.randomBytes(32).toString('hex');
  const session = await prisma.session.create({
    data: {
      token,
      userId,
      expiresAt: new Date(Date.now() + SESSION_TTL_MS),
    },
  });
  return session.token;
};

// 注册：username + password，自动登录
export const register = async (req, res) => {
  try {
    const { username, password, email } = req.body || {};
    const name = String(username || '').trim();
    const pwd = String(password || '');
    const mail = email ? String(email).trim() : null;

    if (!name || name.length < 2 || name.length > 20) {
      return res.status(400).json({ error: { message: '用户名需为 2-20 个字符', status: 400 } });
    }
    if (pwd.length < 6) {
      return res.status(400).json({ error: { message: '密码至少 6 位', status: 400 } });
    }

    const exists = await prisma.user.findUnique({ where: { username: name } });
    if (exists) {
      return res.status(409).json({ error: { message: '用户名已被注册', status: 409 } });
    }

    const passwordHash = bcrypt.hashSync(pwd, 10);
    const user = await prisma.user.create({
      data: {
        username: name,
        email: mail,
        passwordHash,
        examDate: new Date('2027-01-10'),
      },
    });

    const token = await createSession(user.id);
    res.status(201).json({ data: { token, user: safeUser(user) } });
  } catch (error) {
    res.status(500).json({ error: { message: error.message, status: 500 } });
  }
};

// 登录
export const login = async (req, res) => {
  try {
    const { username, password } = req.body || {};
    const name = String(username || '').trim();

    if (!name || !password) {
      return res.status(400).json({ error: { message: '请输入用户名和密码', status: 400 } });
    }

    const user = await prisma.user.findUnique({ where: { username: name } });
    if (!user || !bcrypt.compareSync(String(password), user.passwordHash)) {
      return res.status(401).json({ error: { message: '用户名或密码错误', status: 401 } });
    }

    const token = await createSession(user.id);
    res.json({ data: { token, user: safeUser(user) } });
  } catch (error) {
    res.status(500).json({ error: { message: error.message, status: 500 } });
  }
};

// 登出：删除当前会话
export const logout = async (req, res) => {
  try {
    if (req.token) {
      await prisma.session.delete({ where: { token: req.token } }).catch(() => {});
    }
    res.json({ data: { success: true } });
  } catch (error) {
    res.status(500).json({ error: { message: error.message, status: 500 } });
  }
};

// 当前用户信息（剔除敏感字段）
export const me = async (req, res) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.userId } });
    if (!user) {
      return res.status(404).json({ error: { message: '用户不存在', status: 404 } });
    }
    res.json({ data: safeUser(user) });
  } catch (error) {
    res.status(500).json({ error: { message: error.message, status: 500 } });
  }
};
