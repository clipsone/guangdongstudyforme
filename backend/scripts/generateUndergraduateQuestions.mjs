// AI 批量生成本科模式题目
// 用法：DATABASE_URL=<连接串> node scripts/generateUndergraduateQuestions.mjs
import { PrismaClient } from '@prisma/client';
import { chat } from '../src/services/aiProvider.js';

const CONCURRENCY = 4;
const p = new PrismaClient();

function safeJson(text) {
  let t = String(text || '').trim().replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '');
  try { return JSON.parse(t); } catch { /* noop */ }
  const m = String(text).match(/\{[\s\S]*\}/);
  if (m) { try { return JSON.parse(m[0]); } catch { /* noop */ } }
  return null;
}

const PROMPTS = {
  CET4_LISTENING: `你是大学英语四级命题专家。生成1道听力理解选择题。
要求：给出听力原文（对话或短文）和4个选项，考查细节理解。
严格按JSON输出：{"stem":"听力原文+问题","options":["A.xxx","B.xxx","C.xxx","D.xxx"],"answer":"正确字母","analysis":"解析"}`,

  CET4_READING: `你是大学英语四级命题专家。生成1道阅读理解选择题。
要求：给出一篇200词左右的短文和1道细节/主旨/推断题，4个选项。
严格按JSON输出：{"stem":"短文+问题","options":["A.xxx","B.xxx","C.xxx","D.xxx"],"answer":"正确字母","analysis":"解析"}`,

  CET6_READING: `你是大学英语六级命题专家。生成1道仔细阅读选择题。
要求：给出一篇300词左右的学术/社会类短文和1道较难的理解题，4个选项。
严格按JSON输出：{"stem":"短文+问题","options":["A.xxx","B.xxx","C.xxx","D.xxx"],"answer":"正确字母","analysis":"解析"}`,

  IELTS_WRITING: `你是雅思命题专家。生成1道雅思写作Task 2题目。
要求：给出一个讨论类/观点类议论文题目。
严格按JSON输出：{"stem":"题目","answer":"写作要点","analysis":"评分标准与范文结构建议"}`,

  LAW_CONSTITUTION: `你是法学教授。生成1道宪法学选择题。
要求：考查宪法基本知识点，4个选项。
严格按JSON输出：{"stem":"题干","options":["A.xxx","B.xxx","C.xxx","D.xxx"],"answer":"正确字母","analysis":"解析并引用法条"}`,

  LAW_CIVIL: `你是法学教授。生成1道民法学选择题。
要求：考查《民法典》知识点，4个选项。
严格按JSON输出：{"stem":"题干","options":["A.xxx","B.xxx","C.xxx","D.xxx"],"answer":"正确字母","analysis":"解析并引用法条"}`,

  MATH_CALCULUS: `你是大学数学教授。生成1道高等数学选择题。
要求：考查极限、导数或积分概念，4个选项。
严格按JSON输出：{"stem":"题干","options":["A.xxx","B.xxx","C.xxx","D.xxx"],"answer":"正确字母","analysis":"解析"}`,
};

async function genOne(promptKey, subjectId) {
  const text = await chat([
    { role: 'system', content: '你是专业命题专家，只输出合法JSON。' },
    { role: 'user', content: PROMPTS[promptKey] },
  ], { temperature: 0.8, maxTokens: 600 });

  const raw = safeJson(text);
  if (!raw || !raw.stem) throw new Error('无效输出: ' + String(text).slice(0, 80));
  if (!raw.options && raw.type !== 'essay') throw new Error('缺少选项');

  return {
    subjectId,
    type: raw.type || (promptKey.includes('LISTENING') ? 'listening' : raw.options ? 'choice' : 'essay'),
    section: raw.section || '综合',
    stem: String(raw.stem).trim(),
    options: raw.options ? raw.options.map(o => String(o).trim()) : null,
    answer: String(raw.answer || '').trim(),
    solution: { analysis: String(raw.analysis || '').trim() },
    difficulty: Math.floor(Math.random() * 3) + 2,
    source: 'ai',
  };
}

async function main() {
  console.log('🤖 开始AI生成本科模式题目...');

  // 获取科目ID
  const subjects = await p.subject.findMany({ where: { code: { in: ['CET4', 'CET6', 'IELTS', 'TOEFL', 'LAW', 'UNIV', 'PAPER'] } } });
  const subjectMap = new Map(subjects.map(s => [s.code, s.id]));
  console.log('✅ 找到科目:', subjects.map(s => `${s.code}(${s.name})`).join(', '));

  const jobs = [];
  // 每类生成10-20题
  const jobDefs = [
    ['CET4', 'CET4_LISTENING', 15],
    ['CET4', 'CET4_READING', 20],
    ['CET6', 'CET6_READING', 15],
    ['IELTS', 'IELTS_WRITING', 10],
    ['LAW', 'LAW_CONSTITUTION', 15],
    ['LAW', 'LAW_CIVIL', 15],
    ['UNIV', 'MATH_CALCULUS', 15],
  ];

  for (const [code, promptKey, count] of jobDefs) {
    const subjectId = subjectMap.get(code);
    if (!subjectId) { console.log(`⚠️ 跳过 ${code}: 科目不存在`); continue; }
    for (let i = 0; i < count; i++) jobs.push({ subjectId, promptKey });
  }

  // 并发生成
  const results = [];
  let ok = 0, fail = 0;
  for (let i = 0; i < jobs.length; i += CONCURRENCY) {
    const batch = jobs.slice(i, i + CONCURRENCY);
    const batchResults = await Promise.allSettled(
      batch.map(async ({ subjectId, promptKey }) => {
        for (let attempt = 0; attempt < 2; attempt++) {
          try {
            const q = await genOne(promptKey, subjectId);
            await p.question.create({ data: q });
            ok++;
            return q;
          } catch (e) {
            if (attempt === 1) fail++;
          }
        }
        return null;
      })
    );
    results.push(...batchResults.filter(r => r.status === 'fulfilled' && r.value));
    if ((i + batch.length) % 20 === 0) {
      console.log(`  进度: ${Math.min(i + batch.length, jobs.length)}/${jobs.length}, 成功=${ok}, 失败=${fail}`);
    }
  }

  console.log(`\n✅ 生成完成: 成功 ${ok} 题, 失败 ${fail} 题`);
  console.log(`📊 各科统计:`);
  for (const [code] of jobDefs) {
    const count = results.filter(r => r.subjectId === subjectMap.get(code)).length;
    console.log(`  ${code}: ${count} 题`);
  }

  await p.$disconnect();
}

main().catch(e => { console.error('❌', e.message); process.exit(1); });
