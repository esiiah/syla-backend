import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"
import { resolve } from "path"

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: resolve(__dirname, "../app/dist"), // 🚀 send build output into app/dist
    emptyOutDir: true, // clear before building
  },
  server: {
    historyApiFallback: true, // ✅ This fixes client-side routing in development
  },
  preview: {
    historyApiFallback: true, // ✅ This fixes client-side routing in preview mode
  },
})
