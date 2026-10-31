# Application quota removal — STAGED, DO NOT DEPLOY

## Requested product policy

Verified audio/video must last at least 60 seconds. No application-defined
maximum recording duration, byte quota, or pending-upload count quota is desired.
This patch removes the old 100MiB and staged 2GiB upper-size constraints rather
than replacing them with another arbitrary product quota.

- Client/composer no longer exports or enforces MAX_CLIP_BYTES or displays the
  old maximum-size error.
- Server metadata validates a positive safe integer byte count, content type,
  title, owner, session and actual media. Numeric integrity is not unlimited
  capacity and is not a replacement product quota.
- Presign no longer counts pending uploads or returns the pending-slot 429.
  The cancellation list's LIMIT 10 is a bounded response batch, not an initiation
  quota; authentication, cancellation and real failures remain intact.
- Reviewed SQL changes ONLY the two known size CHECK constraints to
  CHECK(size_bytes>0). It retains all rows, ownership, foreign keys, BIGINT column
  type and CHECK(duration_sec>=60). Unknown constraints cause rollback.
- No published media expiry is added. Existing upload-session/signed-URL expiry
  is a capability lifetime, not a published-video deletion policy.
- vercel.json maxDuration=60 remains: that is server execution time in seconds,
  not a media duration or file-size quota. Deleting it cannot enable larger files.

## Hard release blockers

This is a partial code/migration preparation, NOT completed unlimited uploads.
The current direct R2 transport is a single PUT, not resumable multipart. Removing
an application check does not bypass R2 single-request/object/part limits. A large
file can still fail at storage; do not release this patch alone as a completed
large-file implementation. Multipart initiation/parts/completion/abort, resumable
browser state, trusted completion verification and real integration tests are
still required before claiming support beyond the single-PUT provider limit.
Cloudflare Stream is not integrated or provisioned by this patch.

Official references checked for this change:
- https://developers.cloudflare.com/r2/platform/limits/ — finite per-object,
  single-request and multipart-part-count limits. r2.dev is not intended for
  production throughput; use a properly configured custom domain.
- https://developers.cloudflare.com/stream/uploading-videos/ — files less than
  30GB; Stream is not infinite-capacity upload bypass.

Before ANY production migration/deploy:
1. Preserve and verify an independently stored production DB backup/restore point
   through authorized Neon administration, including a restoration procedure.
   A support ticket/attachment is NOT a database backup operation.
2. Authorized Cloudflare admin must provision/verify bucket, public playback,
   CORS, credential scopes and Stream access/billing if Stream is chosen. Existing
   application R2 credentials do not establish account-management permission.
3. Complete authenticated multipart/storage integration and isolated preview
   tests. Current preview lacks applicable server/session/storage configuration.
4. Review the constraint diff, then obtain explicit production migration/deploy
   approval. This turn does not run it, alter env, provision paid resources,
   merge PR #28 or deploy production.
5. Test the actual user-supplied 68-second video, a 5-minute video and a 1-hour
   video for transfer, durable metadata, confirmed publication and playback.
   The files have NOT been supplied in this session. Simulated sizes in tests
   do not prove actual large-file transfer or playback/permanent retention.

The reported HTTP 503 remains a real failure, not an environment variable named
'base de don temporaire'. Changing that sentence or deleting a quota cannot
repair credentials, CORS, missing data, or prove a Neon branch permanent.

Trademark/certification/liability assertions are not adjudicated by this patch.
No promise of infinite capacity, throughput, geographic edge pinning, free usage,
permanent retention, a human expert assignment or successful real uploads.
