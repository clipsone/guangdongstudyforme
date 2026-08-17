# 2027春考·精准冲刺 🎯

面向 **2027 年广东春季高考（依学考录取）** 的个人 AI 驱动型复习网站（单用户）。

> 命题依据：《普通高中课程标准（2017 年版 2020 年修订）》，只考必修内容。
> 核心变化：数学 🆕新增复数/逻辑用语/百分位数、🗑️删除数列/直线与圆；语文题型分值调整；英语 🆕新增"五选五"阅读还原题。

## ✨ 功能一览

| 模块 | 说明 |
|---|---|
| 📖 知识图谱 | 三科 114 个考点（章节→考点），标注频次/难度/掌握状态/🆕新增/🗑️已删/前置依赖 |
| ✏️ 智能练习 | 智能组卷（薄弱考点覆盖≥60%）、按考点专项、错题重练；自动判分+解析+AI小结 |
| 📕 错题本 | 自动收录、按考点/错因筛选、连续答对2次自动"已消化" |
| 🧠 背诵记忆 | 语文 12 篇必背篇目（完整原文+易错字）、英语 500 核心词汇、数学 50 张公式卡；艾宾浩斯 1/2/4/7/15 天复习排期 |
| 📊 进度追踪 | 三科掌握度环形图、五维雷达图、模考进步曲线、每日任务清单、里程碑 |
| 🏅 成就系统 | 11 枚徽章自动解锁（打卡/刷题/背诵/模考/错题清零） |
| 🤖 AI 辅导 | 知识点讲解 / 解题助手 / 作文批改 / 自由问答（**Gemini 预留，未配置时自动 mock**） |

## 🛠️ 技术栈

- **前端**：React 18 + TypeScript + Vite + TailwindCSS + React Router + ECharts + lucide-react
- **后端**：Node.js + Express（ESM）+ Prisma
- **数据库**：PostgreSQL 16（可切换 SQLite 快速体验）
- **AI**：Gemini API（`GEMINI_API_KEY` 未配置时走 mock）

## 📁 目录结构

```
├── server/                    # 后端
│   ├── prisma/
│   │   ├── schema.prisma      # 25 张表
│   │   ├── seed.js            # 种子导入
│   │   └── seed-data/         # 种子数据（知识图谱/300题/篇目/词汇/公式）
│   └── src/
│       ├── index.js / app.js
│       ├── routes/            # 11 组 REST 路由
│       ├── controllers/       # 控制器
│       ├── services/          # 掌握度/艾宾浩斯/组卷/任务/AI/成就
│       └── middleware/
├── client/                    # 前端
│   └── src/
│       ├── pages/             # 6 个页面
│       ├── components/        # 布局/图表/抽屉
│       ├── api/ types/ context/ data/ utils/
├── docker-compose.yml         # PostgreSQL
└── .env.example
```

## 🚀 快速启动（Mac）

前置：Node.js ≥ 18（推荐 20+）、PostgreSQL（或 Docker）。

### 1. 启动数据库（二选一）

**方式 A：Docker（推荐）**
```bash
docker compose up -d
```

**方式 B：本机 PostgreSQL**
```bash
createdb ck2027
# 或用你已有的实例，改 server/.env 的 DATABASE_URL 即可
```

### 2. 初始化后端

```bash
cd server
cp ../.env.example .env        # 按需修改
npm install
npm run prisma:generate         # 生成 Prisma Client
npm run prisma:push             # 建表（相当于 migrate）
npm run seed                    # 导入种子数据（知识图谱/300题/背诵数据）
npm run dev                     # 启动后端 http://localhost:4000
```

> 一键：`npm run db:setup`（prisma:push + seed）

### 3. 启动前端

```bash
cd client
npm install
npm run dev                     # http://localhost:5173
```

打开 http://localhost:5173 即可使用。

### 4. 配置 Gemini（可选）

编辑 `server/.env`：
```env
GEMINI_API_KEY=你的密钥
GEMINI_MODEL=gemini-1.5-flash
```
不配置则 AI 功能返回 mock 讲解/批改（演示可用）。

## 🔌 API 一览（前缀 /api）

| 方法 | 路径 | 说明 |
|---|---|---|
| GET | /knowledge?subject= | 知识图谱 |
| GET | /knowledge/:id | 考点详情（含前置依赖） |
| GET | /questions?knowledge=&type=&difficulty= | 题库 |
| POST | /exercises | 提交练习（判分+错题+掌握度） |
| POST | /exercises/generate | 智能组卷 |
| POST | /exercises/wrong-paper | 错题重练卷 |
| GET | /wrong-questions?subject=&reason= | 错题本 |
| POST | /wrong-questions/:id/review | 错题重练提交 |
| GET | /exams/templates ｜ POST /exams ｜ POST /exams/:id/submit | 模考 |
| GET | /recitation?category=&due=1 ｜ POST /recitation/records | 背诵 + 艾宾浩斯 |
| GET | /study-tasks ｜ POST /study-tasks/:id/complete | 每日任务 |
| GET | /statistics/dashboard ｜ /progress ｜ /radar | 统计 |
| POST | /ai/explain ｜ /ai/tutor ｜ /ai/essay-review ｜ /ai/chat | AI（mock/Gemini） |
| GET | /achievements | 成就 |
| GET/POST | /resources | 资料库 |

## ⚙️ 核心业务逻辑

- **掌握度**：近 7 天正确率 ≥80% 且 ≥5 题 → 已掌握；<40% → 需强化（`services/mastery.service.js`）
- **错题**：做错自动入错题本；重练连续答对 2 次 → 已消化
- **艾宾浩斯**：第 1→2→4→7→15 天；未通过（<80 分）重置第 1 天（`services/recitation.service.js`）
- **智能组卷**：薄弱考点池加权抽取，难度配比 4:4:2（`services/paper.service.js`）
- **每日任务**：每日 0 点/启动时懒生成（薄弱练习 + 背诵到期 + 错题重练）（`services/task.service.js`）

## ⚠️ 重要提示

1. 考试日期默认 **2027-01-10**（`EXAM_DATE` 可配置），**以广东省教育考试院官方公布为准**；
2. 题型/分值/必背篇目数量以官方当年文件为准，本项目为参考实现；
3. 题目种子由 AI 辅助生成，建议使用前抽查校对；
4. 单用户设计：后端固定使用用户 id=1（种子自动创建）。

## 📄 配套文档

- `PRD-2027春考·精准冲刺` 产品需求文档（知识图谱全量结构、AI 提示词模板、数据库设计、UI 草图）

---

## 🆕 精简版实现：`2027spring-exam/`

> 目录 `server/ + client/` 为完整版参考实现；`2027spring-exam/` 为重构精简版（React + TS + Vite + Express + Prisma + PostgreSQL），本机零依赖即可运行（内置嵌入式 PostgreSQL，无需 Docker/Homebrew）。

### 首次启动

```bash
cd 2027spring-exam/backend
npm install
npm install --save-dev embedded-postgres   # 嵌入式 PostgreSQL（macOS 自动下载对应二进制）
node scripts/db.mjs start                   # 初始化并启动本地 PostgreSQL（端口 5432，长期保持运行）
npx prisma generate && npx prisma db push   # 生成 Client 并建表
node prisma/seed.js                         # 导入种子：125 考点 / 155 题 / 562 背诵项 / 每日任务
npm run dev                                 # 后端 http://localhost:3001
```

```bash
cd 2027spring-exam/frontend
npm install
npm run dev                                 # 前端 http://localhost:5173（已代理 /api → 3001）
```

### 数据说明

- 种子题目与背诵数据由 `seed/build-extra-seeds.mjs` 从完整版 `server/prisma/seed-data` 自动移植生成（`seed-questions.json` / `seed-recitation.json`）；
- 重复执行 `seed.js` 会先清空业务数据再导入，可安全重跑；
- 数据库目录 `backend/.pgdata`，停库：`node scripts/db.mjs stop`（重启后需重新 `node scripts/db.mjs start`）。

### 页面路由

| 路径 | 页面 |
|---|---|
| `/` | 首页（倒计时/今日任务/三科掌握度/里程碑） |
| `/learn` | 学习（知识图谱，按科目/章节/考点，AI 讲解） |
| `/practice` | 练习（智能组卷「薄弱考点加权」/ 按考点 / 错题重练，自动判分+错题收录+AI 小结） |
| `/exam` | 全真模考（三科模板、限时答题、整卷判分、模考记录） |
| `/wrong` | 错题本（重练、连续答对 2 次消化） |
| `/recitation` | 背诵（语文篇目/英语词汇/数学公式，艾宾浩斯排期） |
| `/ai` | AI 辅导（解题助手 / 知识点讲解 / 作文批改+作文库 / 自由问答+历史，演示模式） |
| `/insights` | 数据洞察（学习诊断 / 每周报告 / 掌握度趋势） |
| `/resources` | 学习资料库（文档/视频/音频收藏） |
| `/profile` | 个人中心（进步曲线/五维雷达/最近练习/成就徽章墙/目标设置/数据导出） |

### 成就系统

练习、背诵、任务、模考等操作后自动判定解锁 9 枚徽章（初试锋芒/刷题达人/百题斩/错题清零/背诵启航/记忆大师/自律之星/模考首战/科目精通），在个人中心查看。

### 每日任务

每天首次打开首页时自动按薄弱考点生成当日任务（专项练习 + 错题复习 + 背诵打卡），无需手动创建；任务打卡可解锁成就。

### 学习时长

练习交卷、模考交卷时自动记录真实用时（`/api/study-sessions`），首页显示"今日学习时长"，个人中心雷达图的时长维度随记录累计。

### 题库说明

- 共 **261 题**：语文 75 + 数学 67（`seed/seed-questions-math.json`，含难度 1–5）+ 英语 119；
  - 数学 67 题覆盖 M1–M10 全部章节，含导数/圆锥曲线/概率统计等中高难度题；
  - 语文/英语补充 39 题（`seed/seed-questions-extra.json`）：古诗文默写、文言实虚词、病句成语、文化常识、语法填空、阅读、五选五；
- 模考模板按题型从题库抽题，每科均可独立组卷。

### 数据洞察

- **学习诊断**：按科目聚合练习/模考/错题/掌握度，输出总评、薄弱考点与建议（`/api/diagnostics`）；
- **每周报告**：本周练习量、正确率、学习时长、亮点与下周建议（`/api/weekly-reports`）；
- **掌握度趋势**：练习/模考后每周自动记录各科掌握度快照，绘制历史曲线（`/api/statistics/mastery-history`）；
- **五维雷达**：掌握度 / 正确率 / 投入时长 / 稳定性 / 冲刺进度。

## 🌐 部署到云端（随时随地访问）

### 架构

- **GitHub**：代码仓库（版本管理 + 自动触发部署）
- **Vercel**：托管前端静态文件 + 后端 API（Serverless 函数）
- **Neon**：免费云端 PostgreSQL（数据持久化）

### 部署步骤（一次性）

1. **推代码到 GitHub**
   ```bash
   git remote add origin https://github.com/<你的用户名>/<仓库名>.git
   git branch -M main
   git push -u origin main
   ```

2. **创建 Neon 免费数据库**（neon.tech，GitHub 登录）
   - New Project → 复制 **Pooled 连接串**（`postgresql://...?sslmode=require`）
   - 本地初始化云端库（推送 schema + 261 道题库）：
     ```bash
     cd backend
     DATABASE_URL="<Neon Pooled连接串>" npm run db:setup
     ```

3. **Vercel 导入部署**（vercel.com，GitHub 登录 → Add New → Project）
   - 导入仓库 → 环境变量填三项：
     ```
     DATABASE_URL=<Neon Pooled连接串>
     ZHIPU_API_KEY=<智谱Key>
     AI_PROVIDER=glm
     ```
   - Deploy 后即可通过 `https://<项目名>.vercel.app` 访问

4. **以后每次 push 到 main 自动重新部署**；本地开发不受影响（`npm run dev:backend` + `npm run dev:frontend`）

> ⚠️ `.env`、`.pgdata`、`node_modules` 已加入 `.gitignore`，密钥不会上传仓库。

### 其他

- **资料库** `/api/resources`：文档/视频/音频条目 CRUD；
- **作文库** `/api/essays`：保存作文并自动 AI 批改落库，历史批改可回看；
- **数据导出** `/api/export`：练习、错题、背诵、模考、任务、成就一键导出 JSON 备份；
- AI 聊天历史持久化（`/api/ai/chat/history`），刷新不丢失。
