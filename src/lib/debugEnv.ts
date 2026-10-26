/** Presence only: never log import.meta.env or any credential value. */
export function debugEnv() {
  console.info("ENV CHECK:", {
    SUPABASE_URL: import.meta.env.VITE_SUPABASE_URL?.trim() ? "EXISTS" : "MISSING",
    SUPABASE_KEY: import.meta.env.VITE_SUPABASE_ANON_KEY?.trim() ? "EXISTS" : "MISSING",
    ARENA_BACKEND: import.meta.env.VITE_API_URL?.trim() ? "EXISTS" : "MISSING",
  });
}
