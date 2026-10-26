import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"
import path from "path"

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@workspace/gdna-ds/tokens": path.resolve(__dirname, "./src/lib/tokens.ts"),
      "@workspace/gdna-ds": path.resolve(__dirname, "./src/lib/tokens.ts"),
    }
  }
})
