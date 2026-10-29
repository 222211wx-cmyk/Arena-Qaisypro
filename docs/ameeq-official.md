# Ameeq official platform assistant

The existing archived `/api/ameeq` route keeps its input limit, moderation and
rate limiter. Its generic answer is replaced at build time by
`server/ameeq-official.mjs`; all other route registrations are unchanged.

- Greetings use a live read-only, repeatable-read PostgreSQL transaction. Citizen
  count means non-deleted accounts; clip count means non-frozen clips with a
  nonempty object reference and a non-deleted owner. No figures are hard-coded.
- A failed database read returns 503 instead of inventing counts.
- Clip lookup uses parameterized, bounded searches over public feed metadata.
  It may HEAD at most five database-referenced R2 objects, never list the bucket,
  download video, disclose object keys or pretend to have watched the footage.
- Own-account lookup is constrained to the verified session user ID. No email,
  password hash, inbox content or arbitrary citizen-account access goes to AI.
- AI reads the existing AI_INTEGRATIONS_OPENAI_API_KEY and
  AI_INTEGRATIONS_OPENAI_BASE_URL (and supported legacy aliases). No server env
  values are changed or embedded in frontend code. Greetings work from verified
  data even when the provider is unavailable; other responses report degraded
  operation rather than claiming a successful model call.
- The existing PostgreSQL session store holds the last eight public chat turns
  for a signed-in user, with a 24-hour assistant-history TTL. Guests must sign in
  for memory. It is not cross-session/global memory. Private account answers
  never enter model history. Client-provided identity/history is ignored.
- Read-only applies to platform retrieval. Saving owned chat memory and ordinary
  session renewal use the existing session table. No schema migration or new
  database is introduced; all earlier startup deletion protections remain.

Tests: `npm run test:ameeq` and `npm run test:hosting`. Fixture values are not
production counts. The latter exercises an actual loopback POST to the archived
route using a fake read-only database, isolated dependencies and denied startup
network/filesystem writes. These tests do not establish live model-provider,
R2 or production-browser success.

Repository publication is now requested in the final
feat/ameeq-imperial-world-ruler PR. Until that PR is merged, an unchanged main
Git deployment can replace the currently deployed hosting configuration.
