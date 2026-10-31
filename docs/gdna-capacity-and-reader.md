# GDNA capacity and in-site reading

This PR builds on the currently deployed `fix/remove-application-upload-quotas`
branch rather than silently replacing the open storage/auth work with `main`.
No environment variables, secrets, databases, storage accounts or production
aliases are changed by this PR. AI_INTEGRATIONS_OPENAI_*, AGORA_* and R2_*
continue to be read from their existing environment names.

## Effective AI policy

- Daily reservations: 20,000 platform-wide / 2,000 per account, UTC. The existing
  cross-process transaction lock still reserves both counters before provider use.
- Input: 100,000 UTF-16 code units, including the route schema and JSON parser.
  Only this endpoint receives a 1 MiB JSON allowance (escaped Unicode included).
- Provider request: up to 100,000 completion tokens. This is a ceiling, not a
  promise of a 100,000-token answer: provider availability, billing, latency and
  the existing request/function timeout still apply. Incomplete JSON generations
  are not presented as successful complete answers. The old 8,000-character
  reply rejection is expanded to accommodate the requested response budget.
- Text account IDs are accepted by the core; memory's transaction lock hashes
  the ID instead of casting opaque IDs to integers. Authentication, privacy and
  explicit opt-in memory writes remain. The 20-entry memory bound is not a daily
  request limit and has intentionally NOT been replaced.
- Archived source and deployed bundle are both updated. The readable archive
  diff is in `gdna-archive-changes.patch`. Unrelated numeric constants such as
  title lengths, pagination, rates for other APIs and message attachments remain.

## Uploads and publication

Remove the archived MAX_CLIP_BYTES / MAX_NEW_CLIP_BYTES compatibility exports,
including the Infinity sentinel and all stale imports/aliases. The deployed
branch already removed the client/server product byte checks and pending count
quota; those removals are retained. There is no new application byte cap.

Transient inspection timeouts/unavailable infrastructure return retryable 503,
not an invalid-media verdict. Confirmation retries up to twice without repeating
the PUT or cancelling an already committed publication. Object existence,
matching length/ownership, session checks, actual media validation and the
existing 60-second minimum are preserved. Real storage/DB failures cannot be
turned into successful publications. No real media transfer was performed here.
The transport is still direct single PUT: provider limits still apply. This PR
is not multipart/resumable upload support or a claim of infinite storage.
The base branch's reviewed SQL migration remains separate and was NOT run.

## Reading and navigation

Add an opt-in reader around existing React pages: viewport-by-viewport previous/
next, ×, zoom, fullscreen where supported, and a live heading-based contents
list. Forms remain mounted when entering/exiting. Back/forward history is
restricted to tracked app entries; untrusted referrers do not grant history depth.
Standalone clip/message entrypoints are not converted into book documents.
No identifiable deleted book-reader version was found in repository history;
this implements the requested tools, not a claimed restoration of unknown files.

## Verification

- 64 focused Vitest tests and 9 Node tests pass, including packaged production
  cold-start/HTTP checks, quota boundaries, opaque IDs, long replies, reader
  controls, same-site history and publication retry behavior.
- Build passes. Typecheck still reports 44 errors with identical locations/codes
  on the unchanged deployed baseline. Two clip-bootstrap tests also fail on that
  baseline; these unrelated assertions have not been weakened.
- No paid provider call, production migration, large-file transfer or production
  runtime success is claimed. Preview verification is recorded in the PR.
