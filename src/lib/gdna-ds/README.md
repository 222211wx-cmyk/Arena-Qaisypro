# Standalone design-system compatibility layer

Vite, Vitest, and TypeScript resolve `@workspace/gdna-ds` and its subpaths here.
Existing application imports are retained. Tokens contain complete light/dark
CSS palettes plus string spacing/radius values, as expected by clip route styles.
UI controls use the existing Radix packages; the carousel uses Embla, and toast
notifications use Sonner. Tailwind 3 compiles the local theme CSS.

These are local defaults, not an exact copy of the missing upstream design
system. Visual comparison with the original theme is still needed.

## Mock backend

The missing API-client package now resolves to `../workspace/api-client-react.ts`.
Read hooks return empty lists. Recovery status and all mutations reject with a
mock-mode error, so the UI never falsely confirms password resets, recovery
codes, votes, withdrawals, subscription changes, or thumbnail repairs.

The recovery reminder compatibility module never schedules notifications.
A visible banner identifies standalone mock mode. These mocks restore bundling,
not backend functionality. Replace them with real contracts before enabling
those workflows. No generic workspace catch-all is used: only packages actually
imported by this checkout are mapped, so future missing imports still fail loudly.
