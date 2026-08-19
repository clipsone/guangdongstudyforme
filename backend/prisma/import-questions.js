import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const prisma = new PrismaClient();
const SEED_DIR = path.join(__dirname, '..', 'seed');

async function main() {
  console.log('📝 导入题目...');

  // 获取所有科目
  const subjects = await prisma.subject.findMany();
  const subjectMap = new Map(subjects.map(s => [s.code, s]));

  // 题目文件列表
  const questionFiles = [
    { file: 'seed-questions.json', label: '春考主库' },
    { file: 'seed-questions-math.json', label: '数学补充' },
    { file: 'seed-questions-extra.json', label: '补充题目' },
    { file: 'undergraduate-data.js', label: '本科题目', parser: 'js' },
  ];

  let totalQ = 0;
  for (const qf of questionFiles) {
    const filePath = path.join(SEED_DIR, qf.file);
    if (!fs.existsSync(filePath)) {
      console.log(`⚠️ 文件不存在: ${qf.file}`);
      continue;
    }

    let questions;
    if (qf.parser === 'js') {
      const mod = await import(filePath);
      // 本科题目按对象键添加 subjectCode
      const modData = mod.QUESTIONS || {};
      questions = [];
      for (const [code, qs] of Object.entries(modData)) {
        for (const q of qs) {
          questions.push({ ...q, subjectCode: code });
        }
      }
    } else {
      const raw = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
      questions = Array.isArray(raw) ? raw : Object.values(raw).flat();
    }

    const active = questions.filter(q => q.status !== 'archived' && q.type && q.stem);
    console.log(`处理 ${qf.label}: ${active.length} 题`);

    // 按科目分组
    const bySubject = {};
    for (const q of active) {
      const code = q.subjectCode || 'Y';
      if (!bySubject[code]) bySubject[code] = [];
      bySubject[code].push(q);
    }

    // 批量导入每个科目的题目
    for (const [code, qs] of Object.entries(bySubject)) {
      const subject = subjectMap.get(code);
      if (!subject) {
        console.log(`  ⚠️ 科目 ${code} 不存在，跳过`);
        continue;
      }

      // 分批导入，每批 50 题
      for (let i = 0; i < qs.length; i += 50) {
        const batch = qs.slice(i, i + 50);
        const data = batch.map(q => ({
          subjectId: subject.id,
          type: q.type,
          section: q.section || null,
          stem: q.stem,
          options: q.options || null,
          answer: q.answer || '',
          solution: q.solution || {},
          difficulty: q.difficulty || 3,
          source: q.source || 'seed',
          status: q.status === 'archived' ? 'archived' : 'active',
        }));

        await prisma.question.createMany({ data, skipDuplicates: true });
        totalQ += data.length;
        console.log(`  ✓ ${code}: 导入 ${batch.length} 题`);
        await new Promise(r => setTimeout(r, 20));
      }
    }
  }

  console.log(`\n✅ 题目导入完成: 共 ${totalQ} 题`);

  // 创建考试模板（如果不存在）
  const templates = [
    { code: 'Y', name: '语文·春季高考仿真卷', totalScore: 150, duration: 120 },
    { code: 'M', name: '数学·春季高考仿真卷', totalScore: 150, duration: 90 },
    { code: 'E', name: '英语·春季高考仿真卷', totalScore: 150, duration: 90 },
    { code: 'CET4', name: 'CET-4 全真模拟卷', totalScore: 710, duration: 125 },
    { code: 'CET6', name: 'CET-6 全真模拟卷', totalScore: 710, duration: 130 },
    { code: 'IELTS', name: '雅思全真模拟', totalScore: 9, duration: 240 },
    { code: 'TOEFL', name: '托福全真模拟', totalScore: 120, duration: 180 },
    { code: 'LAW', name: '法律基础期末模拟', totalScore: 100, duration: 120 },
    { code: 'UNIV', name: '大学通识课期末模拟', totalScore: 100, duration: 120 },
    { code: 'PAPER', name: '论文写作指导', totalScore: 0, duration: 0 },
  ];

  for (const tpl of templates) {
    const subject = subjectMap.get(tpl.code);
    if (!subject) continue;

    // 检查是否已存在
    const existing = await prisma.examTemplate.findUnique({ where: { id: `template-${tpl.code}` } });
    if (!existing) {
      await prisma.examTemplate.create({
        data: {
          id: `template-${tpl.code}`,
          subjectId: subject.id,
          name: tpl.name,
          description: tpl.name,
          config: { sections: [] },
          totalScore: tpl.totalScore,
          duration: tpl.duration,
        },
      });
      console.log(`✅ 模板: ${tpl.name}`);
    }
  }

  console.log('\n🎉 数据库初始化完成！');
  await prisma.$disconnect();
}

main().catch(e => { console.error('❌', e.message); process.exit(1); });
