// 一次性迁移脚本：为现有题目打真实题型分区(section) + 更新为广东春考真实结构模板
// 用法：DATABASE_URL=<连接串> node scripts/setupExamTemplates.mjs
// 语文板块按官方结构（150分/120分钟）：基础知识与运用(约33分) / 古诗文阅读(20分) / 现代文阅读(40分) / 写作(60分)
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// 科目 → 章节名 → 题型分区（用于给已有题目打标）
const CHAPTER_SECTION = {
  语文: {
    // 现代文阅读（2024起新增主观题，论述类=科学/社科作品）
    实用类文本阅读: '现代文阅读·论述类',
    现代文阅读: '现代文阅读·文学类', 小说阅读: '现代文阅读·文学类', 散文阅读: '现代文阅读·文学类',
    // 文言文阅读的选择题（实词/虚词/句式）属于基础知识积累
    文言文阅读: '基础知识与运用', 古代诗文阅读: '基础知识与运用',
    名句名篇默写: '名句名篇默写', 语言文字运用: '基础知识与运用',
    作文: '写作', 写作素材积累与运用: '写作',
  },
  数学: {},
  英语: {
    阅读理解: '阅读理解', 完形填空: '完形填空', 语法填空: '语法填空',
    书面表达: '书面表达', 词汇与短语: '单项选择', 听力理解: '单项选择', 短文改错: '单项选择',
  },
};

// 无章节映射时的兜底：按题型轮转分区
const TYPE_SECTIONS = {
  语文: { choice: ['基础知识与运用'], fill: ['名句名篇默写'], essay: ['写作'] },
  数学: { choice: ['单选题'], fill: ['填空题'], essay: ['解答题'] },
  英语: { choice: ['单项选择', '完形填空', '阅读理解'], fill: ['语法填空'], essay: ['书面表达'] },
};

// 真实结构模板（广东春季高考·学业水平合格性考试，满分150）
const TEMPLATES = {
  语文: {
    name: '语文·春季高考仿真卷',
    description: '按广东春季高考（合格考）真实结构：基础知识与运用约33分 / 古诗文阅读20分（文言文翻译4+理解填空6、诗歌鉴赏4+6）/ 现代文阅读40分（论述类+文学类，含主观题）/ 写作60分。150分/120分钟',
    totalScore: 150, duration: 120,
    sections: [
      { name: '基础知识与运用', type: 'choice', count: 6, scorePer: 4 },          // 24
      { name: '名句名篇默写', type: 'fill', count: 3, scorePer: 2 },              // 6（必背11篇）
      { name: '文言文翻译', type: 'essay', count: 1, scorePer: 4 },               // 4（课外文言文直译）
      { name: '文言文理解填空', type: 'fill', count: 1, scorePer: 6 },            // 6（文意理解概括）
      { name: '诗歌鉴赏·手法', type: 'essay', count: 1, scorePer: 4 },            // 4（表达技巧）
      { name: '诗歌鉴赏·意境情感', type: 'essay', count: 1, scorePer: 6 },        // 6（深层意境，2025年起分值加重）
      { name: '现代文阅读·论述类', type: 'choice', count: 4, scorePer: 3 },       // 12
      { name: '现代文阅读·论述类主观题', type: 'essay', count: 1, scorePer: 8 },  // 8（2024起新增主观题）
      { name: '现代文阅读·文学类', type: 'choice', count: 4, scorePer: 3 },       // 12
      { name: '现代文阅读·文学类赏析', type: 'essay', count: 1, scorePer: 8 },   // 8（手法+内容+效果）
      { name: '写作', type: 'essay', count: 1, scorePer: 60 },                    // 60（材料作文，占40%）
    ],
  },
  数学: {
    name: '数学·春季高考仿真卷',
    description: '按广东春季高考（依学考）真实题型组卷：单选题/填空题/解答题，满分150分，90分钟',
    totalScore: 150, duration: 90,
    sections: [
      { name: '单选题', type: 'choice', count: 10, scorePer: 5 },
      { name: '填空题', type: 'fill', count: 4, scorePer: 5 },
      { name: '解答题', type: 'essay', count: 4, scorePer: 20 },
    ],
  },
  英语: {
    name: '英语·春季高考仿真卷',
    description: '按广东春季高考（依学考）真实题型组卷：单项选择/完形填空/阅读理解/语法填空/书面表达，满分150分，90分钟',
    totalScore: 150, duration: 90,
    sections: [
      { name: '单项选择', type: 'choice', count: 15, scorePer: 2 },
      { name: '完形填空', type: 'choice', count: 15, scorePer: 2 },
      { name: '阅读理解', type: 'choice', count: 15, scorePer: 2 },
      { name: '语法填空', type: 'fill', count: 10, scorePer: 2 },
      { name: '书面表达', type: 'essay', count: 1, scorePer: 40 },
    ],
  },
};

// 旧版语文分区名（v1 打标），重跑时需要先清除再按新版映射重打
const OLD_LANG_SECTIONS = ['现代文阅读', '文言文阅读', '古代诗歌鉴赏', '语言文字运用', '名句名篇默写', '写作'];

async function tagQuestions() {
  const subjects = await prisma.subject.findMany();
  for (const s of subjects) {
    const chapterMap = CHAPTER_SECTION[s.name] || {};
    const typeFallback = TYPE_SECTIONS[s.name] || {};
    // 语文：先清除旧版分区标签，再按新映射重打（保留 AI 生成的新分区题）
    if (s.name === '语文') {
      await prisma.question.updateMany({
        where: { subjectId: s.id, section: { in: OLD_LANG_SECTIONS } },
        data: { section: null },
      });
    }
    const questions = await prisma.question.findMany({
      where: { subjectId: s.id, section: null },
      include: { questionKnowledge: { include: { knowledgePoint: { include: { chapter: true } } } } },
    });
    const roundRobin = {};
    let tagged = 0;
    for (const q of questions) {
      let section = null;
      for (const qk of q.questionKnowledge || []) {
        const cn = qk.knowledgePoint?.chapter?.name;
        if (cn && chapterMap[cn]) { section = chapterMap[cn]; break; }
      }
      if (!section) section = qkFallback(q, typeFallback, roundRobin);
      if (section) {
        await prisma.question.update({ where: { id: q.id }, data: { section } });
        tagged++;
      }
    }
    console.log(`📌 ${s.name}: 已打标 ${tagged}/${questions.length} 题`);
  }
}

function qkFallback(q, typeFallback, roundRobin) {
  const list = typeFallback[q.type];
  if (!list || !list.length) return null;
  const key = `${q.subjectId}:${q.type}`;
  const i = roundRobin[key] || 0;
  roundRobin[key] = i + 1;
  return list[i % list.length];
}

async function updateTemplates() {
  const subjects = await prisma.subject.findMany();
  for (const s of subjects) {
    const tpl = TEMPLATES[s.name];
    if (!tpl) continue;
    const existing = await prisma.examTemplate.findFirst({ where: { subjectId: s.id }, orderBy: { createdAt: 'asc' } });
    if (existing) {
      await prisma.examTemplate.update({
        where: { id: existing.id },
        data: {
          name: tpl.name,
          description: tpl.description,
          totalScore: tpl.totalScore,
          duration: tpl.duration,
          config: { sections: tpl.sections },
        },
      });
      console.log(`📄 ${s.name}: 已更新模板「${tpl.name}」(${tpl.totalScore}分/${tpl.duration}分钟, ${tpl.sections.length}个分区)`);
    } else {
      await prisma.examTemplate.create({
        data: { subjectId: s.id, name: tpl.name, description: tpl.description, totalScore: tpl.totalScore, duration: tpl.duration, config: { sections: tpl.sections } },
      });
      console.log(`📄 ${s.name}: 已创建模板「${tpl.name}」`);
    }
  }
}

await tagQuestions();
await updateTemplates();
await prisma.$disconnect();
console.log('✅ 完成');
