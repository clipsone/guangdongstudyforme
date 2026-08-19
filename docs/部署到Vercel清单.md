# 部署到 Vercel 操作清单

## ✅ 已修复的问题

| 问题 | 状态 |
|------|------|
| `vercel.json` 的 `outputDirectory` 从 `dist` 修复为 `frontend/dist` | ✅ 已修复并推送 |
| 前端构建产物路径从 `frontend/dist/` 映射到 Vercel 静态托管 | ✅ 已修复 |
| Vercel Serverless 入口 `api/index.js` 已创建 | ✅ 已创建 |
| Prisma Client 在部署时自动生成 | ✅ 已配置 |

---

## 📋 部署前检查清单

### 1. 仓库配置

- [x] GitHub 仓库：`https://github.com/clipsone/guangdongstudyforme`
- [x] 根目录 `vercel.json` 已配置
- [x] `api/index.js` 在 `api/` 目录下
- [x] `frontend/dist/` 已存在（预先构建）

### 2. 需要你在 Vercel 后台配置的环境变量

登录 [Vercel Dashboard](https://vercel.com/dashboard) → 选择项目 → Settings → Environment Variables：

| 变量名 | 值 | 说明 |
|-------|-----|------|
| `DATABASE_URL` | `postgresql://...` | **必须**。 PostgreSQL 连接串 |
| `ZHIPU_API_KEY` | `sk-...` | 可选。 AI 模型 API Key |
| `AI_MODEL` | `deepseek-v4-flash` | 可选。 AI 模型名称 |
| `NODE_ENV` | `production` | 可选。 生产环境标识 |
| `CORS_ORIGIN` | `https://你的域名.vercel.app` | 可选。 允许的来源域名 |

### 3. 数据库初始化（关键一步）

Vercel 的函数是只读的，不能直接运行数据库迁移。你需要：

**方式 A：在 Vercel 后台手动触发**
1. 进入 Vercel 项目 → `Deployments`
2. 找到最新的成功部署，点击 `...` → `Open Deployment`
3. 访问 `https://你的域名.vercel.app/api/health` 确认后端运行

**方式 B：创建临时初始化路由（推荐）**

在 `backend/src/routes/` 下创建一个临时路由 `dbInitRoutes.js`，用于初始化数据库：

```javascript
// backend/src/routes/dbInitRoutes.js
import { Router } from 'express';
import prisma from '../utils/prisma.js';
import seed from '../../prisma/seed.js';
import seedUndergraduate from '../../prisma/seed-undergraduate.js';
import seedUsers from '../../prisma/seed-users.js';

const router = Router();

router.post('/init', async (req, res) => {
  try {
    await prisma.$executeRaw`SELECT 1`;
    await seed.default(prisma);
    await seedUndergraduate.default();
    await seedUsers.default();
    res.json({ ok: true, message: '数据库初始化完成' });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

export default router;
```

然后在 `backend/src/server.js` 中临时添加：
```javascript
import dbInitRoutes from './routes/dbInitRoutes.js';
app.use('/api/db-init', dbInitRoutes);
```

部署后访问 `POST https://你的域名.vercel.app/api/db-init/init` 初始化数据库。

**⚠️ 注意：初始化完成后请删除这个临时路由！**

**方式 C：在本地或服务器上运行脚本（最安全）**
```bash
cd 2027spring-exam/backend
npx prisma db push --accept-data-loss
node prisma/seed.js
node prisma/seed-undergraduate.js
node prisma/seed-users.js
```

### 4. 域名和 HTTPS

- Vercel 自动提供 HTTPS 和 `*.vercel.app` 域名
- 如果使用自定义域名，需在 Vercel 项目设置 → Domains 中添加
- CORS 已配置为允许 `https://www.day-money-made.icu`，如需使用其他域名请同步修改

---

## 🚀 快速部署步骤

### 第一步：在 Vercel 导入项目

1. 打开 [Vercel Dashboard](https://vercel.com/dashboard)
2. 点击 `Add New...` → `Project`
3. 从 GitHub 导入 `clipsone/guangdongstudyforme`
4. **Root Directory**：保持默认 `.` 即可，Vercel 会自动检测 monorepo
5. **Framework Preset**：选择 `Other`
6. **Build Command**：保持 `vercel.json` 中的配置（已自动读取）
7. **Output Directory**：保持 `frontend/dist`（已自动读取）

### 第二步：配置环境变量

在 `Settings` → `Environment Variables` 中添加：

```
DATABASE_URL=postgresql://用户名:密码@host:5432/数据库名?schema=public
ZHIPU_API_KEY=你的API密钥（可选）
AI_MODEL=deepseek-v4-flash（可选）
NODE_ENV=production
```

### 第三步：触发部署

点击 `Deploy`，等待构建完成。Vercel 会自动：
1. 安装依赖（`npm ci`）
2. 生成 Prisma Client
3. 构建前端（`npm run build`）
4. 部署到全球 CDN

### 第四步：初始化数据库

部署成功后，访问一次后端 API 触发服务启动，然后：

**推荐方式（最稳定）**：
在有 PostgreSQL 连接的环境中运行：
```bash
cd backend
npx prisma db push --accept-data-loss
node prisma/seed.js
node prisma/seed-undergraduate.js
node prisma/seed-users.js
```

可以临时用一个云函数、Render Worker 或你本机运行：
```bash
# 在本地或服务器上执行（需要 DATABASE_URL 指向 Vercel 使用的同一个数据库）
export DATABASE_URL="postgresql://用户名:密码@host:5432/数据库名?schema=public"
cd backend
npx prisma generate
npx prisma db push --accept-data-loss
node prisma/seed.js
node prisma/seed-undergraduate.js
node prisma/seed-users.js
```

### 第五步：验证部署

```
✅ 前端：https://你的项目.vercel.app
✅ 后端健康检查：https://你的项目.vercel.app/api/health
✅ 登录测试：springexam / spring2027（春考模式）
✅ 登录测试：undergrad / undergrad2027（本科模式）
```

---

## 🔧 常见问题

### 1. 构建失败：`prisma generate` 找不到 schema

如果构建时提示找不到 Prisma schema：
- 检查 `vercel.json` 中的 `buildCommand` 路径是否正确
- 确认 `backend/prisma/schema.prisma` 存在
- 手动指定：`npx prisma generate --schema backend/prisma/schema.prisma`

### 2. 数据库连接失败

- 确认 `DATABASE_URL` 已添加且在 Vercel 环境变量中
- 确认 PostgreSQL 支持外部连接（不是仅限本地）
- 推荐使用：Vercel Postgres、Supabase、Neon、Render Postgres

### 3. 前端路由返回 404

Vercel 的 SPA fallback 已配置，但如果遇到问题：
- 确认 `rewrites` 规则正确：`/` → `/index.html`
- 确认 `outputDirectory` 指向 `frontend/dist`

### 4. CORS 错误

- 确认 `CORS_ORIGIN` 环境变量包含你的域名
- 如需允许所有来源（仅测试用），将 `CORS_ORIGIN` 改为 `*`

---

## 📝 待完成事项

- [ ] 采购 PostgreSQL 数据库服务（推荐 Neon 或 Supabase 免费层）
- [ ] 在 Vercel 配置环境变量
- [ ] 运行数据库初始化脚本
- [ ] 自定义域名绑定（可选）
- [ ] 删除临时数据库初始化路由（如创建）
- [ ] 添加网站访问统计（Google Analytics 等）

---

## 🎯 测试账号

| 账号 | 密码 | 模式 | 描述 |
|------|------|------|------|
| springexam | spring2027 | 春考 | 语文/数学/英语 |
| undergrad | undergrad2027 | 本科 | CET/雅思/托福/法律/大学课 |
| admin | admin123 | 管理员 | 后台管理 |

---

## 📞 技术支持

- GitHub 仓库：https://github.com/clipsone/guangdongstudyforme
- 力扣 ID：clipsone（有问题欢迎联系）
