import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  base: './',
  plugins: [react()],
  optimizeDeps: {
    include: ['react-icons/fi', 'qrcode.react']
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    minify: 'esbuild',
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'chart-vendor': ['chart.js', 'react-chartjs-2'],
          'doc-vendor': ['jspdf', 'jspdf-autotable', 'html2canvas'],
          'excel-vendor': ['xlsx'],
          'icons': ['react-icons/fi', 'lucide-react']
        }
      }
    },
    chunkSizeWarningLimit: 1500
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:5115',
        changeOrigin: true,
        secure: false,
      },
      '/uploads': {
        target: 'http://localhost:5115',
        changeOrigin: true,
        secure: false,
      }
    }
  }
})
