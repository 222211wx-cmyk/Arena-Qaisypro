# Original backend hosting adapter

This deployment runs the compiled original backend from `api-server.zip`, rather
than the small replacement auth/clip handlers. The archive itself is unchanged.
`npm run build` prepares the runtime and builds the existing Vite frontend;
`vercel.json` sends every `/api/*` request to `api/original.js`.

The original workspace database and API-schema source packages are not checked
into this repository. The archived compiled backend contains those modules, so
this adapter uses that artifact without inventing replacement data models.

## Data preservation

The reproducible preparation script disables the following autonomous startup
operations, leaving the original request route registrations unchanged:

- schema creation/alteration and the deletion of verification/reset tables;
- legacy administrator bootstrap and automatic test-user seeding;
- background jobs, Firebase/recovery sweeps and session/call cleanup timers.

The server is exported to Vercel instead of binding its original PORT listener.
WebSocket upgrade handlers remain attached. Normal authenticated request behavior
is not made read-only: user actions can still write data through original routes.
Existing schema must already be present; there is no fallback database or mock
content. No environment-variable values are included in this change.

Firebase Admin and its helper dependencies are bundled together to avoid
require(ESM) failures and preserve dependency versions. The lockfile production
dependency trees are explicitly packaged because archive-generated require
helpers are not fully traced automatically. Legacy API adapters are excluded
from this deployment so filesystem routing cannot bypass the original backend.

Automatic creation of the legacy local uploads directory is disabled: Vercel
application files are read-only. Local-disk upload endpoints are not made durable
by this adapter, and are not silently redirected to ephemeral temporary storage.
Existing R2 request paths and all storage credentials are unchanged.

## Clips duration policy

The browser composer and the prepared backend publication validator accept audio
and video from **30 seconds inclusive**, with no application-defined maximum
media duration. The feed response schema uses the same 30-second minimum. The
archive remains unchanged; the adapter patches the audited minimum gate and
fails the build if that original boundary changes.

Unknown browser metadata still requires server-side media inspection. Ownership,
object-length checks, authentication and publication verification remain in place.
This is not unlimited file storage: existing byte, transport and provider limits
are unchanged. There is no production database migration in this change; any
live database duration constraints must be inspected before release. No real
30-second upload or long-file playback is established by mocked upload tests.
Authenticated preview publishing requires an application test account; the
repository does not document one. Do not remove authentication to test uploads.

## Checks and limits

`npm run test:hosting` checks removed destructive startup SQL, unchanged route
registrations, all-API routing and a real local HTTP health request. The local
probe runs in an isolated copy with only production dependencies, models a
read-only application filesystem, blocks database access and all external egress,
and disables Node's
require(ESM) feature to exercise loader compatibility.

These checks do not establish production account, clip, R2 playback or inbox
parity with Replit. Disabled autonomous jobs are not hosted elsewhere by this
adapter, and must not be described as running. Build success is not a full
migration acceptance test.

Repository publication is now requested in the final
feat/ameeq-imperial-world-ruler PR. Until that PR is merged, an unchanged main
Git deployment can replace the currently deployed hosting configuration.
