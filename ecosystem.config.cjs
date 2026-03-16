/**
 * PM2 Ecosystem Configuration
 *
 * 生产环境进程管理配置
 */

const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.join(__dirname, '.env') });
dotenv.config({ path: path.join(__dirname, '.env.local'), override: true });

const backendPort = Number(process.env.PORT || process.env.VITE_BACKEND_PORT || 3005);
const frontendPort = Number(process.env.VITE_APP_PORT || process.env.VITE_PORT || 5178);

module.exports = {
  apps: [
    {
      name: 'delivery-backend',
      script: 'node',
      args: 'dist/server/index.js',
      cwd: __dirname,
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '500M',
      env: {
        NODE_ENV: 'production',
        PORT: backendPort
      },
      error_file: './logs/pm2-backend-error.log',
      out_file: './logs/pm2-backend-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      shutdown_with_message: true,
      kill_timeout: 5000,
      wait_ready: true,
      listen_timeout: 10000,
      restart_delay: 4000,
      exp_backoff_restart_delay: 100
    },
    {
      name: 'delivery-frontend',
      script: 'npx',
      args: `vite preview --host --port ${frontendPort}`,
      cwd: path.join(__dirname, 'dist'),
      instances: 1,
      autorestart: true,
      watch: false,
      env: {
        NODE_ENV: 'production'
      },
      error_file: './logs/pm2-frontend-error.log',
      out_file: './logs/pm2-frontend-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      kill_timeout: 5000,
      restart_delay: 4000
    }
  ]
};
