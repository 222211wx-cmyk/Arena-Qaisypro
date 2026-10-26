# Message upload repair — release handoff

## Observed evidence (2026-10-03)

- Deployment metadata reports a successful public autoscale build at
  `/`. This describes the existing deployment, not this repair.
- The public HTML references `assets/app-DRrnGNhV.js`, which references
  `assets/app-entry-Yn-qXMq9.js`. The downloaded portion of the latter still
  validates `urls` and `chunkSize === 5 * 1024 * 1024` in its upload helper.
  That is the historical multipart client, not the current direct-PUT source.
  The large asset transfer timed out after receiving the relevant portion;
  this is not a full build/commit comparison or proof of the backend version.
- No `createPresignedPost` implementation was found in the active source path.
- Installed AWS SDK checksum middleware defaults to `WHEN_SUPPORTED` and hashes
  `body || ""`. Signing a bodyless PutObject command with this policy can attach
  an empty-body checksum to a later browser upload. Chat signing now explicitly
  uses `WHEN_REQUIRED` on its own client. Clips' client is unchanged.
- A read-only storage OPTIONS request for origin `/`, method
  PUT and headers `content-type,if-none-match` returned 204 and allowed those
  exact values. No bucket policy or CORS configuration was changed. This does
  not prove authenticated PUT success, other origins, or actual device traffic.
- Required storage configuration names are present in the shared workspace.
  Production values were not read or changed. No upload-specific production
  failure logs were returned; the original gallery.jpg incident is not reproduced.

## Source changes

Direct encrypted PUT and create-only `If-None-Match: *` remain in place.
Metadata calls have 30-second limits; PUT has a 120-second limit. Transport
errors expose only fixed stage/reason codes and numeric HTTP status, not response
bodies or signed URLs. Selection and conversation remain intact on failure.
Persistent per-file error text uses existing localized copy and design tokens.

Attachment rendering remounts when any input changes, cancels old downloads,
revokes object URLs, bounds downloads, and handles media decode failure locally.
Decrypted size must match encrypted metadata. Conversation loading no longer
depends on opening private identity storage before fetching rooms; each preview,
message, reply and attachment retains its own decryption failure handling.

The plaintext image limit remains 5 MiB (ciphertext allowance adds 16 bytes).
Membership, upload ticket ownership, private authenticated downloads, historical
media and browser-held E2EE identity storage remain unchanged.

## Verification limits

- API typecheck/build succeeded as part of the normal workflow restart.
- Arena TypeScript check succeeded. API and web workflows are running.
- A screenshot of `/messages` shows the signed-out entry screen without a
  page-load crash. It does not exercise the signed-in messenger.
- No automated test suites, browser journeys, real image uploads, recipient
  decryption checks, native builds or Android/device tests were run.
- A valid ~0.1 MB JPEG round trip remains unobserved; source repair must not be
  represented as confirmation that the original device incident is fixed.

## Retained-data release

This change requires no database migration, storage migration or key reset.
Publication was NOT performed. Before publication, the owner/release coordinator
must confirm the separately owned Clips and Android work is ready in the same
release. Do not replace their work or claim those prerequisites are complete.

Then use the normal Publishing **Republish** flow with **Keep data**, retaining
the production database, accounts, existing media and secrets. If Publishing
shows a destructive schema/data change, stop and inspect that change rather
than accepting a reset. Do not replay application migrations at startup, clear
browser identity storage, or reseed/replace production data.

After publication, establish the new build status separately from any APK or
device result. With renewed verification permission, confirm one original JPEG
of roughly 0.1 MB from an enrolled sender to an enrolled authorized recipient,
record only stage/status evidence, and confirm failed upload/decryption states
do not navigate away or display stale media. Never record plaintext, keys,
upload tickets, session cookies or signed URLs in diagnostics.