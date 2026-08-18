// 语文/英语题库批量补充：按广东春季高考（依学考）真实卷分区
// 用法：node --env-file=.env scripts/bulk_gen_more.mjs 语文|英语
import { PrismaClient } from '@prisma/client';
import { chat } from '../src/services/aiProvider.js';
import { normalizeMathText } from '../src/controllers/aiQuestionController.js';

const SUBJECT_NAME = process.argv[2] || '语文';
const VARIANT = process.argv[3] || ''; // 变体提示（防雷同）
const CONCURRENCY = 6;

const p = new PrismaClient();

function buildPrompt(subject, section, type, kpName, style) {
  const typeName = type === 'choice' ? '单项选择题（4个选项）' : type === 'fill' ? '填空题' : '解答题';
  const formatSpec =
    type === 'choice'
      ? '{"section":"{SECTION}","stem":"题干","options":["A.选项","B.选项","C.选项","D.选项"],"answer":"正确选项字母(A/B/C/D)","analysis":"解析一句话"}'
      : type === 'fill'
        ? '{"section":"{SECTION}","stem":"题干（用____表示填空处）","answer":"答案（简洁）","analysis":"解析一句话"}'
        : '{"section":"{SECTION}","stem":"题干","answer":"参考答案（要点，不超过150字）","analysis":"解析一句话"}';
  return `你是广东春季高考（依学考）${subject === '语文' ? '语文' : '英语'}命题专家。命制一道${typeName}，属于「${section}」分区，考查「${kpName}」，难度与题风严格贴近 2023-2026 年广东春季高考（依学考）真题（150分制）。
${style || ''}
${VARIANT}
严禁使用真题原题；内容与情境要自然合理，不得与常见教辅模板雷同。
严格按以下 JSON 格式输出（不要输出任何其他文字、不要 markdown、不要解释）：
${formatSpec.replace('{SECTION}', section)}`;
}

// ---------- 语文任务 ----------
const YW = [];
const ywChoice = (sec, kp, style, n) => YW.push({ section: sec, type: 'choice', kpName: kp, kp, style, count: n });
const ywFill = (sec, kp, style, n) => YW.push({ section: sec, type: 'fill', kpName: kp, kp, style, count: n });
const ywEssay = (sec, kp, style, n) => YW.push({ section: sec, type: 'essay', kpName: kp, kp, style, count: n });

ywChoice('基础知识与运用', '字音字形', '考查字音或字形辨析（选出读音/字形全部正确或错误的一项），选项为四组词语。', 6);
ywChoice('基础知识与运用', '正确使用标点符号', '判断句子中标点符号使用是否正确的题目，给出四个标点用法选项。', 3);
ywChoice('基础知识与运用', '正确使用成语', '选出成语使用恰当（或不恰当）的一项，四个句子各含一个成语。', 4);
ywChoice('基础知识与运用', '辨析并修改病句', '选出没有语病（或语病类型判断正确）的一项，四个句子。', 4);
ywChoice('基础知识与运用', '语言表达简明连贯得体', '语境衔接排序/表达得体判断题（如特定场合用词、句子排序）。', 3);
ywFill('名句名篇默写', '背诵和默写常见古诗文名句', '给出上句或下句，补写出空缺名句（新课标必背篇目范围：劝学、师说、赤壁赋、短歌行、归园田居、梦游天姥吟留别、登高、琵琶行、念奴娇·赤壁怀古、永遇乐·京口北固亭怀古、沁园春·长沙等），一题一空。', 15);
ywEssay('文言文翻译', '理解并翻译文中的句子', '给出一段课外文言文（含句读），要求翻译画线句子（2小句），考查实词虚词句式。文段 60-90 字，附注释。', 6);
ywFill('文言文理解填空', '理解文言实词的含义', '给出一段课外文言文（60-80字），根据文意概括回答（用原文词句或自己的话），一题一问。', 6);
ywEssay('诗歌鉴赏·手法', '鉴赏古代诗歌的表达技巧', '给出一首古诗（唐诗宋词），指出并赏析其运用的表达技巧/表现手法/修辞，结合作品分析。', 6);
ywEssay('诗歌鉴赏·意境情感', '评价古代诗歌的思想内容', '给出一首古诗，分析其意境特点与所表达的思想感情，结合诗句具体分析。', 6);
ywChoice('现代文阅读·论述类', '理解重要概念和句子含义', '给出一段论述类文本（科学/社科类，150-250字），据此回答一道选择题。', 10);
ywEssay('现代文阅读·论述类主观题', '归纳内容要点，概括中心思想', '给出一段论述类文本（200-300字），要求概括中心论点/分析论证过程/组织语言作答，一题一问。', 6);
ywChoice('现代文阅读·文学类', '分析小说的情节结构', '给出一段文学类文本（小说/散文节选，150-250字），据此回答一道选择题。', 10);
ywEssay('现代文阅读·文学类赏析', '鉴赏小说的艺术手法', '给出一段文学类文本（小说/散文节选，200-300字），赏析划线句子的表达效果（手法+内容+效果）。', 6);
ywEssay('写作', '材料作文（议论文）', '给出材料作文题（社会现象/名言/漫画类材料），要求写议论文。答案给出审题立意角度（关键词、中心论点、可写分论点），不超过150字。', 6);

// ---------- 英语任务 ----------
const EN = [];
const enChoice = (sec, kp, style, n) => EN.push({ section: sec, type: 'choice', kpName: kp, kp, style, count: n });
const enFill = (sec, kp, style, n) => EN.push({ section: sec, type: 'fill', kpName: kp, kp, style, count: n });
const enEssay = (sec, kp, style, n) => EN.push({ section: sec, type: 'essay', kpName: kp, kp, style, count: n });

enChoice('情景交际', '日常交际用语', '情景对话选择题：给出对话语境（2-3句），选择最恰当的应答句（问候/致谢/道歉/请求/建议/购物/问路/打电话等）。', 15);
enChoice('阅读理解·第一节', '理解具体信息', '给出一篇英语短文（记叙文/说明文/应用文，100-180词）及一道单选题（细节理解），选项为英文。', 20);
enFill('阅读理解·第二节', '理解文章结构和逻辑关系', '五选五题：给出一篇短文（150-220词）其中挖去一句，下方给5个英文选项句（含1干扰项），选出最佳填入句。', 10);
enChoice('完形填空', '词汇辨析与上下文逻辑', '完形填空题：给出一句或两句英文语境（含挖空），选择最恰当的选项词（词汇辨析/固定搭配/逻辑衔接），选项为英文单词。', 20);
enFill('语法填空', '语法结构运用', '语法填空题：给出一句或两句英文（含挖空处），填写所给词的正确形式或合适的词（时态/非谓语/词类转换/冠词/介词/连词），一题一空。', 15);
enEssay('书面表达', '应用文写作', '应用文写作题：假定你是李华，根据提示要点写一封英文书信/邮件/通知/倡议书（词数80左右）。答案给出写作要点提纲（开头、正文要点、结尾），不超过150字。', 8);

const TASKS = SUBJECT_NAME === '语文' ? YW : EN;

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

function safeJson(text) {
  try { return JSON.parse(text); } catch { /* noop */ }
  const m = String(text).match(/\{[\s\S]*\}/);
  if (m) {
    try { return JSON.parse(m[0]); } catch { /* noop */ }
  }
  return null;
}

async function genOne(task, subjectId) {
  const prompt = buildPrompt(SUBJECT_NAME, task.section, task.type, task.kpName, task.style);
  const text = await chat(
    [
      { role: 'system', content: `你是广东春季高考（依学考）${SUBJECT_NAME === '语文' ? '语文' : '英语'}命题专家，命制高质量真题风格试题。只输出合法 JSON。` },
      { role: 'user', content: prompt },
    ],
    { temperature: 0.85, json: false, maxTokens: 1100 }
  );
  const raw = safeJson(text);
  if (!raw) throw new Error('非JSON: ' + String(text).slice(0, 100));
  const stem = String(raw.stem || '').trim();
  if (!stem) throw new Error('空题干');
  const answer = String(raw.answer || '').trim();
  let options = null;
  let finalAnswer = answer;
  if (task.type === 'choice') {
    options = (Array.isArray(raw.options) ? raw.options : []).map((o) => String(o).trim()).filter(Boolean);
    if (options.length < 4) throw new Error('选项不足');
    const m = String(raw.answer || '').match(/[A-D]/);
    finalAnswer = m ? m[0].toUpperCase() : 'A';
  }
  return {
    subjectId,
    type: task.type,
    section: task.section,
    stem,
    options,
    answer: finalAnswer,
    solution: { analysis: String(raw.analysis || '').trim() },
    difficulty: task.type === 'essay' ? 4 : 3,
    source: 'ai',
  };
}

const subj = await p.subject.findUnique({ where: { name: SUBJECT_NAME } });
const kps = await p.knowledgePoint.findMany({ where: { chapter: { subjectId: subj.id }, level: 2 } });

// 分区→考点映射（语文用区名近似匹配考点；英语用区名映射）
const sectionToKps = {};
for (const t of TASKS) {
  if (!sectionToKps[t.section]) sectionToKps[t.section] = [];
}
// 简化：按任务 kpName 关键词匹配考点
const jobs = [];
for (const t of TASKS) {
  const matched = kps.filter((k) => k.name.includes(t.kpName.slice(0, 4)) || t.kpName.includes(k.name.slice(0, 4)) || t.kpName.includes(k.name.slice(0, 6)));
  const kpIds = matched.length > 0 ? matched.map((k) => k.id).slice(0, 2) : [];
  for (let i = 0; i < t.count; i++) {
    jobs.push({ ...t, subjectId: subj.id, kpIds });
  }
}
console.log(`🚀 ${SUBJECT_NAME}补题任务：${jobs.length} 道（choice ${jobs.filter((j) => j.type === 'choice').length} / fill ${jobs.filter((j) => j.type === 'fill').length} / essay ${jobs.filter((j) => j.type === 'essay').length}），并发 ${CONCURRENCY}`);

let ok = 0, fail = 0;
const t0 = Date.now();
await pool(jobs, async (job) => {
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const q = await genOne(job, subj.id);
      const data = { ...q };
      if (job.kpIds.length > 0) {
        data.questionKnowledge = { create: job.kpIds.map((kid) => ({ knowledgePointId: kid })) };
      }
      await p.question.create({ data });
      ok++;
      if (ok % 10 === 0 || ok === jobs.length) {
        console.log(`  [${((Date.now() - t0) / 1000).toFixed(0)}s] ${SUBJECT_NAME} 已生成 ${ok}/${jobs.length}（失败 ${fail}）`);
      }
      return;
    } catch (e) {
      if (attempt === 1) {
        fail++;
        console.log(`  ❌ ${job.section} ${job.kpName}: ${String(e.message || e).slice(0, 70)}`);
      }
    }
  }
}, CONCURRENCY);

console.log(`\n✅ ${SUBJECT_NAME}补题完成：成功 ${ok}，失败 ${fail}，耗时 ${((Date.now() - t0) / 1000).toFixed(0)}s`);
console.log(`📊 ${SUBJECT_NAME}题库总量：${await p.question.count({ where: { subjectId: subj.id } })} 题`);
await p.$disconnect();
