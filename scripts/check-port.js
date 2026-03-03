#!/usr/bin/env node
/**
 * Port Check Utility
 *
 * 检查端口是否被占用
 * 用于开发启动前验证
 */

import http from 'http';

const PORTS = [3002, 5173];

/**
 * 检查端口是否可用
 */
async function checkPort(port) {
  return new Promise((resolve) => {
    const server = http.createServer();
    server.listen(port, '127.0.0.1', () => {
      server.once('close', () => resolve({ port, status: 'free', process: null }));
      server.close();
    });
    server.on('error', async () => {
      // 尝试找到占用端口的进程
      const { spawn } = await import('child_process');
      try {
        const proc = spawn('lsof', ['-ti', `:${port}`], { stdio: 'pipe' });
        let output = '';
        proc.stdout.on('data', (d) => output += d);
        await new Promise(r => proc.on('close', r));
        const pid = output.trim();
        resolve({ port, status: 'occupied', process: pid || 'unknown' });
      } catch (e) {
        resolve({ port, status: 'occupied', process: null });
      }
    });
  });
}

async function main() {
  console.log('🔍 检查端口占用...\n');

  let allFree = true;

  for (const port of PORTS) {
    const result = await checkPort(port);
    const icon = result.status === 'free' ? '✅' : '❌';
    const processInfo = result.process ? ` (PID: ${result.process})` : '';

    console.log(`${icon} 端口 ${port}: ${result.status}${processInfo}`);

    if (result.status !== 'free') {
      allFree = false;
    }
  }

  if (!allFree) {
    console.log('\n💡 提示：运行 npm run dev:clean 清理残留进程');
    console.log('    或者运行 npm run dev:force 强制清理并启动');
    process.exit(1);
  }

  console.log('\n✨ 所有端口可用，可以启动开发服务器');
  process.exit(0);
}

main().catch(console.error);
