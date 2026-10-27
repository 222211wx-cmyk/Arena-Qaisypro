# Clip upload lifecycle

The isolated Clips entry sends the original File directly to an HTTPS presigned
storage URL using XHR PUT. API calls carry JSON metadata only, not media bytes.
The client accepts files up to 5 GiB and rejects known durations below 60 seconds.
An unreadable duration must be verified by the backend. File selection and title
are retained on failure; cancellation never proceeds to confirmation.

Required authenticated backend contract:
- `GET /api/auth/me`: verified numeric account id and username (401 for guests).
- `POST /api/clips/presign`: filename, title, contentType, size, durationSec,
  expectedOwnerId → `{ url, key }`.
- Storage PUT must allow `Content-Type` and `If-None-Match: *` through CORS.
- `POST /api/clips/confirm`: key, expectedOwnerId → confirmed clip and HELX code.

The backend must enforce session ownership, size and duration, verify the stored
object, and persist the publication before issuing the confirmation receipt.
Client validation is not authorization or trusted media verification.

## Release blockers

This repository contains metadata and streaming Functions only. There is no
`app/api` directory to move and no implementation of auth/login, auth/me,
clips/presign or clips/confirm. The five supplied files were already present
byte-for-byte on feat/neon-r2-clips. An API self-rewrite prevents the SPA fallback
but cannot create the missing handlers. Supply the original backend source or
connect the supported authenticated backend before claiming login/upload works.

`public/sw.js` and its original push/call implementation are also absent; the
bootstrap service-worker configuration test is not satisfied by this checkout.
Do not replace it with a placeholder worker and claim push/calls were preserved.

Tests mock storage and authentication. A synthetic 171 MiB File-size regression
checks the transport path, not an actual network upload or storage configuration.
