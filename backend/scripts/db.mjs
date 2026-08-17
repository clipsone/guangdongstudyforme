// 本地嵌入式 PostgreSQL 管理脚本（开发用）
// 用法: node scripts/db.mjs start | stop | status
import EmbeddedPostgres from 'embedded-postgres';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DB_DIR = path.join(__dirname, '..', '.pgdata');

const config = {
  databaseDir: DB_DIR,
  user: 'postgres',
  password: 'postgres',
  port: 5432,
  persistent: true,
};

const isInitialised = () => fs.existsSync(path.join(DB_DIR, 'PG_VERSION'));

const cmd = process.argv[2] || 'start';

if (cmd === 'start') {
  const pg = new EmbeddedPostgres(config);
  if (!isInitialised()) {
    console.log('📦 初始化数据库目录...');
    await pg.initialise();
  }
  console.log('🚀 启动 PostgreSQL (port 5432)...');
  await pg.start();
  // 创建应用数据库（不存在则创建）
  try {
    await pg.createDatabase('spring_exam');
    console.log('✅ 数据库 spring_exam 已就绪');
  } catch (e) {
    if (!String(e.message || e).includes('already exists')) {
      console.error('⚠️ createDatabase:', e.message || e);
    }
  }
  console.log('✅ PostgreSQL 运行中');
  // 保持进程存活（postgres 子进程随本进程退出而关闭）
  setInterval(() => {}, 1 << 30);
} else if (cmd === 'stop') {
  const pg = new EmbeddedPostgres(config);
  await pg.stop();
  console.log('🛑 PostgreSQL 已停止');
} else if (cmd === 'status') {
  console.log('status:', isInitialised() ? '已初始化' : '未初始化');
} else {
  console.log('未知命令:', cmd);
  process.exit(1);
}
