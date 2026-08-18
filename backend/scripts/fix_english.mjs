// 英语题库修复：归档坏题 + 生成真五选五/带提示语法填空/正常完形
import { PrismaClient } from '@prisma/client';
import { chat } from '../src/services/aiProvider.js';

const CONCURRENCY = 6;
const p = new PrismaClient();

function safeJson(text) {
  let t = String(text || '').trim().replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '');
  try { return JSON.parse(t); } catch { /* noop */ }
  const m = String(text).match(/\{[\s\S]*\}/);
  if (m) { try { return JSON.parse(m[0]); } catch { /* noop */ } }
  return null;
}

async function pool(items, worker, size) {
  const results = new Array(items.length);
  let idx = 0;
  async function run() {
    while (idx < items.length) {
      const i = idx++;
      results[i] = await worker(items[i], i);
    }
  }
  await Promise.all(Array.from({ length: Math.min(size, items.length) }, run));
  return results;
}

const PROMPTS = {
  sec2: `你是广东春季高考（依学考）英语命题专家。命制一道「阅读理解·第二节」（七选五/五选五）题目。
要求：写一篇英文短文（150-220词，记叙文/说明文），从中间挖去一句话，用____标记。
同时给出 5 个英文候选句（选项句），其中 4 个是干扰句、1 个是正确填入句；所有候选句都要与短文话题相关、长度相近，干扰句与正确句在逻辑上高度相近但不可填入。
严格按以下 JSON 输出（不要输出任何其他文字）：
{"section":"阅读理解·第二节","stem":"（短文全文，挖空处用____标记）","options":["A.候选句","B.候选句","C.候选句","D.候选句","E.候选句"],"answer":"正确候选句对应的字母","analysis":"解析：为什么该句正确"}。注意：短文里不能出现选项句本身。`,

  grammar: `你是广东春季高考（依学考）英语命题专家。命制一道「语法填空」小题。
要求：给出 1-2 句英文（40-80词），其中一个空需要填写。题目必须包含提示词：在空格后用括号给出需要变形/选择的单词（如 "The movie was very ____ (excite)"，答案 excited；或 "She ____ (go) to school every day"，答案 goes；也可给 "____ (冠词/介词/连词)" 无提示虚词空）。
考查：动词时态/语态/非谓语、词类转换、代词、冠词、介词、连词、从句引导词等，贴近广东学考语法填空。
严格按以下 JSON 输出（不要输出任何其他文字）：
{"section":"语法填空","stem":"（英文句子，空格用____，提示词用（单词）形式跟在空格后）","answer":"正确答案（简洁，如 goes / excited / a）","analysis":"解析一句话"}。`,

  cloze: `你是广东春季高考（依学考）英语命题专家。命制一道「完形填空」小题（短语境选项题）。
要求：给出 2-4 句英文语境（含上下文线索），其中一个空需要选择单词，考查词汇辨析/固定搭配/上下文逻辑。
严格按以下 JSON 输出（不要输出任何其他文字）：
{"section":"完形填空","stem":"（英文语境，空格用____）","options":["A.单词","B.单词","C.单词","D.单词"],"answer":"正确选项字母","analysis":"解析一句话"}。`,
};

async function genOne(kind, subjectId) {
  const text = await chat(
    [
      { role: 'system', content: '你是广东春季高考（依学考）英语命题专家，命制高质量真题风格试题。只输出合法 JSON。' },
      { role: 'user', content: PROMPTS[kind] },
    ],
    { temperature: 0.9, json: false, maxTokens: 900 }
  );
  const raw = safeJson(text);
  if (!raw) throw new Error('非JSON: ' + String(text).slice(0, 80));
  const stem = String(raw.stem || '').trim();
  if (!stem) throw new Error('空题干');
  const section = String(raw.section || '');
  let answer = String(raw.answer || '').trim();
  let options = null;
  if (kind === 'sec2') {
    options = (Array.isArray(raw.options) ? raw.options : []).map((o) => String(o).trim()).filter(Boolean);
    if (options.length < 5) throw new Error('五选五选项不足: ' + options.length);
    const m = answer.match(/[A-E]/);
    if (m) answer = m[0].toUpperCase();
    else throw new Error('五选五答案非字母');
  } else if (kind === 'cloze') {
    options = (Array.isArray(raw.options) ? raw.options : []).map((o) => String(o).trim()).filter(Boolean);
    if (options.length < 4) throw new Error('完形选项不足');
    const m = answer.match(/[A-D]/);
    if (m) answer = m[0].toUpperCase();
    else throw new Error('完形答案非字母');
  }
  return {
    subjectId,
    type: kind === 'sec2' ? 'fill' : kind === 'grammar' ? 'fill' : 'choice',
    section,
    stem,
    options,
    answer,
    solution: { analysis: String(raw.analysis || '').trim() },
    difficulty: 3,
    source: 'ai',
  };
}

// 1) 归档坏题
const subj = await p.subject.findUnique({ where: { name: '英语' } });
const [allGram, allCloze, allSec2] = await Promise.all([
  p.question.findMany({ where: { subjectId: subj.id, section: '语法填空' }, select: { id: true, answer: true, stem: true } }),
  p.question.findMany({ where: { subjectId: subj.id, section: '完形填空' }, select: { id: true, answer: true, options: true } }),
  p.question.findMany({ where: { subjectId: subj.id, section: '阅读理解·第二节' }, select: { id: true, options: true } }),
]);
const archGram = allGram.filter(q => /^[A-D]( [A-D])+/.test(String(q.answer).trim()) || !/[（(]/.test(String(q.stem))).map(q => q.id);
const archCloze = allCloze.filter(q => !/^[A-D]$/.test(String(q.answer).trim()) || !q.options || q.options.length < 4).map(q => q.id);
const archSec2 = allSec2.filter(q => !q.options || q.options.length === 0).map(q => q.id);
const allArch = [...new Set([...archGram, ...archCloze, ...archSec2])];
const r = await p.question.updateMany({ where: { id: { in: allArch } }, data: { status: 'archived' } });
console.log(`📦 归档坏题: 语法填空 ${archGram.length} + 完形填空 ${archCloze.length} + 五选五 ${archSec2.length} = ${r.count} 道`);

// 2) 生成新题
const targets = { sec2: 45, grammar: 35, cloze: 25 };
const jobs = [];
for (const [kind, n] of Object.entries(targets)) {
  for (let i = 0; i < n; i++) jobs.push(kind);
}
let ok = 0, fail = 0;
const t0 = Date.now();
const results = await pool(jobs, async (kind) => {
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const q = await genOne(kind, subj.id);
      await p.question.create({ data: q });
      ok++;
      if (ok % 15 === 0) console.log(`  [${((Date.now() - t0) / 1000).toFixed(0)}s] 已生成 ${ok}/${jobs.length}`);
      return;
    } catch (e) {
      if (attempt === 1) { fail++; console.log(`  ❌ ${kind}: ${String(e.message || e).slice(0, 60)}`); }
    }
  }
}, CONCURRENCY);
console.log(`\n✅ 英语修复完成: 新增 ${ok} 道(失败 ${fail}), 耗时 ${((Date.now() - t0) / 1000).toFixed(0)}s`);
const g = await p.question.groupBy({ by: ['section'], where: { subjectId: subj.id, status: 'active' }, _count: { _all: true } });
for (const x of g) console.log(' ', x.section, x._count._all);
await p.$disconnect();
