/**
 * Graceful Shutdown Manager
 *
 * 负责优雅关闭服务器和清理子进程
 * 处理 SIGTERM/SIGINT 信号，确保资源正确释放
 */

import { Server as HttpServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { ChildProcess } from 'child_process';

/**
 * 优雅关闭管理器
 */
export class GracefulShutdown {
  private httpServer: HttpServer;
  private io: SocketIOServer | null = null;
  private activeProcesses = new Set<ChildProcess>();
  private shutdownTimeout = 5000; // 5秒强制关闭
  private isShuttingDown = false;

  constructor(httpServer: HttpServer) {
    this.httpServer = httpServer;
    this.setupHandlers();
  }

  setSocketIO(io: SocketIOServer) {
    this.io = io;
  }

  /**
   * 注册需要清理的子进程
   */
  registerProcess(process: ChildProcess) {
    this.activeProcesses.add(process);
    process.on('exit', () => this.activeProcesses.delete(process));
  }

  /**
   * 设置信号处理器
   */
  private setupHandlers() {
    const signals = ['SIGTERM', 'SIGINT', 'SIGUSR2'];

    signals.forEach(signal => {
      process.on(signal as NodeJS.Signals, () => {
        console.log(`\n📴 收到 ${signal} 信号，开始优雅关闭...`);
        this.shutdown(signal);
      });
    });

    // 处理未捕获异常
    process.on('uncaughtException', (error) => {
      console.error('❌ 未捕获的异常:', error);
      this.shutdown('uncaughtException');
    });

    // 处理未处理的 Promise rejection
    process.on('unhandledRejection', (reason, promise) => {
      console.error('❌ 未处理的 Promise rejection:', reason);
      // 不直接关闭，记录日志
    });
  }

  /**
   * 执行优雅关闭
   */
  private async shutdown(signal: string) {
    if (this.isShuttingDown) return;
    this.isShuttingDown = true;

    const deadline = Date.now() + this.shutdownTimeout;

    // 1. 关闭 Socket.IO 新连接
    if (this.io) {
      this.io.close();
      console.log('  ✓ Socket.IO 已关闭新连接');
    }

    // 2. 停止接受新的 HTTP 连接
    this.httpServer.close(() => {
      console.log('  ✓ HTTP 服务器已关闭');
    });

    // 3. 优雅关闭子进程
    if (this.activeProcesses.size > 0) {
      console.log(`  正在关闭 ${this.activeProcesses.size} 个子进程...`);
      const processPromises = Array.from(this.activeProcesses).map(proc => {
        return new Promise<void>((resolve) => {
          const timer = setTimeout(() => {
            proc.kill('SIGKILL');
            resolve();
          }, 2000);

          proc.once('exit', () => {
            clearTimeout(timer);
            resolve();
          });

          proc.kill('SIGTERM');
        });
      });

      await Promise.all(processPromises);
      console.log('  ✓ 子进程已关闭');
    }

    // 4. 等待待处理的请求（使用超时）
    const remaining = deadline - Date.now();
    if (remaining > 0) {
      await new Promise(r => setTimeout(r, Math.min(remaining, 1000)));
    }

    console.log(`✨ 优雅关闭完成 (${signal})`);
    process.exit(signal === 'uncaughtException' ? 1 : 0);
  }
}

/**
 * 设置全局默认的 graceful shutdown 实例
 * 可在应用启动后通过 setSocketIO 添加 Socket.IO 实例
 */
let defaultShutdownManager: GracefulShutdown | null = null;

export function createDefaultShutdown(httpServer: HttpServer): GracefulShutdown {
  defaultShutdownManager = new GracefulShutdown(httpServer);
  return defaultShutdownManager;
}

export function getShutdownManager(): GracefulShutdown | null {
  return defaultShutdownManager;
}
