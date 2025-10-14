// vite.config.js
import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"
import { resolve } from "path"

export default defineConfig({
  plugins: [react()],
  base: '/',
  publicDir: 'public', // Explicitly set public directory
  build: {
    outDir: resolve(__dirname, "dist"),
    emptyOutDir: true,
    chunkSizeWarningLimit: 5000,
    // Copy public assets to dist
    copyPublicDir: true,
  },
  server: {
    port: 5173,
    strictPort: false,
    // Add proxy configuration for development
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
        secure: false,
      }
    }
  },
  preview: {
    port: 5173,
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    }
  }
})