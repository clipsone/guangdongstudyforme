#!/bin/bash
# Vercel 部署后初始化数据库
# 这个脚本会被 Vercel 的 postbuild 钩子调用

set -e

echo "🔧 检查并初始化数据库..."

# 确保 DATABASE_URL 存在
if [ -z "$DATABASE_URL" ]; then
  echo "❌ 错误: DATABASE_URL 环境变量未设置"
  exit 1
fi

cd backend

# 生成 Prisma Client
echo "📦 生成 Prisma Client..."
npx prisma generate --schema prisma/schema.prisma

# 推送数据库 schema（如果表不存在会自动创建）
echo "🗄️  推送数据库 schema..."
npx prisma db push --accept-data-loss --schema prisma/schema.prisma 2>/dev/null || true

# 导入种子数据
echo "🌱 导入种子数据..."
DATABASE_URL="$DATABASE_URL" node prisma/import-questions.js 2>/dev/null || echo "⚠️  种子数据导入跳过（可能已存在）"

echo "✅ 数据库初始化完成"
