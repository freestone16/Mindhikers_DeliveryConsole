/**
 * Health Check Module
 *
 * 提供健康检查端点，用于监控服务器状态
 */

import express from 'express';
import fs from 'fs';
import path from 'path';

/**
 * 设置健康检查路由
 */
export function setupHealthCheck(app: express.Express): void {
  const router = express.Router();

  // GET /health - 基础健康状态
  router.get('/', (req, res) => {
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      env: process.env.NODE_ENV || 'development',
      node: process.version
    });
  });

  // GET /health/ready - 就绪检查
  router.get('/ready', (req, res) => {
    const checks = {
      config: checkFileExists(path.join(process.cwd(), '.env')),
      skills: checkDirectoryExists(path.join(process.cwd(), 'skills')),
      server: true
    };

    const ready = Object.values(checks).every(v => v);

    res.status(ready ? 200 : 503).json({
      status: ready ? 'ready' : 'not_ready',
      checks,
      timestamp: new Date().toISOString()
    });
  });

  // GET /health/live - 存活检查
  router.get('/live', (req, res) => {
    res.json({
      status: 'alive',
      timestamp: new Date().toISOString()
    });
  });

  // 注册路由
  app.use('/health', router);
}

/**
 * 检查目录是否存在
 */
function checkDirectoryExists(dir: string): boolean {
  try {
    return fs.existsSync(dir) && fs.statSync(dir).isDirectory();
  } catch {
    return false;
  }
}

/**
 * 检查文件是否存在
 */
function checkFileExists(file: string): boolean {
  try {
    return fs.existsSync(file) && fs.statSync(file).isFile();
  } catch {
    return false;
  }
}
