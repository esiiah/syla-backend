import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"
import { resolve } from "path"

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: resolve(__dirname, "dist"), // ✅ build into frontend/dist
    emptyOutDir: true,
    chunkSizeWarningLimit: 5000,
  },
  server: {
    historyApiFallback: true,
  },
  preview: {
    historyApiFallback: true,
  },
})
