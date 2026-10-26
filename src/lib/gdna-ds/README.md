# Standalone design-system compatibility layer

Vite, Vitest, and TypeScript resolve `@workspace/gdna-ds` and its subpaths here.
Existing application imports are retained. Tokens contain complete light/dark
CSS palettes plus string spacing/radius values, as expected by clip route styles.
UI controls use the existing Radix packages; the carousel uses Embla, and toast
notifications use Sonner. Tailwind 3 compiles the local theme CSS.

These are local defaults, not an exact copy of the missing upstream design
system. Visual comparison with the original theme is still needed.

## Not a complete production-build fix

`@workspace/api-client-react` remains missing. Its original implementation or
OpenAPI/endpoint contracts are required to preserve account recovery,
withdrawals, voting, messaging subscriptions, and thumbnail admin behavior.
Do not externalize this package or replace it with mock successes.

This checkout also references an absent shared recovery-code-reminder module
outside the repository. Restore that implementation before releasing.
