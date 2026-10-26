import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@workspace/gdna-ds": path.resolve(__dirname, "src/lib/gdna-ds"),
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
