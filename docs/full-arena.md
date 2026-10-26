# Full Arena entry and backend configuration

The full React shell is the default regardless of environment keys, network
speed, data-saving settings, or operator referrals. Old `/lite` bookmarks open
full Arena home. Dedicated clip entry points remain isolated for uploads/playback.
Lite source remains for historical/offline components; it is not an app fallback.
The existing navy/gold/blue styling and banner removal remain unchanged.

Standalone interception is disabled. API requests now reach the backend, and
identity comes from `/api/auth/me`, not a locally invented Guest account. Failed
sessions leave the shell visible and expose an authentication error through the
existing auth context; failed login never creates a local authenticated user.
Supabase reads require configuration, and privileged writes fail closed instead
of incrementing fake votes. This does not implement the missing Arena backend.

## Environment setup

Vercel project → Settings → Environment Variables (Production and Preview):

- `VITE_SUPABASE_URL`: public Supabase project URL.
- `VITE_SUPABASE_ANON_KEY`: public anon/publishable key, with reviewed RLS policies.
- `VITE_API_URL`: existing Arena backend HTTPS origin, without `/api` or a path.

The Vite build also accepts `SUPABASE_URL` and `SUPABASE_ANON_KEY` and explicitly
maps only those two public values into the browser. Nonempty prefixed values win.
Browser `process.env` fallbacks are not needed and would not read Replit Secrets.
Presence-only startup diagnostics never print values or the full environment.
Rebuild after changing variables; Replit/Goblet secrets do not automatically sync.

Do not prefix a Supabase service-role key, GDNA provider key or GDNA secret with
`VITE_`. Those belong on the authenticated backend, never in browser assets.
No Replit/Goblet Secrets can be read by this repository or this session.

## Remaining production requirements

This repository has no server implementation of the original session, GDNA,
financial, messaging, recovery or privileged API contracts. `VITE_API_URL` must
point to that restored backend; without it the SPA rewrite returns HTML for API
requests, which is diagnosed rather than replaced with demo results. Cross-origin
sessions need credentialed CORS and appropriately secured cookies. Supabase keys
alone do not restore those services. Existing recovery/password integrations
remain explicitly unavailable rather than pretending to succeed.

Publishing this PR does not merge it, update production aliases, migrate accounts,
apply Supabase SQL/RLS, or prove live authentication/AI functionality.
