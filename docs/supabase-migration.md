> Superseded for the current standalone deployment: see `standalone-demo.md`.
> The notes below describe optional backend migration preparation, not runtime requirements.

# Supabase/backend preparation — not a completed production migration

## Inventory

The inspected main commit contained no `.env`, `.env.example`, Replit DB import,
Drizzle/Prisma schema, server source, or API handlers. The Vercel variable listing
for this project was empty. Replit Secrets are not available through this session.
No credential values have been read, copied into source, or printed.

## Implemented

- Requested API/assets exclusions before the SPA rewrite. These self-rewrites do
  NOT create API handlers; without a backend, `/api/*` still cannot work.
- Supabase client and real GlobalStar public reads. Missing configuration and DB
  failures report errors rather than pretend to be a successful empty backend.
- Draft schema and matching initial migration, inferred from frontend types.
  Run **either** schema.sql on a new database **or** the migration, not both.
  No Replit data export/import or existing account migration has been performed.
- RLS on every table: public content is read-only; user/session/vote tables deny
  browser access. Never grant browser writes to balances, admin flags or rewards.
- API JSON diagnostics before parsing HTML, plus an optional backend origin for
  existing API calls, including the GDNA adapter. The section error boundary
  displays the thrown error with retry. Session checks remain fail-closed.

## Required configuration

In Vercel, select **Arena-Qaisypro → Environment Variables** and add
`VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` from the Supabase project. They are
public browser configuration. Placeholder names are in `.env.example`; blank
values intentionally leave the client unconfigured instead of inventing a URL.
Enable the appropriate Preview/Production scopes and redeploy after setting them.

If restoring the original backend elsewhere, set `VITE_API_URL` to its HTTPS
origin, with no `/api` suffix. It must implement the original `/api/*` contracts,
including username/password cookie sessions, GDNA provider selection, quotas,
account memory, balance settlement, and privileged admin/recovery operations.
Cross-origin cookie auth requires explicit frontend origins in credentialed CORS,
secure cookie settings and browser support; a same-site API is preferable.
The Vite dev config had no proxy; the origin option applies in development too.

`SUPABASE_SERVICE_ROLE` (or the backend's chosen service-role variable) and
`GDNA_API_KEY` are server-only secrets, not browser configuration. This frontend
has no code consuming them. Do not set `VITE_` variants. The GDNA server/provider
implementation is missing, so its actual provider keys and endpoint cannot be
inferred. GDNA is already initialized by `useGdnaStatus` on the chat page; no
client switch or startup call can activate a missing authenticated service.

Optional existing Firebase features reference these public names (none were configured):
`VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_PROJECT_ID`,
`VITE_FIREBASE_STORAGE_BUCKET`, `VITE_FIREBASE_MESSAGING_SENDER_ID`,
`VITE_FIREBASE_APP_ID`, `VITE_FIREBASE_MEASUREMENT_ID`, `VITE_FIREBASE_VAPID_KEY`.
They do not activate the missing GDNA backend.

## Still blocked — do not treat this PR as production-ready

Restore the backend source and actual Replit model definitions, then map the
existing identities/session protocol to Supabase Auth (managed `auth.users` and
`auth.sessions`). The public `sessions` table is metadata only, not a replacement
for these protocols. Original passwords and existing sessions are not migrated.
No Replit database imports exist to replace in this checkout.
Review the inferred schema against the real models before applying it. Add data
migration, authenticated vote/quota rules, transactional reward operations and
GDNA server/provider configuration. Legacy privileged operations still explicitly
reject; they never pretend to save data. No provider has been activated.

Live API, Supabase RLS and production session/GDNA verification require the actual
backend, database configuration and a browser/runtime with network access. A
successful static build alone proves none of these services work.
