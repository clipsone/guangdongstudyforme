# 双账号学习平台 — 使用指南

## 一、方案概述

### 你的账号（春考模式）
- **考试**：广东春季高考（语文/数学/英语）
- **目标分数**：450分
- **题库**：75题语文 + 67题数学 + 119题英语 = 261题

### 她的账号（本科模式）
- **考试**：CET-4、CET-6、雅思、托福、法律基础、大学通识课、论文写作
- **目标分数**：600分（四级）/ 710分（六级）
- **题库**：~200题（种子数据）+ AI可无限生成

---

## 二、快速部署

```bash
cd 2027spring-exam
# 方式1：一键部署脚本
bash setup-undergraduate.sh

# 方式2：手动步骤
cd backend
npx prisma db push                    # 更新数据库
npm run seed:undergraduate            # 导入本科题目
npm run seed-users                    # 创建测试账号
cd ../frontend && npm run build       # 构建前端（生产模式）
```

---

## 三、账号信息

| 账号 | 密码 | 模式 | 用途 |
|---|---|---|---|
| springexam | spring2027 | 春考 | 你（广东春季高考） |
| undergrad | undergrad2027 | 本科 | 她（大学英语+法律） |
| admin | admin123 | 管理员 | 后台管理 |

---

## 四、使用方式

### 方式A：两个设备，两个账号（推荐）
1. 你用自己的手机/电脑登录 `springexam`
2. 她用自己的设备登录 `undergrad`
3. 练习、错题、背诵、掌握度完全独立

### 方式B：共用设备，切换账号
1. 在「我的」页面点击「切换考试模式」
2. 系统会切换到对应科目和进度
3. 数据仍然隔离（同一账号不同模式）

---

## 五、本科科目说明

| 科目 | 代码 | 题量 | 说明 |
|---|---|---|---|
| 大学英语四级 | CET4 | ~50 | 听力/阅读/翻译/写作 |
| 大学英语六级 | CET6 | ~30 | 难度高于四级 |
| 雅思 | IELTS | ~20 | 写作+阅读样本 |
| 托福 | TOEFL | ~20 | 阅读+听力样本 |
| 法律基础 | LAW | ~40 | 宪法/民法/刑法 |
| 大学通识课 | UNIV | ~30 | 高数/语文/思修 |
| 论文写作 | PAPER | 4 | 选题/结构/引用/查重 |

---

## 六、扩展题库

### AI 批量生成（需配置 DeepSeek API）
```bash
cd backend
npm run generate:undergraduate
# 自动每类题目生成 10-20 道
```

### 手动导入真题
1. 将真题文本粘贴到「AI 辅导」页面
2. AI 自动解析生成题目入库
3. 或联系管理员后台导入

---

## 七、文件修改清单

### 数据库 Schema
- `backend/prisma/schema.prisma` — 新增 examMode、examTargets 字段

### 后端
- `backend/src/controllers/userController.js` — 支持模式切换 API
- `backend/prisma/seed-undergraduate.js` — 本科种子数据导入
- `backend/prisma/seed-users.js` — 测试账号创建
- `backend/seed/undergraduate-data.js` — 本科题目样本数据

### 前端
- `frontend/src/types/index.ts` — User 类型更新
- `frontend/src/services/userService.ts` — 支持 examMode 更新
- `frontend/src/pages/Dashboard.tsx` — 按模式显示不同科目卡片
- `frontend/src/pages/Profile.tsx` — 添加模式切换器

### 文档
- `docs/双账号方案说明.md` — 完整方案文档
- `docs/英语听力说明.md` — 听力相关说明
- `README双账号方案.md` — 本文件

---

## 八、注意事项

1. **听力题目**：当前题库暂无音频，需要上传 MP3 文件或使用外部 API
2. **论文查重**：需要接入第三方查重 API（如 Turnitin、iThenticate）
3. **法律专业深度**：如需更专业的法考题库，建议导入历年真题
4. **大学期末考试**：各科目教材不同，需要导入对应学校的往年真题
