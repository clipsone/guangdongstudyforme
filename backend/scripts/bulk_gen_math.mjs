// 数学题库批量补充：按广东春季高考（依学考）真实考向生成
// 解答题：解三角形/三角函数/统计概率/立体几何/函数导数（新考纲考向）
// 填空/选择：复数/逻辑/向量/百分位数/圆锥曲线等考点均衡补充
// 用法：node --env-file=.env scripts/bulk_gen_math.mjs [batchCount]
import { PrismaClient } from '@prisma/client';
import { chat } from '../src/services/aiProvider.js';
import { normalizeMathText } from '../src/controllers/aiQuestionController.js';

const BATCH = parseInt(process.argv[2] || '1'); // 每考点每批几道
const VARIANT = process.argv[3] || ''; // 变体提示（防雷同）
const CONCURRENCY = 8;

const p = new PrismaClient();

// ---------- 数学格式要求（禁止 LaTeX，人类可读） ----------
const MATH_RULE =
  '数学公式一律用人类可读纯文本书写，禁止 LaTeX 命令（\\frac、\\sqrt、^、_、{}）。写法：分数写"1/2"或"(a)/(b)"，根号写"√3"、"√(x+1)"，幂写"x²"、"x³"，下标写"aₙ"、"Sₙ"，π 用"π"，乘号用"×"。';

function buildPrompt(section, type, kpName, style) {
  const typeName = type === 'choice' ? '单项选择题（4个选项）' : type === 'fill' ? '填空题' : '解答题';
  const formatSpec =
    type === 'choice'
      ? '{"section":"{SECTION}","stem":"题干","options":["A.选项","B.选项","C.选项","D.选项"],"answer":"正确选项字母(A/B/C/D)","analysis":"解析一句话"}'
      : type === 'fill'
        ? '{"section":"{SECTION}","stem":"题干（用____表示填空处）","answer":"答案（简洁，含必要过程）","analysis":"解析一句话"}'
        : '{"section":"{SECTION}","stem":"题干（含(1)(2)两个小问）","answer":"参考答案（只写关键步骤要点，不超过150字）","analysis":"解析一句话"}';
  return `你是广东春季高考（依学考）数学命题专家。命制一道${typeName}，属于「${section}」分区，考查「${kpName}」，难度与题风严格贴近 2023-2026 年广东春季高考数学真题（学考录取，150分制）。
${style || ''}
${VARIANT}
${MATH_RULE}
严禁使用真题原题或常见教辅模板题；数据与情境要自然合理，不得与现有题目雷同。
严格按以下 JSON 格式输出（不要输出任何其他文字、不要 markdown、不要解释）：
${formatSpec.replace('{SECTION}', section)}`;
}

// ---------- 任务定义 ----------
const TASKS = [];

// 解答题（19-21题）10分题：真实考向 6 大块
const ESSAY_19 = [
  ['解三角形', 'M5-7', '正弦定理与余弦定理在解三角形中的应用（如测量距离/高度、求边求角求面积）', '题目给出三角形部分边角条件，第(1)问用正余弦定理求边或角，第(2)问求面积或进一步证明。情境真实（测量/航海/几何图形）。'],
  ['解三角形', 'M5-8', '解三角形的实际应用（仰角俯角、方位角、测量问题）', '实际应用题：测量山高/河宽/距离等，需建模型后用正弦余弦定理求解，两小问递进。'],
  ['三角函数', 'M5-5', '三角恒等变换与三角函数性质（周期、最值、单调区间）', '给出 f(x)=A·sin(ωx+φ)+B 或需先化简的函数式，第(1)问求最小正周期/最值，第(2)问求单调区间或给定条件下的值。'],
  ['三角函数', 'M5-6', '二倍角公式与三角函数的综合应用', '用二倍角/辅助角公式化简求值，求函数性质或解三角方程，两小问递进。'],
  ['统计与概率', 'M10-2', '用样本估计总体（平均数、方差、频率分布直方图）', '给出样本数据或频率分布直方图，第(1)问求平均数/方差/众数中位数，第(2)问估计总体或比较稳定性。'],
  ['统计与概率', 'M10-5', '随机事件与古典概型', '摸球/掷骰子/产品检验等古典概型，第(1)问求基本事件数或某事件概率，第(2)问条件概率或互斥事件概率。'],
  ['统计与概率', 'M10-6', '古典概型与统计综合', '统计与概率结合：从表格/频数数据中求概率，第(2)问分析期望或建议。'],
  ['立体几何', 'M7-4', '直线、平面平行的判定与性质', '给出空间几何体（棱柱/棱锥），第(1)问证明线面平行或线线平行，第(2)问求体积或线面角。'],
  ['立体几何', 'M7-5', '直线、平面垂直的判定与性质', '几何体中线面垂直/面面垂直证明，第(2)问求二面角或几何体体积。'],
  ['立体几何', 'M7-2', '空间几何体的表面积与体积', '求棱柱/棱锥/圆柱/圆锥的表面积体积，可能与垂直关系证明结合。'],
  ['函数应用', 'M3-2', '函数的单调性与最值（实际应用）', '函数模型应用题（利润/成本/面积最值等），第(1)问建立函数关系，第(2)问求最值。'],
  ['函数应用', 'M4-3', '利用导数研究函数的单调性', '含参函数求导判断单调区间，讨论参数取值，两小问递进。'],
];
for (const [name, code, kp, style] of ESSAY_19) {
  TASKS.push({ section: '解答题（19-21题）', type: 'essay', code, kpName: name, kp, style, count: BATCH });
}

// 解答题（22题）12分综合题
const ESSAY_22 = [
  ['函数与导数综合', 'M4-4', '利用导数研究函数的极值与最值（含参数讨论）', '含参函数综合题：求单调区间、极值最值，讨论参数使条件成立，3 小问递进，符合压轴难度。'],
  ['解三角形综合', 'M5-8', '解三角形与三角函数综合', '三角与解三角形综合：化简求角、正余弦定理求边、面积最值（可用基本不等式），综合性强。'],
  ['立体几何综合', 'M7-5', '立体几何综合（线面关系+二面角）', '空间几何体综合：证明垂直/平行关系，求二面角（2025 真题考过二面角），空间想象要求高。'],
  ['概率统计综合', 'M10-6', '统计概率综合应用题', '生活情境统计概率综合（质检/抽样/决策），第(1)问求频率分布或概率，第(2)问分析推断或决策建议。'],
];
for (const [name, code, kp, style] of ESSAY_22) {
  TASKS.push({ section: '解答题（22题）', type: 'essay', code, kpName: name, kp, style, count: BATCH * 2 });
}

// 填空题 6 分题
const FILLS = [
  ['复数', 'M2-1', '复数的概念与运算', '复数的实部虚部、共轭复数、四则运算求值，1-2 空简洁计算。'],
  ['复数', 'M2-4', '复数的模与共轭复数', '求复数模、共轭复数运算。'],
  ['常用逻辑', 'M1-3', '充分条件与必要条件', '判断充分必要条件，或求参数范围使条件成立。'],
  ['平面向量', 'M6-3', '向量的数量积', '已知向量坐标求数量积、模、夹角或垂直条件。'],
  ['平面向量', 'M6-4', '向量的应用', '向量在几何/物理中的应用：求投影、共线、夹角。'],
  ['统计', 'M10-4', '百分位数', '给出一组数据求第 p 百分位数（新考纲考点）。'],
  ['统计', 'M10-2', '平均数与方差', '求一组数据的平均数方差，或根据方差比较稳定性。'],
  ['圆锥曲线', 'M9-1', '椭圆的定义与标准方程', '根据条件求椭圆标准方程（焦点、离心率、长轴短轴）。'],
  ['圆锥曲线', 'M9-5', '抛物线的定义与标准方程', '求抛物线方程、焦点准线、弦长。'],
  ['三角函数', 'M5-6', '二倍角公式求值', '用二倍角/和差公式化简求值。'],
  ['函数', 'M3-2', '函数性质（奇偶性单调性）求值', '利用函数奇偶性/单调性求值或解不等式。'],
  ['立体几何', 'M7-2', '几何体体积或表面积', '求棱锥/圆柱/圆锥体积或表面积（含三视图或展开图）。'],
  ['立体几何', 'M7-4', '空间位置关系', '判断线线/线面/面面位置关系，求截面或距离。'],
  ['导数', 'M4-1', '导数的几何意义（切线）', '求曲线在某点处切线方程，或已知切线求参数。'],
];
for (const [name, code, kp, style] of FILLS) {
  TASKS.push({ section: '填空题', type: 'fill', code, kpName: name, kp, style, count: Math.ceil(BATCH * 1.5) });
}

// 选择题 6 分题
const CHOICES = [
  ['圆锥曲线', 'M9-1', '椭圆的性质', '椭圆定义/标准方程/离心率/焦点相关选择。'],
  ['圆锥曲线', 'M9-3', '双曲线的性质', '双曲线定义/渐近线/离心率相关选择。'],
  ['圆锥曲线', 'M9-5', '抛物线的性质', '抛物线焦点准线/焦点弦相关选择。'],
  ['平面向量', 'M6-2', '向量的线性运算', '向量加减/数乘/共线条件，坐标运算。'],
  ['平面向量', 'M6-3', '向量的数量积', '数量积/夹角/模/垂直平行条件。'],
  ['复数', 'M2-2', '复数的四则运算', '复数加减乘除、i 的幂。'],
  ['立体几何', 'M7-3', '空间位置关系判断', '线线/线面/面面位置关系的命题判断（真命题选择）。'],
  ['立体几何', 'M7-2', '几何体体积', '体积/表面积计算，含三视图。'],
  ['概率', 'M10-6', '古典概型', '等可能事件概率计算。'],
  ['统计', 'M10-2', '平均数/方差/中位数', '数据集中趋势与离散程度。'],
  ['三角函数', 'M5-3', '同角三角函数关系', 'sin²+cos²=1、tan 定义求值。'],
  ['函数', 'M3-3', '函数奇偶性', '奇偶函数判断与性质。'],
  ['集合逻辑', 'M1-1', '集合运算', '交集并集补集运算。'],
  ['集合逻辑', 'M1-3', '充分必要条件', '命题充要条件判断。'],
];
for (const [name, code, kp, style] of CHOICES) {
  TASKS.push({ section: '选择题', type: 'choice', code, kpName: name, kp, style, count: Math.ceil(BATCH * 2) });
}

// ---------- 并发池 ----------
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

// ---------- 解析 ----------
function safeJson(text) {
  let t = String(text || '').trim().replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '');
  try { return JSON.parse(t); } catch { /* noop */ }
  const m = String(text).match(/\{[\s\S]*\}/);
  if (m) {
    try { return JSON.parse(m[0]); } catch { /* noop */ }
  }
  return null;
}

async function genOne(task, attempt = 0) {
  const prompt = buildPrompt(task.section, task.type, task.kpName, task.style);
  const text = await chat(
    [
      { role: 'system', content: '你是广东春季高考（依学考）数学命题专家，命制高质量真题风格试题。只输出合法 JSON，答案与解析简洁。' },
      { role: 'user', content: prompt },
    ],
    { temperature: 0.85, json: false, maxTokens: 1000 }
  );
  const raw = safeJson(text);
  if (!raw) throw new Error('非JSON: ' + String(text).slice(0, 120));
  const stem = normalizeMathText(String(raw.stem || '').trim());
  if (!stem) throw new Error('空题干');
  const answer = normalizeMathText(String(raw.answer || '').trim());
  let options = null;
  let finalAnswer = answer;
  if (task.type === 'choice') {
    options = (Array.isArray(raw.options) ? raw.options : []).map((o) => normalizeMathText(String(o).trim())).filter(Boolean);
    if (options.length < 4) throw new Error('选项不足');
    const a = String(raw.answer || '').trim().toUpperCase();
    const m = a.match(/[A-D]/);
    finalAnswer = m ? m[0] : (options.findIndex((o) => o === a) >= 0 ? String.fromCharCode(65 + options.findIndex((o) => o === a)) : 'A');
  }
  return {
    subjectId: task.subjectId,
    type: task.type,
    section: task.section,
    stem,
    options,
    answer: finalAnswer,
    solution: { analysis: normalizeMathText(String(raw.analysis || '').trim()) },
    difficulty: task.type === 'essay' ? (task.section.includes('22') ? 5 : 4) : 3,
    source: 'ai',
  };
}

// ---------- 主流程 ----------
const subj = await p.subject.findUnique({ where: { name: '数学' } });
const kps = await p.knowledgePoint.findMany({ where: { chapter: { subjectId: subj.id }, level: 2 } });
const kpByCode = new Map(kps.map((k) => [k.code, k]));

// 构建任务：为每个任务找考点 id
const jobs = [];
for (const t of TASKS) {
  const kp = kpByCode.get(t.code);
  if (!kp) { console.log('⚠️ 找不到考点', t.code, t.kpName); continue; }
  for (let i = 0; i < t.count; i++) {
    jobs.push({ ...t, subjectId: subj.id, kpIds: [kp.id] });
  }
}
console.log(`🚀 数学补题任务：${jobs.length} 道（解答${jobs.filter((j) => j.type === 'essay').length} / 填空${jobs.filter((j) => j.type === 'fill').length} / 选择${jobs.filter((j) => j.type === 'choice').length}），并发 ${CONCURRENCY}`);

let ok = 0, fail = 0;
const t0 = Date.now();
await pool(jobs, async (job, i) => {
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const q = await genOne(job);
      const created = await p.question.create({ data: { ...q, questionKnowledge: { create: job.kpIds.map((kid) => ({ knowledgePointId: kid })) } } });
      ok++;
      if (ok % 10 === 0 || ok === jobs.length) {
        const el = ((Date.now() - t0) / 1000).toFixed(0);
        console.log(`  [${el}s] 已生成 ${ok}/${jobs.length}（失败 ${fail}）`);
      }
      return created;
    } catch (e) {
      if (attempt === 1) {
        fail++;
        console.log(`  ❌ ${job.section} ${job.kpName}: ${String(e.message || e).slice(0, 80)}`);
      }
    }
  }
}, CONCURRENCY);

const el = ((Date.now() - t0) / 1000).toFixed(0);
console.log(`\n✅ 数学补题完成：成功 ${ok}，失败 ${fail}，耗时 ${el}s`);
const newCount = await p.question.count({ where: { subjectId: subj.id } });
console.log(`📊 数学题库总量：${newCount} 题`);
await p.$disconnect();
