import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';

if (!process.env.VERCEL && !process.env.DATABASE_URL) {
  dotenv.config({ path: new URL('../../.env.local', import.meta.url) });
  dotenv.config({ path: new URL('../../.env', import.meta.url) });
}

const prisma = new PrismaClient({
  // 生产环境不打印 SQL（信息泄露+性能）；本地开发保留
  log: process.env.NODE_ENV === 'production' ? ['error', 'warn'] : ['query', 'error', 'warn'],
});

export default prisma;