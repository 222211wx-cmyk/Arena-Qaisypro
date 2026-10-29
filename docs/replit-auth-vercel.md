# Replit authentication on Vercel

The uploaded `api-server.zip` contains the original Express backend, not an
active Vercel route. Its `.replit-artifact/artifact.toml` starts
`artifacts/api-server/dist/index.mjs` on port 8080. The archived package scripts
build the server and start `dist/index.mjs`; its `src/index.ts` starts the HTTP
server and `src/app.ts` mounts `src/routes/auth.ts` below `/api`.

Vercel now has entrypoints for `/api/auth/login`, `/api/auth/me`, and
`/api/auth/logout`, ahead of the API 404 fallback. The old always-successful
session/verify stubs now use the same authenticated `/me` implementation instead
of inventing an identity.

## Retained protocol

- Login takes **username** (an existing username or email), password, and optional rememberMe, not an R2 object key. The same identifier is compared case-insensitively against both columns; multiple matching accounts are rejected rather than choosing one.
- `DATABASE_URL` connects to PostgreSQL `users`; bcrypt checks `password_hash`.
- The response is the original numeric-id, top-level user profile expected by
  both AuthContext and Lite. Hashes, internal emails, credential epochs and session
  IDs are never included in the JSON response.
- The `connect.sid` cookie uses the same cookie-signature signing format and
  `SESSION_SECRET` as express-session. Cookies are Secure, HttpOnly, SameSite=Lax.
- `user_sessions(sid, sess, expire)` retains the original JSON shape, numeric
  userId and credentialEpoch. Login uses a fresh cryptographically random SID
  and revokes the prior signed SID in the same database transaction.
- Credential epoch checks and user-before-session locking preserve revocation
  across password rotation. `/me` only updates a still-live row; it never inserts
  or resurrects deleted sessions. Logout deletes the row before reporting success.
- Remembered sessions roll for 365 days; explicit opt-out keeps seven days.
- JSON writes reject foreign browser origins. Login uses the original-style
  per-process failed-attempt limit (20 / 15 minutes); this is **not a distributed
  rate limit**. A perimeter rate limit is recommended for multi-instance traffic.

## Deployment and boundaries

Uses existing Production `DATABASE_URL` and `SESSION_SECRET`, with no credential
pull, automatic schema changes, account creation, R2 writes, or new auth provider.
The PostgreSQL schema must already match the archived backend. Connection/schema
failures return generic JSON 503 and never fall back to fabricated authentication.

This is an auth adapter, not restoration of the entire archived backend:
registration, password recovery/change, WebSocket/push infrastructure and the
other Replit APIs are outside this change. Existing external sockets/push bindings
are not actively disconnected by these Vercel functions; durable session
revocation remains enforced by the PostgreSQL store. No JWT/NextAuth migration
is introduced.

Local tests use real bcrypt and cookie signing with a mocked PostgreSQL driver.
They do not prove that Production contains the original tables, users or valid
stored hashes. The session sandbox cannot directly query that external database
or make HTTP requests to production deployment hosts. A real account sign-in,
page refresh, and logout must still be checked against the deployed application;
never supply passwords through a PR or this document.

## Local verification for this adapter

- 27 new auth tests passed; 43 focused auth/routing/frontend-session checks passed.
- Vite production build and server TypeScript check passed.
- Full suite: 479 passed, 36 failed, one unhandled error. Unchanged main with
  the same installed dependencies: 452 passed, the identical 36 failing test
  names and the same unhandled-error case. Frontend TypeScript errors also
  reproduce identically on unchanged main. These unrelated checks are not green.
- npm audit reports 13 existing dependency findings (including two critical
  development/test-tool findings). None concern the new bcrypt, pg or
  cookie-signature packages; unrelated runtime dependency versions were not upgraded.

Email lookup does not create missing accounts or reset passwords. Only existing stored bcrypt credentials can authorize a session.
