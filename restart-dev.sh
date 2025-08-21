#!/bin/bash

echo "🔄 正在重启个人数据看板..."

# 进入前端目录
cd "$(dirname "$0")/frontend" || exit 1

# 杀死可能还在运行的进程
echo "⏹️  停止现有服务器..."
pkill -f "react-scripts start" 2>/dev/null || true
pkill -f "node.*start" 2>/dev/null || true

# 等待一下确保进程完全停止
sleep 2

echo "🚀 启动前端开发服务器..."
npm start &

# 等待服务器启动
echo "⏳ 等待服务器启动..."
sleep 10

# 检查服务器是否成功启动
if curl -s http://localhost:3000 > /dev/null; then
    echo "✅ 服务器启动成功！"
    echo "🌐 请访问: http://localhost:3000"
    echo "📱 你的个人数据看板已就绪!"
else
    echo "⚠️  服务器可能还在启动中，请稍等片刻后访问 http://localhost:3000"
fi

echo ""
echo "💡 提示: 使用 Ctrl+C 停止服务器"
echo "🔧 如需重启，再次运行此脚本: ./restart-dev.sh" 