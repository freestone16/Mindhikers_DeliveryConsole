import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/postcss'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const frontendPort = Number(env.VITE_APP_PORT || 5176);
  const backendTarget = env.VITE_BACKEND_TARGET || `http://127.0.0.1:${env.PORT || 3004}`;

  return {
    plugins: [react()],
    css: {
      postcss: {
        plugins: [
          tailwindcss(),
        ],
      },
    },
    server: {
      host: true,
      port: frontendPort,
      strictPort: true,
      proxy: {
        '/api': {
          target: backendTarget,
          changeOrigin: true,
        },
        '/socket.io': {
          target: backendTarget,
          ws: true,
          changeOrigin: true,
        },
      },
    },
  }
})
