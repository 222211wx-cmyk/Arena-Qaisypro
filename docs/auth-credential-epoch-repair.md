# Missing credential_epoch repair

Production `/api/auth/login` failed because the deployed users schema lacked
`credential_epoch`. Login and session revocation both require it; removing it
from the SELECT would break session fencing rather than repair authentication.

The existing backend declares this field as INTEGER NOT NULL DEFAULT 0. Do not
use BIGINT: pg returns int8 as strings and session authorization requires a safe
JavaScript integer. No plaintext `password` column or seeded account is needed;
login continues to verify the existing bcrypt `password_hash`.

Run the explicit additive migration in one authorized production build:

```sh
vercel deploy --project arena-qaisypro --scope gdna-arena --prod \
  --build-env ARENA_MIGRATE_CREDENTIAL_EPOCH=1
```

The build uses its existing protected DATABASE_URL. The flag is a one-deployment
build override, not a persistent project variable. Ordinary builds and request
startup do not migrate anything. The transaction has bounded lock/statement
waits, serializes this migration, and verifies the resulting type/default/null
constraint before committing. Existing incompatible columns abort for review.
No existing accounts, password hashes, roles, or session records are rewritten.

Live verification after repairing credential_epoch revealed another absent users
field, birth_date. The explicit migration now checks the existing identity types
and adds only missing usersTable fields using the archived backend's own types
and defaults. Unknown birth dates remain NULL (not an adult-age bypass). Missing
admin/subscription flags default false. Existing balances are preserved; if the
balance column is entirely absent it receives the backend's declared initial
500 game coins. No real-money balance field is changed. The standard empty
user_sessions table is created only if absent; existing session column types and
sid uniqueness are validated, not rewritten. No unrelated feature tables are
created. This is schema compatibility, not a claim that legacy profile data or
feature tables have been recovered from another database.

Verify real login returns 200 with an existing numeric user ID and HttpOnly
session cookie, then GET `/api/auth/me` with that cookie. Wrong credentials must
still return 401. Do not log request passwords, hashes or cookie values. A READY
deployment alone is not proof of successful authentication.
