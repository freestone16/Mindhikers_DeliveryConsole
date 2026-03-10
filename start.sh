#!/bin/bash

# MindHikers Delivery Console - 启动脚本

if [ -f ./.env.local ]; then
    set -a
    . ./.env.local
    set +a
fi

BACKEND_PORT=${PORT:-3004}
FRONTEND_PORT=${VITE_APP_PORT:-5176}

echo "🚀 启动 MindHikers Delivery Console..."

# 检查并清理端口占用
if lsof -Pi :56153 -sTCP:LISTEN -t >/dev/null 2>&1; then
    echo "⚠️  端口 56153 被占用，正在清理..."
    lsof -ti:56153 | xargs kill -9 2>/dev/null || true
    sleep 2
fi

# 启动后端
echo "📡 启动后端服务..."
PORT=$BACKEND_PORT node node_modules/tsx/dist/cli.mjs watch server/index.ts > /tmp/delivery-console-server.log 2>&1 &
SERVER_PID=$!
echo "✅ 后端 PID: $SERVER_PID"

# 等待后端启动
sleep 3

# 启动前端
echo "🎨 启动前端服务..."
node node_modules/vite/bin/vite.js --host --port "$FRONTEND_PORT" > /tmp/delivery-console-client.log 2>&1 &
CLIENT_PID=$!
echo "✅ 前端 PID: $CLIENT_PID"

echo ""
echo "✅ 所有服务已启动！"
echo ""
echo "📱 前端地址:"
echo "   - Local:   http://localhost:${FRONTEND_PORT}/"
echo "   - Network: http://$(hostname -I | awk '{print $1}'):${FRONTEND_PORT}/"
echo "📡 后端地址:"
echo "   - Local:   http://localhost:${BACKEND_PORT}/"
echo ""
echo "📝 日志查看:"
echo "   - 后端: tail -f /tmp/delivery-console-server.log"
echo "   - 前端: tail -f /tmp/delivery-console-client.log"
echo ""
echo "🛑 按 Ctrl+C 停止所有服务"
echo ""

# 保存 PID
echo $SERVER_PID > /tmp/delivery-console-server.pid
echo $CLIENT_PID > /tmp/delivery-console-client.pid

# 清理函数
cleanup() {
    echo ""
    echo "🛑 正在停止服务..."
    if [ -f /tmp/delivery-console-server.pid ]; then
        kill $(cat /tmp/delivery-console-server.pid) 2>/dev/null || true
    fi
    if [ -f /tmp/delivery-console-client.pid ]; then
        kill $(cat /tmp/delivery-console-client.pid) 2>/dev/null || true
    fi
    rm -f /tmp/delivery-console-server.pid /tmp/delivery-console-client.pid
    echo "✅ 服务已停止"
    exit 0
}

# 捕获退出信号
trap cleanup INT TERM

# 等待
wait
