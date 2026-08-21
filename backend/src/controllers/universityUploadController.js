import { put } from '@vercel/blob';
import prisma from '../utils/prisma.js';
const allowed = new Set(['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain', 'text/markdown', 'image/png', 'image/jpeg', 'image/webp']);
export const uploadFile = async (req, res) => {
  if (!process.env.BLOB_READ_WRITE_TOKEN) return res.status(503).json({ error: { message: '文件存储尚未配置，请在 Vercel 添加 BLOB_READ_WRITE_TOKEN', status: 503 } });
  const file = req.file;
  if (!file) return res.status(400).json({ error: { message: '请选择文件', status: 400 } });
  if (!allowed.has(file.mimetype)) return res.status(400).json({ error: { message: '仅支持 PDF、Word、TXT、Markdown 和 PNG/JPG/WEBP 图片', status: 400 } });
  if (file.size > 10 * 1024 * 1024) return res.status(400).json({ error: { message: '单个文件不能超过 10MB', status: 400 } });
  const safeName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
  const blob = await put('university/' + req.userId + '/' + Date.now() + '-' + safeName, file.buffer, { access: 'public', token: process.env.BLOB_READ_WRITE_TOKEN });
  const record = await prisma.universityFile.create({ data: { userId: req.userId, name: file.originalname.slice(0, 200), mimeType: file.mimetype, size: file.size, storageUrl: blob.url, storageKey: blob.pathname, category: String(req.body.category || 'course-material').slice(0, 50), courseId: req.body.courseId || null } });
  res.status(201).json({ data: record });
};
