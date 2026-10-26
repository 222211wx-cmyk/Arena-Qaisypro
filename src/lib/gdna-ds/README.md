# Standalone design-system compatibility layer

Vite, Vitest, and TypeScript resolve `@workspace/gdna-ds` and its subpaths here.
Existing application imports are retained. Tokens contain complete light/dark
CSS palettes plus string spacing/radius values, as expected by clip route styles.
UI controls use the existing Radix packages; the carousel uses Embla, and toast
notifications use Sonner. Tailwind 3 compiles the local theme CSS.

These are local defaults, not an exact copy of the missing upstream design
system. Visual comparison with the original theme is still needed.

## Standalone demo

The API compatibility adapter uses sample GlobalStar data when Supabase is not
configured. Votes in this mode are local demo votes, not shared results. The app
opens immediately as a local Guest; no cookie-session verification is performed.
See `docs/standalone-demo.md`. Supabase schema files are optional preparation only.
