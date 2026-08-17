import prisma from '../utils/prisma.js';
import { chat, isConfigured, safeJson } from '../services/aiProvider.js';

// 保存作文并自动 AI 批改落库（优先真实模型，未配置时用规则 mock）
async function mockReview(essay) {
  const length = essay.content.length;
  const score = Math.max(30, Math.min(58, Math.round(45 + (length > 400 ? 6 : 3) + (essay.type === 'argument' ? 2 : 0))));
  return {
    score,
    comment: '这是一篇结构完整的作文。建议在论证深度和语言表达上进一步提升。',
    strengths: ['结构清晰，层次分明', '观点明确', '语言流畅'],
    weaknesses: ['论证深度不够', '部分语句表达不够准确', '缺乏具体例证'],
    suggestions: ['增加具体事例支撑论点', '优化语言表达，使文章更生动', '深化论证层次，增强说服力']
  };
}

// 真实模型批改（60 分制）
async function aiReview(essay) {
  const text = await chat(
    [
      {
        role: 'system',
        content:
          '你是一位广东春季高考语文阅卷教师，按 60 分制批改学生作文。只输出 JSON，格式：{"score":分数(30-58整数),"comment":"总评(80字内)","strengths":["优点1"],"weaknesses":["不足1"],"suggestions":["建议1"]}。评分严格，内容空洞给低分。',
      },
      { role: 'user', content: `作文标题：${essay.title}

作文内容：
${essay.content}` },
    ],
    { temperature: 0.3, json: true }
  );
  const parsed = safeJson(text);
  if (!parsed?.score || !parsed.comment) throw new Error('AI 批改结果格式异常');
  return {
    score: Math.max(30, Math.min(58, Number(parsed.score) || 45)),
    comment: parsed.comment,
    strengths: parsed.strengths || [],
    weaknesses: parsed.weaknesses || [],
    suggestions: parsed.suggestions || [],
  };
}

// 保存作文（可选生成 AI 批改）
export const createEssay = async (req, res) => {
  try {
    const { userId, subjectId, title, content, type = 'argument', withReview = true } = req.body;
    if (!userId || !content) {
      return res.status(400).json({ error: { message: '缺少用户或作文内容', status: 400 } });
    }

    // subjectId 必填：缺省取第一科
    let finalSubjectId = subjectId;
    if (!finalSubjectId) {
      const first = await prisma.subject.findFirst();
      finalSubjectId = first?.id;
    }
    if (!finalSubjectId) {
      return res.status(400).json({ error: { message: '暂无科目数据', status: 400 } });
    }

    const essay = await prisma.essay.create({
      data: {
        userId,
        subjectId: finalSubjectId,
        title: title || '未命名作文',
        content,
        type
      }
    });

    let review = null;
    if (withReview) {
      let r = null;
      if (isConfigured()) {
        try {
          r = await aiReview(essay);
        } catch {
          r = null; // 模型失败回退规则批改
        }
      }
      if (!r) r = await mockReview(essay);
      review = await prisma.essayReview.create({
        data: {
          essayId: essay.id,
          score: r.score,
          comment: r.comment,
          strengths: r.strengths,
          weaknesses: r.weaknesses,
          suggestions: r.suggestions
        }
      });
    }

    res.json({ data: { essay, review } });
  } catch (error) {
    res.status(500).json({ error: { message: error.message, status: 500 } });
  }
};

// 我的作文列表（含批改）
export const getEssays = async (req, res) => {
  try {
    const { userId } = req.query;
    const essays = await prisma.essay.findMany({
      where: userId ? { userId } : {},
      include: {
        reviews: { orderBy: { reviewedAt: 'desc' }, take: 1 }
      },
      orderBy: { createdAt: 'desc' },
      take: 50
    });
    res.json({ data: essays });
  } catch (error) {
    res.status(500).json({ error: { message: error.message, status: 500 } });
  }
};

// 删除作文
export const deleteEssay = async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.essay.delete({ where: { id } });
    res.json({ data: { id, deleted: true } });
  } catch (error) {
    res.status(500).json({ error: { message: error.message, status: 500 } });
  }
};
