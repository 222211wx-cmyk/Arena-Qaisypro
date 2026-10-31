# Production data recovery — audit before schema reinstall

The live clips feed logged PostgreSQL 42P01 (`relation clips does not exist`),
while authenticated `/api/auth/me` returned 200 in the same window. This proves
missing schema, not a database connection outage. Pool growth/retries cannot
repair missing tables and can increase resource usage.

The only checked-in Supabase SQL is explicitly a DRAFT for a different auth and
identity schema. Do not run it against this Neon database. No Prisma migration
history, SQL data dump or backup export was found in the checked repository or
its uploaded archives. Original Drizzle table definitions are recoverable from
api-server.zip's source map; these are schema, not citizen content or backups.

The archived messaging tables are `dm_rooms`, `dm_room_members`, `dm_messages`,
not `hm_messages`/`conversations`. Archived message ownership and clips.user_id
use INTEGER and clips has a foreign key to users.id, while production users.id
is TEXT. Creating similarly named tables or adding account_schema/can_message
cannot repair the identity/foreign-key contract across messages, calls, uploads,
engagement, E2EE keys and existing media ownership.

The build-only ARENA_AUDIT_PRODUCTION_DATA=1 flag runs an inventory inside a
read-only transaction using protected DATABASE_URL. It prints relation/column
metadata and counts, never row contents, connection URLs or passwords. Ordinary
builds and application startup do not run this audit. Pooler host metadata is
not evidence that a Neon branch is temporary or that it is the main branch;
branch identity/backup history requires provider metadata.

Clip UI session validation now accepts legitimate opaque text IDs consistently,
without coercing them to a numeric citizen ID. Server authorization and ownership
checks remain mandatory. This fixes invalid-session UI, NOT missing clips data,
server upload schema, message identity compatibility, or content restoration.

Restoration requires either the original matching database/export (including
users, relationship IDs and clip metadata/object references), or an explicitly
reviewed fresh-schema migration with an ownership mapping and a clearly labeled
demo-content dataset. Never claim five invented clip rows restore original
videos, assign unknown R2 files to a citizen, manufacture private messages,
financial records or profile DNA, or present an empty 200 as recovered content.

The current session model uses signed server sessions and SESSION_SECRET, not
JWT_SECRET. Same-origin cookies remain HttpOnly/Secure/SameSite=Lax; do not weaken
them to None simply to hide a client-side identity validator bug.
