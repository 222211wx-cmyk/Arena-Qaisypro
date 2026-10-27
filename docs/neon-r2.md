# Neon / R2 clip endpoints

These are server-only Vercel Functions, independent of the existing Vite/Supabase UI.
They do not replace the UI's current clip data source.

- `GET /api/clips/:id`: clip metadata, numeric likes/bookmarks, stream URL.
- `GET /api/clips/stream?id=1&variant=original`: streams R2; `mobile` falls back to original.
- Single HTTP byte ranges are forwarded to R2. Full requests record a view (not unique viewers).

Required Production variables: `DATABASE_URL`, `R2_ENDPOINT`, `R2_ACCESS_KEY_ID`,
`R2_SECRET_ACCESS_KEY`, `R2_BUCKET`. Configure in project Settings → Environment Variables.
Never prefix these credentials with `VITE_`. Redeploy after configuration changes.

Database schema must supply `clips.id`, `clip_original.clip_id/object_r/object_mobile_r`,
`clip_likes.clip_id`, `clip_bookmarks.clip_id`, and `clip_views.clip_id` (remaining
insert columns must have defaults). No migrations or seeded counts are applied.

These endpoints expose public clip data, as in the supplied API design. If clips are
private, add application authorization before using them for those clips. Responses
are not publicly cached. Errors do not expose database or storage details.

Validation: `npx tsc -p tsconfig.server.json --noEmit` and `npx vitest run server`.
