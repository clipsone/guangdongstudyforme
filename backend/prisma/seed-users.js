// 初始化两个测试账号（春考用户 + 本科用户）
import prisma from '../src/utils/prisma.js';
import bcrypt from 'bcryptjs';

async function main() {
  console.log('👤 创建测试账号...\n');

  const springHash = await bcrypt.hash('spring2027', 10);
  const undergradHash = await bcrypt.hash('undergrad2027', 10);

  // 春考用户
  await prisma.user.upsert({
    where: { username: 'springexam' },
    update: {},
    create: {
      username: '春考生',
      email: 'spring@example.com',
      passwordHash: springHash,
      role: 'user',
      examMode: 'spring',
      targetScore: 450,
      examDate: '2027-01-10',
    },
  });
  console.log('✅ 春考用户: springexam / spring2027');

  // 本科用户
  await prisma.user.upsert({
    where: { username: 'undergrad' },
    update: {},
    create: {
      username: '本科生',
      email: 'student@example.com',
      passwordHash: undergradHash,
      role: 'user',
      examMode: 'undergraduate',
      examTargets: { subjects: ['CET4', 'CET6', 'IELTS', 'LAW'], goalScore: 550 },
      targetScore: 550,
      examDate: '2027-06-30',
    },
  });
  console.log('✅ 本科用户: undergrad / undergrad2027');

  console.log('\n🎉 账号创建完成！');
  await prisma.$disconnect();
}

main().catch(e => { console.error('❌', e); process.exit(1); });
