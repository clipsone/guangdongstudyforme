// Vercel Serverless 入口：把 Express 应用导出为无服务器函数
// 请求路径原样传入（含 /api 前缀），Express 内部路由正常匹配
import app from '../backend/src/server.js';

export default app;
