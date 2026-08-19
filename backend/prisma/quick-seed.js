import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const prisma = new PrismaClient();
const SEED_DIR = path.join(__dirname, '..', 'seed');

async function main() {
  console.log('🌱 快速种子数据导入（跳过知识图谱/背诵，避免超时）...');

  // 1. 用户
  const springHash = await bcrypt.hash('spring2027', 10);
  const undergradHash = await bcrypt.hash('undergrad2027', 10);
  const adminHash = await bcrypt.hash('admin123', 10);

  await prisma.user.upsert({
    where: { username: 'springexam' },
    update: { passwordHash: springHash, examMode: 'spring', targetScore: 450, examDate: new Date('2027-01-10') },
    create: { username: 'springexam', email: 'spring@example.com', passwordHash: springHash, role: 'user', examMode: 'spring', targetScore: 450, examDate: new Date('2027-01-10') }
  });
  await prisma.user.upsert({
    where: { username: 'undergrad' },
    update: { passwordHash: undergradHash, examMode: 'undergraduate', examTargets: { subjects: ['CET4', 'CET6', 'IELTS', 'TOEFL', 'LAW', 'UNIV', 'PAPER'], goalScore: 600 }, targetScore: 600, examDate: new Date('2027-06-30') },
    create: { username: 'undergrad', email: 'undergrad@example.com', passwordHash: undergradHash, role: 'user', examMode: 'undergraduate', examTargets: { subjects: ['CET4', 'CET6', 'IELTS', 'TOEFL', 'LAW', 'UNIV', 'PAPER'], goalScore: 600 }, targetScore: 600, examDate: new Date('2027-06-30') }
  });
  await prisma.user.upsert({
    where: { username: 'admin' },
    update: { passwordHash: adminHash },
    create: { username: 'admin', email: 'admin@example.com', passwordHash: adminHash, role: 'admin' }
  });
  console.log('✅ 用户创建成功（springexam/undergrad/admin）');

  // 2. 科目
  const SPRING_CODES = ['Y', 'M', 'E'];
  const UNDERGRAD_CODES = ['CET4', 'CET6', 'IELTS', 'TOEFL', 'LAW', 'UNIV', 'PAPER'];
  for (const code of [...SPRING_CODES, ...UNDERGRAD_CODES]) {
    await prisma.subject.upsert({
      where: { code },
      update: {},
      create: { name: code, code, description: code }
    });
  }
  console.log('✅ 科目创建成功');

  // 3. 题目（分批导入，避免长事务）
  const questionFiles = [
    { file: 'seed-questions.json', label: '主题库(春考)' },
    { file: 'seed-questions-math.json', label: '数学补充' },
    { file: 'seed-questions-extra.json', label: '题目补充(春考)' },
    { file: 'undergraduate-data.js', label: '本科题目', parser: 'js' },
  ];

  let totalQ = 0;
  for (const qf of questionFiles) {
    const filePath = path.join(SEED_DIR, qf.file);
    if (!fs.existsSync(filePath)) continue;

    let questions;
    if (qf.parser === 'js') {
      const mod = await import(filePath);
      questions = Object.values(mod.QUESTIONS || {}).flat();
    } else {
      const raw = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
      questions = Array.isArray(raw) ? raw : Object.values(raw).flat();
    }

    const active = questions.filter(q => q.status !== 'archived' && q.type && q.stem);
    const subjectMap = new Map(SPRING_CODES.map(c => [c, c]));
    UNDERGRAD_CODES.forEach(c => subjectMap.set(c, c));

    let batch = [];
    for (const q of active) {
      const subjectCode = q.subjectCode || 'Y';
      if (!subjectMap.has(subjectCode)) continue;
      const subject = await prisma.subject.findUnique({ where: { code: subjectCode } });
      if (!subject) continue;

      batch.push({
        subjectId: subject.id,
        type: q.type,
        section: q.section || null,
        stem: q.stem,
        options: q.options || null,
        answer: q.answer || '',
        solution: q.solution || {},
        difficulty: q.difficulty || 3,
        source: q.source || 'seed',
        status: 'active',
      });

      if (batch.length >= 20) {
        await prisma.question.createMany({ data: batch, skipDuplicates: true });
        totalQ += batch.length;
        batch = [];
        await new Promise(r => setTimeout(r, 50));
      }
    }
    if (batch.length) {
      await prisma.question.createMany({ data: batch, skipDuplicates: true });
      totalQ += batch.length;
    }
    console.log(`📝 ${qf.label}: 导入 ${active.length} 题`);
  }
  console.log(`✅ 题目导入共 ${totalQ} 题`);

  // 4. 模板
  const templates = [
    { code: 'Y', name: '语文·春季高考仿真卷', totalScore: 150, duration: 120, sections: [
      { name: '基础知识与运用', type: 'choice', count: 6, scorePer: 4 },
      { name: '名句名篇默写', type: 'fill', count: 3, scorePer: 2 },
      { name: '文言文翻译', type: 'essay', count: 1, scorePer: 4 },
      { name: '文言文理解填空', type: 'fill', count: 1, scorePer: 6 },
      { name: '诗歌鉴赏·手法', type: 'essay', count: 1, scorePer: 4 },
      { name: '诗歌鉴赏·意境情感', type: 'essay', count: 1, scorePer: 6 },
      { name: '现代文阅读·论述类', type: 'choice', count: 4, scorePer: 3 },
      { name: '现代文阅读·论述类主观题', type: 'essay', count: 1, scorePer: 8 },
      { name: '现代文阅读·文学类', type: 'choice', count: 4, scorePer: 3 },
      { name: '现代文阅读·文学类赏析', type: 'essay', count: 1, scorePer: 8 },
      { name: '写作', type: 'essay', count: 1, scorePer: 60 },
    ]},
    { code: 'M', name: '数学·春季高考仿真卷', totalScore: 150, duration: 90, sections: [
      { name: '选择题', type: 'choice', count: 12, scorePer: 6 },
      { name: '填空题', type: 'fill', count: 6, scorePer: 6 },
      { name: '解答题（19-21题）', type: 'essay', count: 3, scorePer: 10 },
      { name: '解答题（22题）', type: 'essay', count: 1, scorePer: 12 },
    ]},
    { code: 'E', name: '英语·春季高考仿真卷', totalScore: 150, duration: 90, sections: [
      { name: '情景交际', type: 'choice', count: 5, scorePer: 3 },
      { name: '阅读理解·第一节', type: 'choice', count: 15, scorePer: 3 },
      { name: '阅读理解·第二节', type: 'fill', count: 5, scorePer: 3 },
      { name: '完形填空', type: 'choice', count: 15, scorePer: 2 },
      { name: '语法填空', type: 'fill', count: 10, scorePer: 2 },
      { name: '书面表达', type: 'essay', count: 1, scorePer: 25 },
    ]},
    { code: 'CET4', name: 'CET-4 全真模拟卷', totalScore: 710, duration: 125, sections: [
      { name: '听力理解', type: 'listening', count: 25, scorePer: 1 },
      { name: '阅读理解', type: 'choice', count: 15, scorePer: 1 },
      { name: '翻译', type: 'fill', count: 1, scorePer: 1 },
      { name: '写作', type: 'essay', count: 1, scorePer: 1 },
    ]},
    { code: 'CET6', name: 'CET-6 全真模拟卷', totalScore: 710, duration: 130, sections: [
      { name: '听力理解', type: 'listening', count: 25, scorePer: 1 },
      { name: '仔细阅读', type: 'choice', count: 10, scorePer: 1 },
      { name: '翻译', type: 'fill', count: 1, scorePer: 1 },
      { name: '写作', type: 'essay', count: 1, scorePer: 1 },
    ]},
    { code: 'IELTS', name: '雅思全真模拟', totalScore: 9, duration: 240, sections: [
      { name: '听力', type: 'listening', count: 40, scorePer: 1 },
      { name: '阅读', type: 'choice', count: 40, scorePer: 1 },
      { name: '写作Task1', type: 'essay', count: 1, scorePer: 1 },
      { name: '写作Task2', type: 'essay', count: 1, scorePer: 1 },
    ]},
    { code: 'TOEFL', name: '托福全真模拟', totalScore: 120, duration: 180, sections: [
      { name: '阅读', type: 'choice', count: 10, scorePer: 1 },
      { name: '听力', type: 'listening', count: 8, scorePer: 1 },
      { name: '口语', type: 'essay', count: 4, scorePer: 1 },
      { name: '写作', type: 'essay', count: 2, scorePer: 1 },
    ]},
    { code: 'LAW', name: '法律基础期末模拟', totalScore: 100, duration: 120, sections: [
      { name: '宪法', type: 'choice', count: 10, scorePer: 1 },
      { name: '民法', type: 'choice', count: 10, scorePer: 1 },
      { name: '刑法', type: 'choice', count: 10, scorePer: 1 },
      { name: '案例分析', type: 'essay', count: 2, scorePer: 1 },
    ]},
    { code: 'UNIV', name: '大学通识课期末模拟', totalScore: 100, duration: 120, sections: [
      { name: '高等数学', type: 'choice', count: 10, scorePer: 1 },
      { name: '大学语文', type: 'choice', count: 10, scorePer: 1 },
      { name: '思修', type: 'choice', count: 10, scorePer: 1 },
      { name: '近代史', type: 'choice', count: 10, scorePer: 1 },
    ]},
    { code: 'PAPER', name: '论文写作指导', totalScore: 0, duration: 0, sections: [
      { name: '选题指导', type: 'essay', count: 1, scorePer: 0 },
      { name: '结构规范', type: 'essay', count: 1, scorePer: 0 },
      { name: '引用规范', type: 'essay', count: 1, scorePer: 0 },
      { name: '查重避坑', type: 'essay', count: 1, scorePer: 0 },
    ]},
  ];

  for (const tpl of templates) {
    const subject = await prisma.subject.findUnique({ where: { code: tpl.code } });
    if (!subject) continue;
    await prisma.examTemplate.upsert({
      where: { id: `template-${tpl.code}` },
      update: { config: { sections: tpl.sections }, totalScore: tpl.totalScore, duration: tpl.duration },
      create: { id: `template-${tpl.code}`, subjectId: subject.id, name: tpl.name, description: tpl.name, config: { sections: tpl.sections }, totalScore: tpl.totalScore, duration: tpl.duration }
    });
  }
  console.log('✅ 模板创建成功');

  // 5. 成就
  const achievements = [
    { name: '初试锋芒', icon: '🎯', description: '完成第 1 次练习' },
    { name: '刷题达人', icon: '📚', description: '累计完成 10 次练习' },
    { name: '百题斩', icon: '⚔️', description: '累计答对 100 题' },
    { name: '模考首战', icon: '🏁', description: '完成第 1 次全真模考' },
    { name: '科目精通', icon: '🏆', description: '任一科目掌握度达 80%' },
  ];
  for (const a of achievements) {
    await prisma.achievement.upsert({ where: { name: a.name }, update: {}, create: { name: a.name, icon: a.icon, description: a.description, condition: {} } });
  }
  console.log('✅ 成就创建成功');

  console.log('\n🎉 快速种子数据导入完成！');
  await prisma.$disconnect();
}

main().catch(e => { console.error('❌', e); process.exit(1); });