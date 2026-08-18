import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
  // 生产环境不打印 SQL（信息泄露+性能）；本地开发保留
  log: process.env.NODE_ENV === 'production' ? ['error', 'warn'] : ['query', 'error', 'warn'],
});

export default prisma;