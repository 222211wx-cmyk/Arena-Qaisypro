# Standalone design-system compatibility layer

Vite, Vitest, and TypeScript resolve `@workspace/gdna-ds` and its subpaths here.
Existing application imports are retained. Tokens contain complete light/dark
CSS palettes plus string spacing/radius values, as expected by clip route styles.
UI controls use the existing Radix packages; the carousel uses Embla, and toast
notifications use Sonner. Tailwind 3 compiles the local theme CSS.

These are local defaults, not an exact copy of the missing upstream design
system. Visual comparison with the original theme is still needed.

## Backend status

`@workspace/api-client-react` resolves to `../workspace/api-client-react.ts`.
Public GlobalStar reads now use Supabase. Configure both public Supabase variables
and review/apply the inferred schema before expecting data. Missing configuration
is an error, not an empty mock response. Legacy privileged operations still reject
until the authenticated backend is restored; this is not a production migration.
See `docs/supabase-migration.md` for the exact remaining blockers.
