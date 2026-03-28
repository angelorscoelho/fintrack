import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { readFileSync } from 'fs'

// Load shared project constants at build time — single source of truth
const thresholdsRaw = readFileSync(
  path.resolve(__dirname, '../shared/project_constants.json'),
  'utf-8'
)

export default defineConfig({
  base: '/poc/fintrack/',
  plugins: [react()],
  define: {
    __THRESHOLDS__: thresholdsRaw,
  },
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') }
  },
  server: {
    port: 5173,
    proxy: {
      '/api': { target: 'http://localhost:8000', changeOrigin: true },
    }
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    rollupOptions: {
      output: {
        assetFileNames: 'assets/[name]-[hash][extname]',
        chunkFileNames: 'assets/[name]-[hash].js',
        entryFileNames: 'assets/[name]-[hash].js',
      }
    }
  }
})
