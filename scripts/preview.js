#!/usr/bin/env node
/**
 * Preview Server Launcher
 *
 * 启动生产环境预览服务器（后端 + 前端）
 * 支持优雅关闭
 */

import { spawn } from 'child_process';
import http from 'http';
import { getRuntimePorts } from './runtime-env.js';

const { backendPort, frontendPort } = getRuntimePorts();

/**
 * 检查端口是否可用
 */
async function checkPort(port) {
  return new Promise((resolve) => {
    const server = http.createServer();
    server.listen(port, '127.0.0.1', () => {
      server.once('close', () => resolve(true));
      server.close();
    });
    server.on('error', () => resolve(false));
  });
}

async function main() {
  // 检查端口
  const frontendFree = await checkPort(frontendPort);
  const backendFree = await checkPort(backendPort);

  if (!frontendFree || !backendFree) {
    console.error('❌ 端口被占用，请先运行 npm run dev:clean');
    process.exit(1);
  }

  console.log('🚀 启动预览服务器...\n');

  // 启动后端
  const backend = spawn('node', ['dist/server/index.js'], {
    stdio: 'inherit',
    cwd: process.cwd(),
    env: { ...process.env, NODE_ENV: 'production' }
  });
  console.log(`✅ 后端服务器启动: http://localhost:${backendPort}`);

  // 启动前端
  const frontend = spawn('npx', ['vite', 'preview', '--host', '--port', String(frontendPort)], {
    stdio: 'inherit',
    cwd: process.cwd(),
    env: { ...process.env, NODE_ENV: 'production' }
  });

  // 优雅关闭
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
