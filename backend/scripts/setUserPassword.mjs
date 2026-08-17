// 用法：node scripts/setUserPassword.mjs <username> <password>
// 为已有用户设置 bcrypt 密码哈希（不删除任何数据）。云端与本地通用。
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const [username, password] = process.argv.slice(2);

if (!username || !password) {
  console.error('用法: node scripts/setUserPassword.mjs <用户名> <密码>');
  process.exit(1);
}
if (password.length < 6) {
  console.error('密码至少 6 位');
  process.exit(1);
}

const user = await prisma.user.findUnique({ where: { username } });
if (!user) {
  console.error(`用户 ${username} 不存在`);
  process.exit(1);
}

const hash = bcrypt.hashSync(password, 10);
await prisma.user.update({ where: { id: user.id }, data: { passwordHash: hash } });
console.log(`✅ 已为 ${username} (${user.id}) 设置新密码`);

await prisma.$disconnect();
