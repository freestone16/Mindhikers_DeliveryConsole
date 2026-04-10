#!/usr/bin/env node
/**
 * Preview Server Launcher
 *
 * 启动 Roundtable 预览服务器（后端 + 前端）
 * 支持优雅关闭
 */

const { spawn } = require('child_process');
const http = require('http');
const { loadRuntimeEnv } = require('./runtime-env');

const { frontendPort, backendPort } = loadRuntimeEnv();

async function checkPort(port) {
  return new Promise((resolve) => {
    const server = http.createServer();
    server.listen(port, '127.0.0.1', () => {
      server.once('close', () => resolve(true));
      server.close();
    });
    server.on('error', (error) => {
      if (error?.code === 'EPERM' || error?.code === 'EACCES') {
        resolve(true);
        return;
      }
      resolve(false);
    });
  });
}

async function main() {
  const frontendFree = await checkPort(frontendPort);
  const backendFree = await checkPort(backendPort);

  if (!frontendFree || !backendFree) {
    console.error('❌ 端口被占用，请先运行 npm run dev:clean');
    process.exit(1);
  }

  console.log('🚀 启动预览服务器...\n');

  const backend = spawn('npx', ['tsx', 'server/index.ts'], {
    stdio: 'inherit',
    cwd: process.cwd(),
    env: { ...process.env, NODE_ENV: 'production', PORT: String(backendPort) },
  });
  console.log(`✅ 后端服务器启动: http://localhost:${backendPort}`);

  const frontend = spawn('npx', ['vite', 'preview', '--host', '--port', String(frontendPort)], {
    stdio: 'inherit',
    cwd: process.cwd(),
    env: {
      ...process.env,
      NODE_ENV: 'production',
      PORT: String(backendPort),
      VITE_APP_PORT: String(frontendPort),
      VITE_BACKEND_PORT: String(backendPort),
      VITE_API_BASE_URL: process.env.VITE_API_BASE_URL || `http://localhost:${backendPort}`,
      VITE_SOCKET_URL: process.env.VITE_SOCKET_URL || `http://127.0.0.1:${backendPort}`,
      VITE_BACKEND_TARGET: process.env.VITE_BACKEND_TARGET || `http://127.0.0.1:${backendPort}`,
    },
  });

  const shutdown = () => {
    console.log('\n📴 正在关闭服务器...');
    backend.kill('SIGTERM');
    frontend.kill('SIGTERM');
    setTimeout(() => {
      backend.kill('SIGKILL');
      frontend.kill('SIGKILL');
    }, 2000);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

main().catch(console.error);
