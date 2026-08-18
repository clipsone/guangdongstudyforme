// AI 题库增强：AI 出题（扩充题库）+ 历年真题导入（解析粘贴文本入库）
import prisma from '../utils/prisma.js';
import { chat as aiChat, isConfigured, safeJson, extractArray, fastModel } from '../services/aiProvider.js';

// 各科真实试卷题型分区（广东春季高考·依学考，供 AI 出题/解析参考）
const SUBJECT_SECTIONS = {
  语文: ['现代文阅读', '文言文阅读', '古代诗歌鉴赏', '名句名篇默写', '语言文字运用', '写作'],
  数学: ['单选题', '填空题', '解答题'],
  英语: ['单项选择', '完形填空', '阅读理解', '语法填空', '书面表达'],
};

// ---------- 数学公式清洗：把 AI 输出的 LaTeX/花括号写法转成人类可读 ----------
const SUP_MAP = { 0: '⁰', 1: '¹', 2: '²', 3: '³', 4: '⁴', 5: '⁵', 6: '⁶', 7: '⁷', 8: '⁸', 9: '⁹', '+': '⁺', '-': '⁻', '=': '⁼', '(': '⁽', ')': '⁾', n: 'ⁿ', i: 'ⁱ' };
const SUB_MAP = { 0: '₀', 1: '₁', 2: '₂', 3: '₃', 4: '₄', 5: '₅', 6: '₆', 7: '₇', 8: '₈', 9: '₉', '+': '₊', '-': '₋', '=': '₌', '(': '₍', ')': '₎', n: 'ₙ', m: 'ₘ', k: 'ₖ', i: 'ᵢ', j: 'ⱼ', x: 'ₓ', a: 'ₐ', e: 'ₑ', o: 'ₒ', r: 'ᵣ', t: 'ₜ', u: 'ᵤ', v: 'ᵥ' };
const toUni = (s, map) => s.split('').map((c) => map[c] || c).join('');

export function normalizeMathText(text) {
  if (!text) return text;
  let s = String(text);
  // 1) LaTeX 命令 → 可读符号
  const cmds = [
    [/\\frac\{([^{}]*)\}\{([^{}]*)\}/g, (m, a, b) => `(${a})/(${b})`],
    [/\\dfrac\{([^{}]*)\}\{([^{}]*)\}/g, (m, a, b) => `(${a})/(${b})`],
    [/\\sqrt(\[([^\]]*)\])?\{([^{}]*)\}/g, (m, _, idx, rad) => (idx ? `${idx}√(${rad})` : `√(${rad})`)],
    [/\\pi/g, 'π'],
    [/\\cdot/g, '·'],
    [/\\times/g, '×'],
    [/\\pm/g, '±'],
    [/\\le/g, '≤'],
    [/\\ge/g, '≥'],
    [/\\ne/g, '≠'],
    [/\\left\(/g, '('],
    [/\\right\)/g, ')'],
    [/\\left\[/g, '['],
    [/\\right\]/g, ']'],
    [/\\,/g, ''],
    [/\\ /g, ''],
  ];
  for (const [re, rep] of cmds) s = s.replace(re, rep);
  // 2) 花括号角标：^{...} / _{...} / {x}（如 {a_n} 会先被 _ 规则处理）
  s = s.replace(/\^\{([^{}]*)\}/g, (m, inner) => toUni(inner.replace(/_([0-9n])/g, (mm, c) => SUB_MAP[c] || c), SUP_MAP));
  s = s.replace(/_\{([^{}]*)\}/g, (m, inner) => toUni(inner, SUB_MAP));
  s = s.replace(/\{([^{}]+)\}/g, (m, inner) => {
    // 内部无 ^_ 的纯花括号包裹（如 {aₙ}）直接去括号；有角标的先不处理
    return inner.includes('^') || inner.includes('_') ? m : inner;
  });
  // 3) 单个字符角标：x^2 / a_n（只吃单个数字或字母，避免吞掉后面的负号）
  s = s.replace(/\^([0-9n])(?![0-9])/g, (m, c) => SUP_MAP[c] || c);
  s = s.replace(/_([0-9n])(?![0-9])/g, (m, c) => SUB_MAP[c] || c);
  // 4) 清理：去 $ 包裹符与多余空格（$ 在数学题中无其他含义）
  s = s.replace(/\$/g, '');
  s = s.replace(/\s{2,}/g, ' ');
  return s;
}

// 归一化单题
function normalizeQuestion(raw, subjectId, fallbackSection, fallbackType, subjectName) {
  let stem = String(raw?.stem || '').trim();
  if (!stem) return null;
  let type = String(raw?.type || fallbackType || 'choice').toLowerCase();
  if (!['choice', 'fill', 'essay'].includes(type)) type = 'choice';
  const section = String(raw?.section || fallbackSection || '').trim() || null;
  let options = Array.isArray(raw?.options) ? raw.options.map((o) => String(o).trim()) : null;
  let answer = String(raw?.answer ?? '').trim();

  // 数学科目：清洗公式写法为人类可读（LaTeX/花括号角标 → Unicode）
  if (subjectName === '数学') {
    stem = normalizeMathText(stem);
    if (options) options = options.map((o) => normalizeMathText(o));
    answer = normalizeMathText(answer);
    if (raw.analysis) raw.analysis = normalizeMathText(raw.analysis);
  }
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
const FAST_MODEL = fastModel;

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
    const mathStyleRule = subject.name === '数学'
      ? '。数学公式一律用人类可读纯文本书写，禁止 LaTeX 命令（\frac、\sqrt、\\、^、_、{}）。写法：分数写"1/2"或"(a)/(b)"，根号写"√3"、"√(x+1)"，幂写"x²"、"x³"，下标写"aₙ"、"Sₙ"，π 用"π"，乘号用"×"。'
      : '';
    const errors = [];
    const tasks = Array.from({ length: num }, (_, i) => {
      const runOnce = (variant) => {
        const prompt = `科目：${subject.name}${sectionDesc}${kpDesc}。请命制第 ${i + 1} 道${typeName}，难度贴近广东春季高考（依学考）真题。${mathStyleRule}
严格按以下 JSON 格式输出（不要输出任何其他文字、不要 markdown、不要解释）：${formatSpec}${variant ? `。${variant}` : ''}`;
        return aiChat(
          [
            { role: 'system', content: '你是广东春季高考命题专家，命制高质量试题。只输出合法 JSON，答案与解析简洁。' },
            { role: 'user', content: prompt },
          ],
          { temperature: 0.7, json: false, maxTokens: 900, model: FAST_MODEL() }
        ).then((text) => {
          const parsed = safeJson(text);
          if (!parsed) {
            errors.push(`返回非JSON: ${String(text).slice(0, 100)}`);
            return null;
          }
          // 兼容数组/包裹格式/单对象。
          // 注意：题目对象含 options 数组，不能对其用 extractArray（会把 options 误当题目解包），
          // 只有 parsed 本身不是题目对象时才尝试解包。
          if (Array.isArray(parsed)) return parsed[0];
          if (parsed && typeof parsed === 'object' && parsed.stem) return parsed;
          const arr = extractArray(parsed);
          if (arr && arr.length) return arr[0];
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
      const q = normalizeQuestion(raw, subject.id, section, type, subject.name);
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
      { temperature: 0.2, json: true, maxTokens: 2000, model: FAST_MODEL() }
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
      const q = normalizeQuestion({ ...raw, section, type, source: undefined }, subject.id, section, type, subject.name);
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
