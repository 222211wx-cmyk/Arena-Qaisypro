# Clip upload lifecycle

The isolated Clips entry uploads original bytes directly to presigned R2 URLs in
5 MiB parts, through the inclusive limit of 10 GiB (10,737,418,240 bytes).
It does not load a browser encoder. Browser duration inspection is only a hint.

`POST /api/upload/presign` supplies the existing initiate/inspect/part/abort
protocol. Multipart completion uses `POST /api/upload/complete`. Its 202 response
is an acceptance, not a publication receipt. At that point the original IndexedDB
Blob is deleted atomically with storing account-scoped processing metadata.
`GET /api/upload/status/:sessionId` is read with session credentials; only a
verified ready receipt publishes a link or refreshes the feed.

The open client checks processing jobs every five seconds and on return. Each
check is bounded; the canonical service worker transfers stored files but does
not wait for server encoding or loop on processing jobs during Background Sync.
Failed jobs retain their explicit error and local cleanup action. Retrying a
failed encoding requires selecting the source again. Removing local tracking does
not cancel server processing or delete published media.

Original-byte persistence and Web Locks retain pause/resume/account fencing.
Local quotas may be far below 10 GiB. If the Blob cannot be stored, the UI says
foreground-only and no reopen recovery; browser background execution is always
best effort, especially on mobile. No beforeunload blocker is installed.

Build audit: the clip bootstrap preload branch includes clip-entry and the shared
reels icons chunk, not app-entry or its stylesheet. Citizen/messenger overlays are
dynamic imports activated explicitly. Production cold-request verification should
also inspect actual browser requests, since older deployed assets can differ from
the workspace build.