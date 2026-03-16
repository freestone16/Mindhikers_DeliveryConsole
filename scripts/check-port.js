#!/usr/bin/env node
/**
 * Port Check Utility
 *
 * 检查端口是否被占用
 * 用于开发启动前验证
 */

import http from 'http';
import { getRuntimePorts } from './runtime-env.js';

const { backendPort, frontendPort } = getRuntimePorts();
const PORTS = [backendPort, frontendPort];

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
    server.on('error', async (error) => {
      if (error && (error.code === 'EACCES' || error.code === 'EPERM')) {
        resolve({ port, status: 'restricted', process: null, reason: error.code });
        return;
      }

      // 尝试找到占用端口的进程
      const { spawn } = await import('child_process');
      try {
        const proc = spawn('lsof', ['-ti', `:${port}`], { stdio: 'pipe' });
        let output = '';
        proc.stdout.on('data', (d) => output += d);
        await new Promise(r => proc.on('close', r));
        const pid = output.trim();
        resolve({ port, status: 'occupied', process: pid || 'unknown', reason: error?.code || null });
      } catch (e) {
        resolve({ port, status: 'occupied', process: null, reason: error?.code || null });
      }
    });
  });
}

async function main() {
  console.log('🔍 检查端口占用...\n');

  let hasRealConflict = false;
  let hasRestrictedPort = false;

  for (const port of PORTS) {
    const result = await checkPort(port);
    const icon = result.status === 'free' ? '✅' : result.status === 'restricted' ? '⚠️' : '❌';
    const processInfo = result.process ? ` (PID: ${result.process})` : '';
    const reasonInfo = result.reason ? ` [${result.reason}]` : '';

    console.log(`${icon} 端口 ${port}: ${result.status}${processInfo}${reasonInfo}`);

    if (result.status === 'occupied') {
      hasRealConflict = true;
    }

    if (result.status === 'restricted') {
      hasRestrictedPort = true;
    }
  }

  if (hasRealConflict) {
    console.log('\n💡 提示：运行 npm run dev:clean 清理残留进程');
    console.log('    或者运行 npm run dev:force 强制清理并启动');
    process.exit(1);
  }

  if (hasRestrictedPort) {
    console.log('\n⚠️ 当前环境禁止绑定本地端口，结果仅供参考；未检测到明确的 EADDRINUSE 冲突。');
    process.exit(0);
  }

  console.log('\n✨ 所有端口可用，可以启动开发服务器');
  process.exit(0);
}

main().catch(console.error);
