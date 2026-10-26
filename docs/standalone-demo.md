# Standalone Arena demo

No backend or environment variables are needed to open the app. The HTML banner
explicitly labels the deployment as **Standalone mock mode**. Do not use it as a
real authentication, financial, private messaging, or live AI system.

- The React auth provider immediately loads a local Guest. A positive numeric ID
  is retained because game/profile/cache contracts require it; the display name
  and username are Guest. No `/api/auth/me` check blocks rendering.
- Choosing a name through login/register only changes a local demo profile.
  Passwords and birth dates are not stored. There is no real credential check.
  Logout resets Guest. Existing games age declaration stays in place; its local
  result does not represent verified identity or server authorization.
- Progress and virtual coins persist in localStorage. Restricted/corrupt storage
  falls back to memory. Daily demo coins can only be claimed once per local reset.
- A common fetch boundary intercepts same-origin `/api/*` BEFORE network access
  in the main and Lite entry points. An old VITE_API_URL is ignored in this mode.
  API callers receive JSON fixtures, not the SPA's index.html. Assets still use
  normal fetch. This covers legacy relative calls without editing every caller.
- Game results, five-shot penalty matches, sample leaderboard, GlobalStar content,
  local votes, and canned GDNA guide replies work without a backend. GDNA replies
  explicitly say they are demo text, not live AI. WebSocket signaling is disabled.
- Unsupported shared features return explicit JSON 501 errors. Real payments,
  account recovery, password changes, media upload, cross-user messaging and
  calls are NOT simulated as successful real operations. Their pages can explain
  unavailability; this is not complete parity with the missing backend.
- The render error boundary retains error details, retry and a home button. The
  old blocking session-error screen is removed entirely.

## Optional Supabase

`src/lib/supabase.ts` creates a client only when both VITE_SUPABASE_URL and
VITE_SUPABASE_ANON_KEY exist, and exports isSupabaseConfigured. Without them,
GlobalStar reads use mockData. With them, those reads use Supabase (this does not
turn local Guest into a real authenticated account). Service-role/provider keys
must never be placed in VITE_ variables. SQL files remain unapplied, optional
preparation; they are not required for this standalone mode.

## Shipping

Merge the PR into main to trigger the linked production deployment. Publishing a
preview does not update the production alias. Test navigation, local storage,
gameplay and disabled shared features in a browser before merging. Static build
and unit tests do not constitute a live browser/production check.
