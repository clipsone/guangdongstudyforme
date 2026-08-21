import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// 必须在其他模块导入前加载环境变量
// Vercel 会注入 DATABASE_URL，本地开发从 .env 读取
if (!process.env.VERCEL && !process.env.DATABASE_URL) {
  import('dotenv').then(({ default: dotenv }) => {
    dotenv.config({ path: path.join(__dirname, '..', '.env') });
  });
}

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import prisma from './utils/prisma.js';

// Routes
import userRoutes from './routes/userRoutes.js';
import authRoutes from './routes/authRoutes.js';
import subjectRoutes from './routes/subjectRoutes.js';
import knowledgeRoutes from './routes/knowledgeRoutes.js';
import questionRoutes from './routes/questionRoutes.js';
import exerciseRoutes from './routes/exerciseRoutes.js';
import wrongQuestionRoutes from './routes/wrongQuestionRoutes.js';
import recitationRoutes from './routes/recitationRoutes.js';
import statisticsRoutes from './routes/statisticsRoutes.js';
import aiRoutes from './routes/aiRoutes.js';
import studyTaskRoutes from './routes/studyTaskRoutes.js';
import examRoutes from './routes/examRoutes.js';
import achievementRoutes from './routes/achievementRoutes.js';
import studySessionRoutes from './routes/studySessionRoutes.js';
import diagnosticRoutes from './routes/diagnosticRoutes.js';
import weeklyReportRoutes from './routes/weeklyReportRoutes.js';
import resourceRoutes from './routes/resourceRoutes.js';
import universityRoutes from './routes/universityRoutes.js';
import universityAnalyticsRoutes from './routes/universityAnalyticsRoutes.js';
import essayRoutes from './routes/essayRoutes.js';
import exportRoutes from './routes/exportRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import lawRoutes from './routes/lawRoutes.js';

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(helmet());
app.use(cors({
  // 锁死允许的来源域名（默认本站），禁止反射任意 Origin
  origin: process.env.CORS_ORIGIN || (process.env.VERCEL ? `https://${process.env.VERCEL_URL}` : 'https://www.day-money-made.icu'),
  credentials: true
}));
app.use(morgan('dev'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health check：本地兼容 /health，Vercel 统一使用 /api/health
const healthCheck = async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1 as test`;
    res.json({ status: 'ok', database: 'connected', timestamp: new Date().toISOString() });
  } catch (e) {
    res.status(500).json({ status: 'error', database: 'disconnected', error: e.message });
  }
};
app.get('/health', healthCheck);
app.get('/api/health', healthCheck);

// API Routes
app.get('/api', (req, res) => {
  res.json({ message: '2027广东春季高考复习API', version: '1.0.0' });
});

app.use('/api/auth', authRoutes);
app.use('/api/user', userRoutes);
app.use('/api/subjects', subjectRoutes);
app.use('/api/knowledge', knowledgeRoutes);
app.use('/api/questions', questionRoutes);
app.use('/api/exercises', exerciseRoutes);
app.use('/api/wrong-questions', wrongQuestionRoutes);
app.use('/api/recitation', recitationRoutes);
app.use('/api/statistics', statisticsRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/study-tasks', studyTaskRoutes);
app.use('/api/exams', examRoutes);
app.use('/api/achievements', achievementRoutes);
app.use('/api/study-sessions', studySessionRoutes);
app.use('/api/diagnostics', diagnosticRoutes);
app.use('/api/weekly-reports', weeklyReportRoutes);
app.use('/api/resources', resourceRoutes);
app.use('/api/university', universityRoutes);
app.use('/api/university-analytics', universityAnalyticsRoutes);
app.use('/api/essays', essayRoutes);
app.use('/api/export', exportRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/law', lawRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  // 只记录摘要，不向客户端回显内部错误细节
  console.error('[全局错误]', err?.status, err?.message);
  res.status(err.status || 500).json({
    error: {
      message: '服务器内部错误',
      status: err.status || 500
    }
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: { message: '接口不存在', status: 404 } });
});

// 本地/服务进程模式：直接监听端口；Vercel Serverless 模式：导出 app 由平台托管
if (!process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`🚀 服务器运行在 http://localhost:${PORT}`);
    console.log(`📚 环境: ${process.env.NODE_ENV || 'development'}`);
  });
}

export default app;