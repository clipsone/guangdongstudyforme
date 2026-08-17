import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Routes
import userRoutes from './routes/userRoutes.js';
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
import essayRoutes from './routes/essayRoutes.js';
import exportRoutes from './routes/exportRoutes.js';

// 无论 cwd 在哪，都从 backend/.env 加载本地配置（云端由平台注入环境变量，此文件不存在则跳过）
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN || true,
  credentials: true
}));
app.use(morgan('dev'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API Routes
app.get('/api', (req, res) => {
  res.json({ message: '2027广东春季高考复习API', version: '1.0.0' });
});

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
app.use('/api/essays', essayRoutes);
app.use('/api/export', exportRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    error: {
      message: err.message || '服务器内部错误',
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