import { put } from '@vercel/blob';
import prisma from '../utils/prisma.js';
import pdfParse from 'pdf-parse';
import mammoth from 'mammoth';
import { chat, vision, safeJson } from '../services/aiProvider.js';
const allowed = new Set(['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain', 'text/markdown', 'image/png', 'image/jpeg', 'image/webp']);
export const uploadFile = async (req, res) => {
  if (!process.env.BLOB_READ_WRITE_TOKEN) return res.status(503).json({ error: { message: '文件存储尚未配置，请在 Vercel 添加 BLOB_READ_WRITE_TOKEN', status: 503 } });
  const file = req.file;
  if (!file) return res.status(400).json({ error: { message: '请选择文件', status: 400 } });
  if (!allowed.has(file.mimetype)) return res.status(400).json({ error: { message: '仅支持 PDF、Word、TXT、Markdown 和 PNG/JPG/WEBP 图片', status: 400 } });
  if (file.size > 10 * 1024 * 1024) return res.status(400).json({ error: { message: '单个文件不能超过 10MB', status: 400 } });
  const safeName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
  let extractedText = null;
  if (file.mimetype.startsWith('image/')) { try { extractedText = (await vision('请提取图片中的全部可见文字，保持原有段落和公式结构，只返回文字内容。', `data:${file.mimetype};base64,${file.buffer.toString('base64')}`, { model: process.env.OCR_MODEL || 'glm-4v-flash' })).slice(0, 120000); } catch (error) { console.warn('[OCR失败]', error.message); } }
  else if (file.mimetype === 'application/pdf') { extractedText = (await pdfParse(file.buffer)).text.slice(0, 120000); }
  else if (file.mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') { extractedText = (await mammoth.extractRawText({ buffer: file.buffer })).value.slice(0, 120000); }
  else if (file.mimetype === 'text/plain' || file.mimetype === 'text/markdown') { extractedText = file.buffer.toString('utf8').slice(0, 120000); }
  const blob = await put('university/' + req.userId + '/' + Date.now() + '-' + safeName, file.buffer, { access: 'public', token: process.env.BLOB_READ_WRITE_TOKEN });
  const record = await prisma.universityFile.create({ data: { userId: req.userId, name: file.originalname.slice(0, 200), mimeType: file.mimetype, size: file.size, storageUrl: blob.url, storageKey: blob.pathname, extractedText, parseStatus: extractedText ? 'parsed' : 'uploaded', category: String(req.body.category || 'course-material').slice(0, 50), courseId: req.body.courseId || null } });
  res.status(201).json({ data: record });
};
export const summarizeFile = async (req, res) => {
  const file = await prisma.universityFile.findFirst({ where: { id: req.params.id, userId: req.userId } });
  if (!file) return res.status(404).json({ error: { message: '资料不存在', status: 404 } });
  if (!file.extractedText) return res.status(400).json({ error: { message: '该文件暂未提取到文本；图片 OCR 需要配置视觉模型后使用', status: 400 } });
  try {
    const answer = await chat([{ role: 'user', content: '请将以下大学课程资料整理为 JSON，只返回 {"summary":"...","notes":["..."],"knowledgePoints":["..."]}。不要编造，内容基于原文。\n\n' + file.extractedText }], { json: true, maxTokens: 1800 });
    const parsed = safeJson(answer) || { summary: answer, notes: [], knowledgePoints: [] };
    const updated = await prisma.universityFile.update({ where: { id: file.id }, data: { aiSummary: String(parsed.summary || ''), knowledgePoints: Array.isArray(parsed.knowledgePoints) ? parsed.knowledgePoints : [], parseStatus: 'summarized' } });
    res.json({ data: { file: updated, notes: Array.isArray(parsed.notes) ? parsed.notes : [] } });
  } catch (error) { res.status(503).json({ error: { message: error.message || 'AI 总结暂不可用', status: 503 } }); }
};
