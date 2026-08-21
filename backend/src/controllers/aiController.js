// AI控制器：优先调用真实模型（智谱 GLM），未配置时自动回退 Mock
import prisma from '../utils/prisma.js';
import { chat as aiChat, isConfigured, safeJson } from '../services/aiProvider.js';

// ---------- 知识点讲解 ----------
export const explainKnowledge = async (req, res) => {
  try {
    const { knowledgePointId } = req.body;
    const kp = knowledgePointId
      ? await prisma.knowledgePoint.findUnique({ where: { id: knowledgePointId } })
      : null;

    // 真实模型：基于考点内容生成讲解
    if (isConfigured() && kp) {
      const text = await aiChat(
        [
          {
            role: 'system',
            content:
              '你是一位资深高中教师，用中文为春季高考考生讲解知识点。只输出 JSON，格式：{"explanation":"详细讲解(100字以内,直击考点)","keyPoints":["要点1","要点2"],"examples":["示例1"],"relatedTopics":["相关知识点1"]}。内容务必精炼，不要空话。',
          },
          {
            role: 'user',
            content: `知识点名称：${kp.name}\n编号：${kp.code}\n描述：${kp.description || '无'}\n请结合春季高考考查方式讲解，简洁实用。`,
          },
        ],
        { temperature: 0.5, json: true, maxTokens: 600 }
      );
      const parsed = safeJson(text);
      if (parsed?.explanation) {
        return res.json({
          data: {
            knowledgePointId,
            code: kp.code,
            explanation: parsed.explanation,
            keyPoints: parsed.keyPoints || [],
            examples: parsed.examples || [],
            relatedTopics: parsed.relatedTopics || [],
          },
        });
      }
    }

    // Mock 回退
    const mockResponse = {
      knowledgePointId,
      code: kp?.code,
      explanation: kp
        ? `【${kp.name}】${kp.description || '核心考点'}。本考点是春季高考的常见考查内容，复习时先理解概念，再通过典型例题掌握解题套路，最后注意常见易错点。`
        : `这是关于知识点${knowledgePointId}的详细讲解。在实际实现中，这里会调用AI生成讲解内容。`,
      keyPoints: [
        '重点1：理解基本概念',
        '重点2：掌握解题方法',
        '重点3：注意常见误区',
      ],
      examples: ['示例1：基本题型演示', '示例2：进阶题型演示'],
      relatedTopics: ['前置知识点A', '相关知识点B'],
    };
    await new Promise((resolve) => setTimeout(resolve, 400));
    res.json({ data: mockResponse });
  } catch (error) {
    // 模型调用失败时回退 Mock
    const kp = null;
    const mockResponse = {
      knowledgePointId: req.body?.knowledgePointId,
      explanation: '（模型服务暂时不可用）这是关于该知识点的通用讲解。重点1：理解基本概念；重点2：掌握解题方法；重点3：注意常见误区。',
      keyPoints: ['重点1：理解基本概念', '重点2：掌握解题方法', '重点3：注意常见误区'],
      examples: ['示例1：基本题型演示'],
      relatedTopics: [],
    };
    res.json({ data: mockResponse });
  }
};

// ---------- 解题助手 ----------
export const solveQuestion = async (req, res) => {
  try {
    const { questionId, userAnswer } = req.body;

    const question = questionId
      ? await prisma.question.findUnique({
          where: { id: questionId },
          include: {
            subject: true,
            questionKnowledge: { include: { knowledgePoint: true } },
          },
        })
      : null;

    const grade = (ua) => {
      const input = String(ua || '').trim().toLowerCase();
      if (!question || !input) return false;
      const ans = String(question.answer || '').trim().toLowerCase();
      if (question.type === 'choice') return input === ans;
      const norm = (s) => s.replace(/[\s，。、；：,.!?；'"“”]/g, '');
      return norm(input) === norm(ans);
    };

    const isCorrect = grade(userAnswer);
    const analysis = question?.solution?.analysis || '先理解题意，再运用对应知识点求解。';
    const kps = (question?.questionKnowledge || []).map((qk) => `${qk.knowledgePoint.code} ${qk.knowledgePoint.name}`);
    const answer = String(question?.answer || '略');
    const optionText = Array.isArray(question?.options)
      ? question.options.join('；')
      : question?.options && typeof question.options === 'object'
        ? Object.entries(question.options).map(([key, value]) => `${key}. ${value}`).join('；')
        : String(question?.options || '无');

    // 真实模型：基于题目与作答生成个性化解析
    if (isConfigured() && question) {
      try {
        const text = await aiChat(
          [
            {
              role: 'system',
              content:
                '你是一位春季高考辅导老师，针对学生作答情况给出完整解题。只输出 JSON，格式：{"explanation":"针对对错情况的详细解析（作文可为评分与问题分析）","stepByStep":["步骤1","步骤2"],"tips":"解题技巧或写作建议","relatedKnowledge":["知识点1"],"referenceAnswer":"完整参考答案"}。如果题型是作文/解答题，referenceAnswer 必须直接输出完整成文答案，包含开头、主体论证和结尾，不能只给提纲、关键词、写作提示或“略”；选择题和填空题可为空字符串。',
            },
            {
              role: 'user',
              content: `题目（${question.type === 'choice' ? '选择题' : question.type === 'fill' ? '填空题' : '解答题'}）：${question.stem}\n选项：${optionText}\n标准答案：${answer}\n题目解析：${analysis}\n学生作答：${userAnswer || '（未作答）'}\n判分结果：${isCorrect ? '正确' : '错误'}\n请给出解释与下一步建议。`,
            },
          ],
          { temperature: 0.4, json: true, maxTokens: 1400 }
        );
        const parsed = safeJson(text);
        if (parsed?.explanation) {
          return res.json({
            data: {
              isCorrect,
              explanation: isCorrect ? `答对了！${parsed.explanation}` : `本题正确答案是「${answer}」。${parsed.explanation}`,
              stepByStep: parsed.stepByStep || [],
              tips: parsed.tips || '注意审题，避免粗心错误；做完后对照解析检查思路。',
              relatedKnowledge: parsed.relatedKnowledge?.length ? parsed.relatedKnowledge : (kps.length ? kps : ['相关知识点']),
              referenceAnswer: String(parsed.referenceAnswer || '').trim(),
            },
          });
        }
      } catch {
        // 模型调用失败走 mock 回退
      }
    }

    const mockResponse = {
      isCorrect,
      explanation: isCorrect
        ? `答对了！本题解析：${analysis}`
        : `本题正确答案是「${answer}」。解析：${analysis}`,
      stepByStep: isCorrect
        ? ['审题正确', '方法得当', '结论准确']
        : ['步骤1：先明确题目考查的知识点', '步骤2：把已知条件列出来，逐条分析', '步骤3：对照正确答案找差距，重做一遍', '步骤4：做一道同考点题目巩固'],
      tips: '解题提示：注意审题，避免粗心错误；做完后对照解析检查思路。',
      relatedKnowledge: kps.length > 0 ? kps : ['相关知识点'],
      referenceAnswer: ['essay', 'composite'].includes(question?.type)
        ? String(question?.solution?.referenceAnswer || question?.answer || '请结合题目要求完成完整作答。')
        : '',
    };
    await new Promise((resolve) => setTimeout(resolve, 300));
    res.json({ data: mockResponse });
  } catch (error) {
        console.error('[API错误]', error?.message || error);
        res.status(500).json({ error: { message: '服务器内部错误', status: 500 } });
  }
};

// ---------- 作文批改（60 分制） ----------
export const reviewEssay = async (req, res) => {
  try {
    const { essayContent, essayTitle = '（无标题）' } = req.body;
    const content = String(essayContent || '').trim();

    if (isConfigured() && content) {
      try {
        const text = await aiChat(
          [
            {
              role: 'system',
              content:
                '你是一位广东春季高考语文阅卷教师，按 60 分制批改学生作文。只输出 JSON，格式：{"score":分数(30-58整数),"comment":"总评(60字内)","strengths":["优点1","优点2"],"weaknesses":["不足1"],"suggestions":["改进建议1","改进建议2"]}。评分要严格，内容空洞、偏题作文给低分。',
            },
            { role: 'user', content: `作文标题：${essayTitle}\n\n作文内容：\n${content}` },
          ],
          { temperature: 0.3, json: true, maxTokens: 600 }
        );
        const parsed = safeJson(text);
        if (parsed?.score && parsed.comment) {
          return res.json({
            data: {
              score: Math.max(30, Math.min(58, Number(parsed.score) || 45)),
              comment: parsed.comment,
              strengths: parsed.strengths || [],
              weaknesses: parsed.weaknesses || [],
              suggestions: parsed.suggestions || [],
            },
          });
        }
      } catch {
        // 模型调用失败走 mock 回退
      }
    }

    const mockResponse = {
      score: Math.floor(Math.random() * 15) + 40, // 40-55分
      comment: '这是一篇结构完整、观点明确的作文。建议在论证深度和语言表达上进一步提升。',
      strengths: ['结构清晰，层次分明', '观点明确，论据合理', '语言流畅'],
      weaknesses: ['论证深度不够', '部分语句表达不够准确', '缺乏具体例证'],
      suggestions: ['增加具体事例支撑论点', '优化语言表达，使文章更生动', '深化论证层次，增强说服力'],
    };
    await new Promise((resolve) => setTimeout(resolve, 600));
    res.json({ data: mockResponse });
  } catch (error) {
        console.error('[API错误]', error?.message || error);
        res.status(500).json({ error: { message: '服务器内部错误', status: 500 } });
  }
};

// ---------- 聊天历史 ----------
export const getChatHistory = async (req, res) => {
  try {
    const userId = req.userId;
    if (!userId) return res.json({ data: [] });

    const records = await prisma.chatRecord.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 30,
    });

    const messages = [];
    for (const r of [...records].reverse()) {
      messages.push({ role: 'user', content: r.question, createdAt: r.createdAt });
      messages.push({ role: 'ai', content: r.answer, createdAt: r.createdAt });
    }
    res.json({ data: messages });
  } catch (error) {
        console.error('[API错误]', error?.message || error);
        res.status(500).json({ error: { message: '服务器内部错误', status: 500 } });
  }
};

// ---------- 自由问答 ----------
export const chat = async (req, res) => {
  try {
    const { question } = req.body;
    const userId = req.userId;

    const q = String(question || '').trim();
    if (!q) {
      return res.status(400).json({ error: { message: '请输入问题', status: 400 } });
    }

    let answer;
    if (isConfigured()) {
      try {
        answer = String(
          await aiChat(
            [
              {
                role: 'system',
                content:
                  '你是一位熟悉广东春季高考（语文、数学、英语）的辅导老师，用中文耐心解答学生的学习问题。回答要清晰、有条理，重点突出，适合高中生理解；涉及知识点时给出复习建议。',
              },
              { role: 'user', content: q },
            ],
            { temperature: 0.6, maxTokens: 900 }
          )
        ).trim();
      } catch {
        // 模型调用失败走 mock 回退
      }
    }

    if (!answer) {
      answer = [
        '好的，我来帮你解答这个问题。\n\n**思路**：先明确题目考查的知识点，再套用对应的方法。建议你先把题干里的关键条件列出来，看看和哪个考点相关。',
        '这个问题属于基础考点，建议先回顾课本概念，再做几道同类型题目巩固。如果还不清楚，可以到「学习」页找到对应考点查看 AI 讲解。',
        '（当前为演示模式，未配置模型 API。在 .env 中设置 AI_PROVIDER=glm 与 ZHIPU_API_KEY 即可启用真实 AI 问答。）你可以试试问："春考数学复数怎么复习？" 或 "帮我解释充分必要条件"。',
      ].sort(() => Math.random() - 0.5).slice(0, 1)[0];
      answer += `\n\n---\n你的问题：${q}`;
    }

    try {
      await prisma.chatRecord.create({
        data: { userId, question: q, answer },
      });
    } catch (e) {
      // 记录失败不影响回答
    }

    res.json({ data: { answer } });
  } catch (error) {
        console.error('[API错误]', error?.message || error);
        res.status(500).json({ error: { message: '服务器内部错误', status: 500 } });
  }
};
