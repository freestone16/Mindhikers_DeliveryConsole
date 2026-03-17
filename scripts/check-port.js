#!/usr/bin/env node
/**
 * Port Check Utility
 *
 * 检查端口是否被占用
 * 用于开发启动前验证
 */

const http = require('http');
const { spawn } = require('child_process');
const { loadRuntimeEnv } = require('./runtime-env');

const { frontendPort, backendPort } = loadRuntimeEnv();
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
      if (error?.code === 'EPERM' || error?.code === 'EACCES') {
        resolve({ port, status: 'restricted', process: null, reason: error.code });
        return;
      }

      // 尝试找到占用端口的进程
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
  console.log(`   后端端口: ${backendPort}`);
  console.log(`   前端端口: ${frontendPort}\n`);

  let allFree = true;

  for (const port of PORTS) {
    const result = await checkPort(port);
    const icon = result.status === 'free' ? '✅' : result.status === 'restricted' ? '⚠️' : '❌';
    const processInfo = result.process ? ` (PID: ${result.process})` : '';
    const reasonInfo = result.reason ? ` [${result.reason}]` : '';

    console.log(`${icon} 端口 ${port}: ${result.status}${processInfo}${reasonInfo}`);

    if (result.status === 'occupied') {
      allFree = false;
    }
  }

  if (!allFree) {
    console.log('\n💡 提示：运行 npm run dev:clean 清理残留进程');
    console.log('    或者运行 npm run dev:force 强制清理并启动');
    process.exit(1);
  }

  if (PORTS.length > 0) {
    console.log('\nℹ️ 若显示 restricted，通常表示当前环境禁止绑定本地端口，并非真实端口冲突');
  }

  console.log('\n✨ 所有端口可用，可以启动开发服务器');
  process.exit(0);
}

main().catch(console.error);
