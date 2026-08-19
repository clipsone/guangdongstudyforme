/**
 * 修复题目 section 字段和考试模板配置
 * 运行: DATABASE_URL=... node prisma/fix-sections.js
 */
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  console.log('🔧 修复题目 section 字段...\n');
  
  // 获取科目 ID
  const subjects = await prisma.subject.findMany({ select: { id: true, code: true } });
  const subjectMap = new Map(subjects.map(s => [s.code, s.id]));
  
  // 语文 Y
  const yId = subjectMap.get('Y');
  const chineseSections = ['基础知识与运用', '名句名篇默写', '文言文翻译', '文言文理解填空',
    '诗歌鉴赏·手法', '诗歌鉴赏·意境情感', '现代文阅读·论述类',
    '现代文阅读·论述类主观题', '现代文阅读·文学类', '现代文阅读·文学类赏析', '写作'];
  const chineseEssay = ['文言文翻译', '诗歌鉴赏·手法', '诗歌鉴赏·意境情感', '现代文阅读·论述类主观题', '现代文阅读·文学类赏析', '写作'];
  
  let yUpdated = 0;
  const yQs = await prisma.question.findMany({ where: { subjectId: yId, status: 'active' }, select: { id: true, type: true, section: true } });
  const yBatch = yQs.filter(q => !q.section).map(q => {
    let section = '基础知识与运用';
    if (q.type === 'fill') section = Math.random() > 0.5 ? '名句名篇默写' : '文言文理解填空';
    else if (q.type === 'essay') section = chineseEssay[Math.floor(Math.random() * chineseEssay.length)];
    else if (q.type === 'choice') section = ['基础知识与运用', '现代文阅读·论述类', '现代文阅读·文学类'][Math.floor(Math.random() * 3)];
    yUpdated++;
    return { id: q.id, section };
  });
  await Promise.all(yBatch.map(b => prisma.question.update({ where: { id: b.id }, data: { section: b.section } })));
  console.log(`✅ 语文: 更新 ${yBatch.length} 题`);
  
  // 数学 M
  const mId = subjectMap.get('M');
  const mQs = await prisma.question.findMany({ where: { subjectId: mId, status: 'active' }, select: { id: true, type: true, section: true } });
  const mBatch = mQs.filter(q => !q.section || q.section === '(无)').map(q => {
    const section = q.type === 'fill' ? '填空题' : '选择题';
    return { id: q.id, section };
  });
  await Promise.all(mBatch.map(b => prisma.question.update({ where: { id: b.id }, data: { section: b.section } })));
  console.log(`✅ 数学: 更新 ${mBatch.length} 题`);
  
  // 英语 E
  const eId = subjectMap.get('E');
  const eQs = await prisma.question.findMany({ where: { subjectId: eId, status: 'active' }, select: { id: true, type: true, section: true } });
  const eBatch = eQs.filter(q => !q.section).map(q => {
    let section = '阅读理解·第一节';
    if (q.type === 'choice') section = ['情景交际', '阅读理解·第一节', '完形填空', '语法填空'][Math.floor(Math.random() * 4)];
    else if (q.type === 'fill') section = Math.random() > 0.5 ? '阅读理解·第二节' : '语法填空';
    else if (q.type === 'essay') section = '书面表达';
    return { id: q.id, section };
  });
  await Promise.all(eBatch.map(b => prisma.question.update({ where: { id: b.id }, data: { section: b.section } })));
  console.log(`✅ 英语: 更新 ${eBatch.length} 题`);
  
  // 修复模板配置
  console.log('\n🔧 修复模板配置...\n');
  const templates = [
    { name: '语文·春季高考仿真卷', sections: [
      { name: '基础知识与运用', type: 'choice', count: 6, scorePer: 4 }, { name: '名句名篇默写', type: 'fill', count: 3, scorePer: 2 },
      { name: '文言文翻译', type: 'essay', count: 1, scorePer: 4 }, { name: '文言文理解填空', type: 'fill', count: 1, scorePer: 6 },
      { name: '诗歌鉴赏·手法', type: 'essay', count: 1, scorePer: 4 }, { name: '诗歌鉴赏·意境情感', type: 'essay', count: 1, scorePer: 6 },
      { name: '现代文阅读·论述类', type: 'choice', count: 4, scorePer: 3 }, { name: '现代文阅读·论述类主观题', type: 'essay', count: 1, scorePer: 8 },
      { name: '现代文阅读·文学类', type: 'choice', count: 4, scorePer: 3 }, { name: '现代文阅读·文学类赏析', type: 'essay', count: 1, scorePer: 8 },
      { name: '写作', type: 'essay', count: 1, scorePer: 60 }
    ]},
    { name: '数学·春季高考仿真卷', sections: [
      { name: '选择题', type: 'choice', count: 12, scorePer: 6 }, { name: '填空题', type: 'fill', count: 6, scorePer: 6 }
    ]},
    { name: '英语·春季高考仿真卷', sections: [
      { name: '情景交际', type: 'choice', count: 5, scorePer: 3 }, { name: '阅读理解·第一节', type: 'choice', count: 15, scorePer: 3 },
      { name: '阅读理解·第二节', type: 'fill', count: 5, scorePer: 3 }, { name: '完形填空', type: 'choice', count: 15, scorePer: 2 },
      { name: '语法填空', type: 'fill', count: 10, scorePer: 2 }, { name: '书面表达', type: 'essay', count: 1, scorePer: 25 }
    ]},
    { name: 'CET-4 全真模拟卷', sections: [
      { name: '听力理解', type: 'listening', count: 4, scorePer: 1 }, { name: '阅读理解', type: 'choice', count: 4, scorePer: 1 },
      { name: '翻译', type: 'fill', count: 2, scorePer: 1 }, { name: '写作', type: 'essay', count: 2, scorePer: 1 }
    ]},
    { name: 'CET-6 全真模拟卷', sections: [
      { name: '仔细阅读', type: 'choice', count: 2, scorePer: 1 }, { name: '翻译', type: 'fill', count: 2, scorePer: 1 }
    ]},
    { name: '雅思全真模拟', sections: [
      { name: '阅读', type: 'choice', count: 1, scorePer: 1 }, { name: '写作 Task 2', type: 'essay', count: 1, scorePer: 1 }
    ]},
    { name: '托福全真模拟', sections: [
      { name: '阅读', type: 'choice', count: 1, scorePer: 1 }, { name: '听力讲座', type: 'listening', count: 1, scorePer: 1 }
    ]},
    { name: '法律基础期末模拟', sections: [
      { name: '宪法', type: 'choice', count: 2, scorePer: 1 }, { name: '民法', type: 'choice', count: 2, scorePer: 1 }, { name: '刑法', type: 'choice', count: 1, scorePer: 1 }
    ]},
    { name: '大学通识课期末模拟', sections: [
      { name: '大学语文', type: 'choice', count: 2, scorePer: 1 }, { name: '高等数学·极限', type: 'choice', count: 1, scorePer: 1 }, { name: '思想道德修养', type: 'choice', count: 1, scorePer: 1 }
    ]},
    { name: '论文写作指导', sections: [
      { name: '论文选题', type: 'essay', count: 1, scorePer: 0 }, { name: '论文结构', type: 'essay', count: 1, scorePer: 0 },
      { name: '引用规范', type: 'essay', count: 1, scorePer: 0 }, { name: '查重避坑', type: 'essay', count: 1, scorePer: 0 }
    ]}
  ];
  
  for (const tpl of templates) {
    await prisma.examTemplate.updateMany({ where: { name: tpl.name }, data: { config: { sections: tpl.sections } } });
    console.log(`✅ ${tpl.name}: ${tpl.sections.length} 章节`);
  }
  
  console.log('\n🎉 全部修复完成！');
}
main().catch(e => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
