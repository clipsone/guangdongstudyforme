import prisma from '../src/utils/prisma.js';
import { SUBJECTS, QUESTIONS, TEMPLATES } from './undergraduate-data.js';

async function main() {
  console.log('🌱 导入本科模式种子数据...\n');

  // 1. 创建科目
  for (const subj of SUBJECTS) {
    await prisma.subject.upsert({
      where: { code: subj.code },
      update: {},
      create: { name: subj.name, code: subj.code, description: subj.desc },
    });
    console.log(`✅ 科目: ${subj.name}`);
  }

  // 2. 创建题目
  let totalQ = 0;
  for (const [code, qs] of Object.entries(QUESTIONS)) {
    const subject = await prisma.subject.findUnique({ where: { code } });
    if (!subject) { console.log(`⚠️ ${code} 科目不存在，跳过`); continue; }
    for (const q of qs) {
      await prisma.question.create({
        data: {
          subjectId: subject.id,
          type: q.type,
          section: q.section,
          stem: q.stem,
          options: q.options,
          answer: q.answer,
          solution: q.solution,
          difficulty: q.difficulty || 3,
          source: 'seed',
        },
      });
      totalQ++;
    }
    console.log(`📝 ${code}: ${qs.length} 题`);
  }
  console.log(`\n✅ 共导入 ${totalQ} 道题目`);

  // 3. 创建考试模板
  for (const [code, tpl] of Object.entries(TEMPLATES)) {
    const subject = await prisma.subject.findUnique({ where: { code } });
    if (!subject) continue;
    await prisma.examTemplate.upsert({
      where: { id: `template-${code}` },
      update: {},
      create: {
        id: `template-${code}`,
        subjectId: subject.id,
        name: tpl.name,
        description: `${code}全真模拟卷`,
        config: { sections: tpl.sections },
        totalScore: tpl.totalScore,
        duration: tpl.duration,
      },
    });
    console.log(`📄 模板: ${tpl.name}`);
  }

  console.log('\n🎉 本科模式种子数据导入完成！');
  await prisma.$disconnect();
}

main().catch(e => { console.error('❌', e); process.exit(1); });
