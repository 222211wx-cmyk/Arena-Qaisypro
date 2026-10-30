# Secure authentication for the existing Neon schema

The deployed users table has text IDs. Do not convert IDs to numbers, seed an
account, expose DATABASE_URL to Vite, or use plaintext passwords. The active
archived HTTP server now dispatches core auth before its old numeric-only
session middleware. Login checks the existing bcrypt password_hash and returns
the exact database ID. Registration retains the archived username moderation.

Sessions use signed opaque connect.sid plus a separate Secure HttpOnly device
cookie; only a server-side hash of the device token and normalized browser family
is stored in the session. Browser version updates are tolerated. Missing or
changed binding requires login. This is an additional check, not physical-device
attestation; copying both cookies can defeat it. The server renews valid active
sessions, never recreates revoked ones. Logout deletes the row. Credential epoch
rotation and password changes revoke all prior sessions. Recovery creates a new
bound session only after verified ownership proof. No browser-local session JSON
or userAgent string alone grants identity. Browser cookie deletion, security
revocation and browser retention policies can still require signing in again.

An explicit deployment build flag ARENA_MIGRATE_CREDENTIAL_EPOCH=1 runs additive
schema maintenance. Normal builds/startup do not migrate. Text IDs and existing
hashes are preserved; missing profile fields follow the backend's declared
defaults. The migration creates standard user_sessions and separately named
text-compatible gdna_auth_recovery_* tables without overwriting legacy mappings.

Phone recovery uses the existing Firebase public configuration and RS256 token
verification. Enrollment requires current password, a device-bound active
session, and a fresh phone sign-in proof. Access/reset requires that exact phone
already enrolled for the account. Proofs are consumed once transactionally;
recovery revokes prior sessions via credential_epoch. There is no recovery by
name/email/birth date alone and no pretend email delivery. Existing legacy phone
mappings are not silently imported or claimed verified. A citizen must enroll
from account settings before losing access. Actual SMS delivery, Firebase phone
provider enablement and authorized browser domains need live operator testing.

Some archived call/messaging/private offline features require integer foreign
keys. They are not migrated by this authentication repair. Text identities are
kept out of those numeric-only client paths rather than coerced to another
citizen's ID; the UI explicitly reports the legacy schema limitation. Login,
account dashboard and verified recovery do not depend on those feature tables.
