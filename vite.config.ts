import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/postcss'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  css: {
    postcss: {
      plugins: [
        tailwindcss(),
      ],
    },
  },
  server: {
    port: parseInt(process.env.VITE_PORT || '5175'),
    strictPort: true,
    proxy: {
      '/api': {
        target: process.env.VITE_BACKEND_TARGET || 'http://127.0.0.1:3003',
        changeOrigin: true,
      },
      '/socket.io': {
        target: process.env.VITE_BACKEND_TARGET || 'http://127.0.0.1:3003',
        ws: true,
        changeOrigin: true,
      },
    },
  },
})
