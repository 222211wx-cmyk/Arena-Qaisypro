# Durable publication repair

## Actual incident

Production POST /api/clips/presign returned 404. The browser already implements
presign -> original-byte PUT -> confirmation, but the deployed archive registers
only the old multipart endpoints. /cli is now an alias of the isolated Clips UI.
This is Vite/Express, not Next.js App Router.

## Protocol and durable data

- POST /api/clips/presign (alias /api/cli/upload) accepts same-origin JSON metadata
  after signed server-session/device/credential-epoch verification. No media body
  goes through a Vercel Function. Maximum file size is 100 MiB, enforced both in
  client validation, API validation and database constraints.
- Server commits a text-owner upload session before issuing an expiring R2 PUT
  URL. The exact content type, length and If-None-Match:* are signed. Original
  bytes go directly from browser to existing R2 storage, not temporary disk.
- POST /api/clips/confirm verifies object length/upload identity, then packaged
  ffprobe inspects the actual remote object through a signed read URL. Only a
  playable audio/video container of at least one minute can be published. Browser
  duration is not trusted. Probe has bounded execution and output; no signed URL
  is printed. The object remains in R2; no persistent local media files.
- Confirm locks/revalidates the actual session after inspection. It transactionally
  allocates a code, inserts metadata and marks the upload published. Repeated
  confirmation returns the same publication; failed writes never claim success.
- Explicit build flag ARENA_MIGRATE_VICHY_CLIPS=1 creates vichy_clips and
  vichy_clip_uploads with foreign keys to existing TEXT users. It does not convert
  IDs, touch passwords, seed content or import guessed R2 ownership.
- Feed and by-code/player reads serve actual new publication metadata and public
  R2 URLs. New IDs use a reserved positive range, while legacy numeric IDs keep
  their original routes. This does not restore missing legacy clips or other
  application content tables. A future import must reconcile both content models.
- Owner DELETE removes the corresponding R2 object, unlinks its upload receipt
  and deletes only the owner's metadata. Failed deletion is not reported success.

## Storage configuration

Reuse R2_ENDPOINT, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME (or
R2_BUCKET) and R2_PUBLIC_URL. These stay server-only. R2_PUBLIC_URL must be a
public HTTPS media base, not the S3 API endpoint. Browser direct uploads require
bucket CORS allowing the actual site origin, PUT and the signed Content-Type /
If-None-Match headers (and response ETag visibility if used). Changing maxDuration
or disabling a body parser does not raise Vercel's request-body limit.

## Verification boundaries

The actual uploaded user video is not present in the attachment; only its
screenshot/name were supplied. Live verification uses a clearly labeled generated
synthetic audio/video fixture, then removes its publication/object. This must not
be described as verification of the user's original file or recovery of old clips.

Pending uploads expire; abandoned original objects are not silently deleted by a
startup sweep. Operators need a reviewed orphan-retention policy. Existing E2EE
messaging, likes, comments and other legacy features are not rebuilt by this patch.
