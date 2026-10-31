# Upload recovery — staged release, not a production restoration

## What this change repairs

A failed or cancelled direct-storage PUT previously left its pending upload
session counting against the per-account limit. Repeated failures could consume
all ten active slots. Signing also happened after committing a pending row, so
a signing failure left another unusable slot.

The browser now attempts bounded, authenticated cancellation after a failed or
cancelled transfer. Signing happens inside the short initiation transaction, so
a failure rolls back the new row. Once confirmation starts, the client does not
auto-cancel: a lost response may already correspond to a committed publication.

The composer provides an explicit unfinished-upload cancellation action with a
warning that it includes other tabs. The list endpoint exposes only the signed-in
owner's active pending keys; cancellations recheck the session and owner, and
refuse already published uploads. Storage/network failures remain visible and
can prevent cleanup. This is not a background object-garbage-collection service;
signed PUT capabilities remain valid until their original expiry.

A full account receives HTTP 429 with Retry-After based on the earliest active
expiry. Expired rows do not count toward the limit. The prior one-hour lifetime
was an upload-session expiry, not deletion of published video after an hour.

## Proposed size change — migration required before production release

Client and server now accept at most 2 GiB (2,147,483,648 bytes). The explicit
publication migration creates new tables with that bound and upgrades the two
known old 100 MiB size constraints transactionally. It checks the old constraint
definition, refuses unknown definitions, retains all rows/ownership/foreign keys,
and is idempotent. It does not change account IDs, seed data, or restore content.

Do not publish this source to production without first preserving a database
backup, reviewing the schema, and approving/applying the explicit migration.
Changing only JavaScript would leave PostgreSQL rejecting files over 100 MiB.
No migration is run by normal builds. The existing one-deployment
ARENA_MIGRATE_VICHY_CLIPS=1 build flag invokes it only when explicitly requested.
This change does not run it against any connected database.

Media still requires a verified minimum duration of 60 seconds; there is no
application-defined maximum duration. A byte-size limit is separate from media
duration. This is not a promise of infinite file size, capacity or retention.

## Session and route findings

The current composer accepts opaque string IDs without numeric coercion. Tests
cover valid text identities and rejection of malformed successful session
responses. Do not hide an invalid response or authenticate cached local JSON.
A successful /api/auth/me status alone does not prove that all client consumers
or an affected citizen's login work; authenticated preview verification remains
required.

/api/cli/upload already aliases the JSON presign handler. The packaged HTTP test
now explicitly exercises POST to this alias and verifies an unauthenticated 401,
not a missing-route 404. A direct-storage PUT can itself return 404. The browser
now identifies storage failures separately; route existence is not proof that
storage credentials, bucket access or CORS work.

## Blob migration and historical restoration are not implemented here

This staged repair preserves the existing R2 transport and references. It does
not install @vercel/blob, create/connect a Blob store, transfer any original
object, change environment values, clear production records, or deploy production.

A separate Blob release needs an authenticated client-token endpoint, direct
multipart browser upload, a provider-aware object reference model preserving R2
playback, trusted completion/size/media verification, session fencing, an agreed
public/private access policy, and end-to-end testing before switching traffic.
Never proxy a 2 GiB upload through a Vercel Function.

Documentation: https://vercel.com/docs/vercel-blob/client-upload and
https://vercel.com/docs/vercel-blob/using-blob-sdk .

Historical restoration still requires the matching original database or export,
relationship/ownership IDs, and original media references. A new empty database,
new empty tables or manufactured rows would not restore that content. Preserve
all current data before any approved migration or provider replacement.
