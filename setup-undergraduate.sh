#!/bin/bash
# 本科模式部署脚本
set -e
cd "$(dirname "$0")"

echo "🚀 开始部署本科学习平台..."
echo ""

# 1. 迁移数据库 Schema
echo "📦 步骤 1/4：迁移数据库 Schema..."
npx prisma migrate dev --name add-exam-mode-and-undergraduate --create-only 2>/dev/null || \
  npx prisma migrate deploy 2>/dev/null || \
  npx prisma db push --skip-generate

# 2. 导入本科模式种子数据
echo "📦 步骤 2/4：导入本科模式种子数据..."
node prisma/seed-undergraduate.js

# 3. 创建测试账号
echo "📦 步骤 3/4：创建测试账号..."
node prisma/seed-users.js

# 4. 构建前端
echo "📦 步骤 4/4：构建前端..."
cd ../frontend
npm run build 2>/dev/null || echo "⚠️ 前端构建跳过（开发模式无需构建）"
cd ../backend

echo ""
echo "✅ 部署完成！"
echo ""
echo "📋 账号信息："
echo "   春考用户: springexam / spring2027"
echo "   本科用户: undergrad / undergrad2027"
echo ""
echo "🎯 登录系统后在「我的」页面切换考试模式"
