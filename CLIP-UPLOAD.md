# Clip upload and R2 playback

This is a Vite application backed by the archived Express server. The hosting
adapter in `scripts/prepare-original-backend.mjs` restores the direct upload route
without editing the archive or adding a Next.js route that would not be served.

## Current browser lifecycle

1. Check the signed-in citizen with `/api/auth/me`.
2. `POST /api/clips/presign` validates the account, title, media type and positive
   size (at most 5 GiB, matching the current browser). The existing per-citizen
   limiter is retained. It stores an expiring, account-owned `direct-put` receipt
   in the existing `r2_clip_uploads` table and returns a one-hour signed PUT URL.
3. The browser sends the original File directly to R2, with its exact Content-Type
   and `If-None-Match: *`. The signature binds size, type and create-only behavior.
   Media bytes do not pass through a Vercel Function.
4. `POST /api/clips/confirm` retains the original ownership check, advisory lock,
   expiry check, stored-size verification, actual media probe and transactional
   clip publication. The media verifier is packaged with the Function rather than
   relying on a system `ffprobe`. Existing minimum-duration policy is unchanged.
   Repeated confirmation returns the existing publication receipt.
5. Only a successful confirmation refreshes the public feed. Presign acceptance
   alone never reports that a clip was published. No automatic data import, seed,
   migration, thumbnail generation or account creation is introduced.

The older multipart `/api/upload/*` routes remain unchanged; they are not the
protocol currently used by `src/components/clips/clipUpload.ts`.

## Server-only configuration

- `R2_ENDPOINT`: private S3-compatible API endpoint, used only for storage calls.
- `R2_BUCKET`: canonical existing bucket name; legacy `R2_BUCKET_NAME` is a fallback.
  Do not change buckets unless all referenced objects have been migrated.
- `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`: real R2 credentials, server-only.
- `DATABASE_URL`: existing database, including its original upload/clip schema.
- `R2_PUBLIC_URL`: optional public HTTPS base URL for **the same bucket**.

For public R2 clip references, playback and existing thumbnail routes use the
public base plus the exact object key, after their existing visibility lookup.
Downloads retain the range-aware authenticated-storage proxy. Without a public
base, existing signed/proxied delivery remains. Legacy non-R2 object references
are not guessed, rewritten or migrated. A public URL cannot create a missing
object or thumbnail, repair an incorrect stored key, or expose a private bucket.

A public bucket's object URLs are accessible independently of the app: freezing
or deleting a database record does not revoke a copied public object URL. Use a
private bucket and omit `R2_PUBLIC_URL` if storage-level access control is needed.

On the R2 bucket, browser upload CORS must allow the actual app/preview origins,
PUT, and the `Content-Type` and `If-None-Match` request headers. Public playback
must also permit the app's media usage as needed. Do not expose credentials in
Vite variables, source code, screenshots, or PRs. This change does not configure
Cloudflare, change Vercel variables, migrate objects, or verify database parity.

## Checks

- `node --test scripts/clip-r2.test.mjs`
- `npm run test:hosting` (includes production cold start, public URL wiring and a
  real in-memory WAV probed with the packaged verifier)
- `npx vitest run src/components/clips/clipUpload.test.ts`
- `npm run build`

Before production rollout, use a preview with its own configured database/R2
resources and a test citizen account to verify presign → browser PUT → confirm →
feed → playback. Local mocks and a READY build do not prove live bucket CORS,
object availability, credentials, schema compatibility or end-to-end publication.
