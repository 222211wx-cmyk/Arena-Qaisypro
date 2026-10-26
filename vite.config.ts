import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  // Only these two public values may cross the server/browser boundary.
  const publicEnv = {
    VITE_SUPABASE_URL: env.VITE_SUPABASE_URL?.trim() || env.SUPABASE_URL?.trim() || "",
    VITE_SUPABASE_ANON_KEY: env.VITE_SUPABASE_ANON_KEY?.trim() || env.SUPABASE_ANON_KEY?.trim() || "",
  };
  return {
    define: Object.fromEntries(Object.entries(publicEnv).map(([key, value]) => [`import.meta.env.${key}`, JSON.stringify(value)])),
    plugins: [react()],
    resolve: {
      alias: {
        "@workspace/api-client-react": path.resolve(__dirname, "src/lib/workspace/api-client-react.ts"),
        "@workspace/gdna-ds": path.resolve(__dirname, "src/lib/gdna-ds"),
        "@": path.resolve(__dirname, "./src"),
      },
    },
  };
});
