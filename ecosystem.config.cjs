/**
 * PM2 Ecosystem Configuration
 *
 * 生产环境进程管理配置
 */

module.exports = {
  apps: [
    {
      name: 'delivery-backend',
      script: 'node',
      args: 'dist/server/index.js',
      cwd: '/Users/luzhoua/DeliveryConsole',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '500M',
      env: {
        NODE_ENV: 'production',
        PORT: 3002
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
      args: 'vite preview --host',
      cwd: '/Users/luzhoua/DeliveryConsole/dist',
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
