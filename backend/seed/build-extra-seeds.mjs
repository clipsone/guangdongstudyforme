// 从原版 server/prisma/seed-data 移植题目与背诵数据到新项目的种子格式
// 输出: seed-questions.json / seed-recitation.json
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SRC_DIR = '/Users/a0000/Desktop/春考复习/server/prisma/seed-data';

const SUBJECT_MAP = { chinese: 'Y', math: 'M', english: 'E' };
const CATEGORY_MAP = { poem: 'essay', word: 'vocabulary', formula: 'formula' };
const TYPE_MAP = {
  single_choice: 'choice',
  multiple_choice: 'choice',
  blank: 'fill',
  solution: 'essay',
  composite: 'composite',
  essay: 'essay',
};

function readJson(file) {
  return JSON.parse(fs.readFileSync(path.join(SRC_DIR, file), 'utf-8'));
}

// ============ 题目 ============
const questionFiles = [
  '_part1_e1.json', '_part2_e2a.json', '_part3_e2b.json', '_part4_e3.json',
  '_part5_e4.json', '_part6_e5.json', '_part7_e6.json', '_part8_e7.json',
  '_chunk_y1.json', '_chunk_y2.json', '_chunk_y3.json', '_chunk_y4.json',
];

const questions = [];
for (const file of questionFiles) {
  const items = readJson(file);
  for (const q of items) {
    let type = TYPE_MAP[q.type] || 'choice';
    let answer = q.answer || '';
    // 五选五/排序类：答案为字母数组（完整排序），转成填空题并拼接
    if (Array.isArray(answer)) {
      type = 'fill';
      answer = answer.join(' ');
    }
    const subjectCode = SUBJECT_MAP[q.subject];
    if (!subjectCode) continue;
    questions.push({
      subjectCode,
      type,
      stem: q.stem,
      options: q.options && q.options.length ? q.options : null,
      answer,
      solution: typeof q.solution === 'string' ? { analysis: q.solution } : q.solution || { analysis: '' },
      difficulty: q.difficulty || 3,
      source: q.source || 'ai_seed',
      year: q.year ?? null,
      knowledgePointIds: (q.knowledge || []).map((k) => String(k).replace(/\./g, '-').toUpperCase()),
    });
  }
}

fs.writeFileSync(
  path.join(__dirname, 'seed-questions.json'),
  JSON.stringify(questions, null, 2),
  'utf-8'
);
console.log(`✅ 题目移植完成: ${questions.length} 题`);

// ============ 背诵 ============
const recitationFiles = [
  { file: 'seed-recitation-poem.json', subject: 'chinese', category: 'poem' },
  { file: 'seed-recitation-word.json', subject: 'english', category: 'word' },
  { file: 'seed-recitation-formula.json', subject: 'math', category: 'formula' },
];

const recitations = [];
for (const { file, subject, category } of recitationFiles) {
  const items = readJson(file);
  let order = 0;
  for (const item of items) {
    const subjectCode = SUBJECT_MAP[subject];
    const type = CATEGORY_MAP[category];
    let entry = {
      subjectCode,
      type,
      order: order++,
    };
    if (category === 'word') {
      entry.title = item.name;
      entry.content = item.name; // 单词本身
      entry.phonetic = item.phonetic || null;
      entry.partOfSpeech = item.pos || null;
      entry.meaning = item.meaning || null;
      entry.example = item.example || null;
    } else {
      // poem / formula：内容为对象，序列化为 JSON 字符串
      entry.title = item.name;
      entry.content = JSON.stringify(item.content || {});
    }
    recitations.push(entry);
  }
}

fs.writeFileSync(
  path.join(__dirname, 'seed-recitation.json'),
  JSON.stringify(recitations, null, 2),
  'utf-8'
);
console.log(`✅ 背诵项目移植完成: ${recitations.length} 项`);

// 统计
const types = {};
questions.forEach((q) => { types[q.type] = (types[q.type] || 0) + 1; });
console.log('题目类型分布:', JSON.stringify(types));
