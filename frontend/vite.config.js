import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"
import { resolve } from "path"

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: resolve(__dirname, "../app/dist"), // 🚀 send build output into app/dist
    emptyOutDir: true, // clear before building
    chunkSizeWarningLimit: 1500, // ✅ raise limit to 1.5 MB to silence the 500 kB warning
  },
  server: {
    historyApiFallback: true, // ✅ fixes client-side routing in development
  },
  preview: {
    historyApiFallback: true, // ✅ fixes client-side routing in preview mode
  },
})
