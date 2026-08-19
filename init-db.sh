#!/bin/bash
# 初始化 Vercel 部署的数据库
# 用法: export DATABASE_URL="你的连接串" && bash init-db.sh
set -e

echo "🗄️  数据库初始化脚本"
echo "===================="
echo ""
echo "当前 DATABASE_URL: ${DATABASE_URL:0:30}..."
echo ""

if [ -z "$DATABASE_URL" ]; then
  echo "❌ 错误: 请先设置 DATABASE_URL"
  echo "   export DATABASE_URL=\"postgresql://...\""
  exit 1
fi

echo "步骤 1: 生成 Prisma Client..."
cd backend && npx prisma generate
echo "✅ 完成"

echo ""
echo "步骤 2: 同步数据库 Schema..."
npx prisma db push --accept-data-loss
echo "✅ 完成"

echo ""
echo "步骤 3: 导入春考种子数据..."
node prisma/seed.js
echo "✅ 完成"

echo ""
echo "步骤 4: 导入本科模式种子数据..."
node prisma/seed-undergraduate.js
echo "✅ 完成"

echo ""
echo "步骤 5: 创建测试账号..."
node prisma/seed-users.js
echo "✅ 完成"

echo ""
echo "🎉 数据库初始化完成！"
echo ""
echo "测试账号:"
echo "  春考用户: springexam / spring2027"
echo "  本科用户: undergrad / undergrad2027"
echo "  管理员: admin / admin123"
echo ""
echo "访问: https://你的项目.vercel.app"
