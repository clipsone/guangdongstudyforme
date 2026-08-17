// AI 题库增强：AI 出题（扩充题库）+ 历年真题导入（解析粘贴文本入库）
import prisma from '../utils/prisma.js';
import { chat as aiChat, isConfigured, safeJson, extractArray } from '../services/aiProvider.js';

// 各科真实试卷题型分区（广东春季高考·依学考，供 AI 出题/解析参考）
const SUBJECT_SECTIONS = {
  语文: ['现代文阅读', '文言文阅读', '古代诗歌鉴赏', '名句名篇默写', '语言文字运用', '写作'],
  数学: ['单选题', '填空题', '解答题'],
  英语: ['单项选择', '完形填空', '阅读理解', '语法填空', '书面表达'],
};

// 归一化单题
function normalizeQuestion(raw, subjectId, fallbackSection, fallbackType) {
  const stem = String(raw?.stem || '').trim();
  if (!stem) return null;
  let type = String(raw?.type || fallbackType || 'choice').toLowerCase();
  if (!['choice', 'fill', 'essay'].includes(type)) type = 'choice';
  const section = String(raw?.section || fallbackSection || '').trim() || null;
  const options = Array.isArray(raw?.options) ? raw.options.map((o) => String(o).trim()) : null;
  let answer = String(raw?.answer ?? '').trim();
  if (type === 'choice' && options?.length) {
    // 选项按 A/B/C/D 编号，答案统一为字母（兼容 "答案C"/"C项"/"C." 等写法）
    if (!/^[A-D]$/i.test(answer)) {
      const idx = options.findIndex((o) => o === answer || o.startsWith(answer));
      if (idx >= 0) answer = String.fromCharCode(65 + idx);
      else {
        const m = String(answer).match(/[A-D]/i);
        if (m) answer = m[0];
      }
    }
    answer = answer.toUpperCase();
  }
  if (!answer) return null;
  return {
    subjectId,
    type,
    section,
    stem,
    options: options && options.length ? options : null,
    answer,
    solution: { analysis: String(raw?.analysis || raw?.solution || '') },
    difficulty: Math.min(5, Math.max(1, parseInt(raw?.difficulty) || 3)),
    source: 'ai',
  };
}

// ---------- AI 出题 ----------
// 并行逐题生成：每道题一个独立小请求同时发出（快模型+短输出），
// 总耗时≈单题耗时，适配 Vercel 60s 函数上限
const FAST_MODEL = 'glm-4-flash';

export const generateQuestions = async (req, res) => {
  try {
    const { subjectId, knowledgePointId, section, type = 'choice', count = 5 } = req.body;
    const num = Math.min(10, Math.max(1, parseInt(count) || 5));

    const subject = await prisma.subject.findUnique({ where: { id: subjectId } });
    if (!subject) return res.status(400).json({ error: { message: '科目不存在', status: 400 } });

    const kp = knowledgePointId
      ? await prisma.knowledgePoint.findUnique({ where: { id: knowledgePointId } })
      : null;

    const typeName = type === 'choice' ? '单项选择题（4个选项）' : type === 'fill' ? '填空题' : '解答题';
    const sectionDesc = section ? `，属于「${section}」题型分区` : '';
    const kpDesc = kp ? `，考查知识点：${kp.name}` : '';

    const formatSpec =
      type === 'choice'
        ? '{"stem":"题干","options":["A选项","B选项","C选项","D选项"],"answer":"正确选项字母(A/B/C/D)","analysis":"解析一句话"}'
        : type === 'fill'
          ? '{"stem":"题干（用____表示填空处）","answer":"答案（一句话）","analysis":"解析一句话"}'
          : '{"stem":"题干","answer":"参考答案（只写关键步骤要点，不超过120字）","analysis":"解析一句话"}';

    // 每题一个独立请求，并行发出；不使用 json_object 模式（该模式下 glm-4-flash 偶发返回非 JSON 裸文本），
    // 改为提示词约束 + 宽松解析，失败自动重试一次
    const errors = [];
    const tasks = Array.from({ length: num }, (_, i) => {
      const runOnce = (variant) => {
        const prompt = `科目：${subject.name}${sectionDesc}${kpDesc}。请命制第 ${i + 1} 道${typeName}，难度贴近广东春季高考（依学考）真题。
严格按以下 JSON 格式输出（不要输出任何其他文字、不要 markdown、不要解释）：${formatSpec}${variant ? `。${variant}` : ''}`;
        return aiChat(
          [
            { role: 'system', content: '你是广东春季高考命题专家，命制高质量试题。只输出合法 JSON，答案与解析简洁。' },
            { role: 'user', content: prompt },
          ],
          { temperature: 0.7, json: false, maxTokens: 900, model: FAST_MODEL }
        ).then((text) => {
          const parsed = safeJson(text);
          if (!parsed) {
            errors.push(`返回非JSON: ${String(text).slice(0, 100)}`);
            return null;
          }
          // 兼容数组/包裹格式/单对象
          if (Array.isArray(parsed)) return parsed[0];
          const arr = extractArray(parsed);
          if (arr) return arr[0];
          return parsed;
        });
      };
      // 先跑一次，失败（null）则换措辞重试一次
      return runOnce(null).then((r) => (r ? r : runOnce('请重新生成一道不同的题目')));
    });

    const raws = await Promise.all(tasks);
    const created = [];
    for (const raw of raws) {
      if (!raw) continue;
      const q = normalizeQuestion(raw, subject.id, section, type);
      if (!q) {
        errors.push(`解析后无效: ${JSON.stringify(raw).slice(0, 120)}`);
        continue;
      }
      // 去重：与题库已有题目题干相同的跳过（AI 并行生成易撞题）
      const dup = await prisma.question.findFirst({
        where: { subjectId: subject.id, stem: q.stem },
        select: { id: true },
      });
      if (dup) continue;
      const saved = await prisma.question.create({ data: q });
      if (kp) {
        await prisma.questionKnowledge
          .create({ data: { questionId: saved.id, knowledgePointId: kp.id } })
          .catch(() => {});
      }
      created.push(saved);
    }

    if (created.length === 0) {
      const detail = errors.length ? `请求错误：${errors.join(' | ')}` : 'AI 返回内容无法解析为有效题目';
      return res.status(502).json({ error: { message: `AI 生成失败（${detail}）`, status: 502 } });
    }
    res.json({ data: { questions: created, count: created.length } });
  } catch (error) {
    res.status(500).json({ error: { message: error.message, status: 500 } });
  }
};

// ---------- 历年真题导入（粘贴文本 → AI 解析入库 → 生成真题卷模板） ----------
export const importRealExam = async (req, res) => {
  try {
    const { subjectId, year, paperName, text } = req.body;
    const rawText = String(text || '').trim();
    if (!rawText || rawText.length < 50) {
      return res.status(400).json({ error: { message: '请粘贴完整的试卷文本（题目+答案）', status: 400 } });
    }
    const subject = await prisma.subject.findUnique({ where: { id: subjectId } });
    if (!subject) return res.status(400).json({ error: { message: '科目不存在', status: 400 } });

    const sections = SUBJECT_SECTIONS[subject.name] || [];
    const prompt = `这是${year || ''}年广东春季高考${subject.name}真题试卷文本。请逐题提取，按真实题型分区归类。
分区参考：${sections.join('、')}。
输出 JSON 数组，每题格式：{"section":"题型分区","type":"choice|fill|essay","stem":"题干","options":["A","B","C","D"]或null,"answer":"标准答案","score":本题分值(整数,无法确定给5),"analysis":"解析（可简短）"}。
选择题 options 必须有4项且 answer 为字母；填空题 answer 为答案；解答/写作题 type=essay。
答案缺失的题目跳过。只输出 JSON 数组。
试卷文本：\n${rawText.slice(0, 6000)}`;

    const text2 = await aiChat(
      [{ role: 'system', content: '你是试卷解析器，精确提取题目与答案。答案简洁，只输出 JSON。' }, { role: 'user', content: prompt }],
      { temperature: 0.2, json: true, maxTokens: 2000, model: FAST_MODEL }
    );

    const parsed = safeJson(text2);
    const arr = extractArray(parsed);
    if (!arr || arr.length === 0) {
      return res.status(502).json({ error: { message: '未能从文本中解析出题目，请确认文本包含题目与答案', status: 502 } });
    }

    const ids = [];
    const sectionsMeta = [];
    for (const raw of arr) {
      const section = String(raw?.section || '').trim() || '综合';
      const type = ['choice', 'fill', 'essay'].includes(raw?.type) ? raw.type : 'choice';
      const q = normalizeQuestion({ ...raw, section, type, source: undefined }, subject.id, section, type);
      if (!q) continue;
      q.source = 'real';
      if (year) q.year = parseInt(year) || null;
      const saved = await prisma.question.create({ data: q });
      ids.push(saved.id);
      sectionsMeta.push({
        name: section,
        type,
        count: (sectionsMeta.find((s) => s.name === section)?.count || 0) + 1,
        scorePer: Math.min(60, Math.max(1, parseInt(raw?.score) || 5)),
      });
    }
    if (ids.length === 0) {
      return res.status(502).json({ error: { message: '解析出的题目均缺少答案', status: 502 } });
    }

    const name = paperName?.trim() || `${year ? year + '年' : ''}广东春季高考${subject.name}真题`;
    const template = await prisma.examTemplate.create({
      data: {
        subjectId: subject.id,
        name,
        description: `${year || '—'}年广东春季高考${subject.name}真题（AI 解析导入，含 ${ids.length} 题）`,
        totalScore: sectionsMeta.reduce((s, x) => s + x.count * x.scorePer, 0),
        duration: subject.name === '语文' ? 120 : 90,
        config: { fixed: true, sections: sectionsMeta, fixedQuestionIds: ids },
      },
    });

    res.status(201).json({ data: { template, imported: ids.length } });
  } catch (error) {
    res.status(500).json({ error: { message: error.message, status: 500 } });
  }
};
