import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"
import { resolve } from "path"

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: resolve(__dirname, "dist"),
    emptyOutDir: true,
    chunkSizeWarningLimit: 5000,
  },
  server: {
    port: 8000,  // Add this
    historyApiFallback: true,
  },
  preview: {
    port: 8000,  // Add this
    historyApiFallback: true,
  },
})
