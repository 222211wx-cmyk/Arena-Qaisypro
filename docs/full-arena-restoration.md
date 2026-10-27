# Full Arena restoration: implemented and pending

The existing project is retained. The full home source has been restored from
the version before the reduced six-card landing page. Black/gold theme tokens
remain, and Cairo is the default body font. Navigation, tools/settings, language
selector, directory copy actions, stats, Elite Circle, gates, citizen content and
footer are again reachable on home. This is source restoration, not a verified
pixel-identical reproduction of the Replit deployment.

## Presentation ordering implemented

- Directory: leaderboard first, calls/messages last; all other entries reversed.
- Home: smart bots, stats, gates, activity/legend previews reversed.
- Elite home carousel reversed without mutating profile data.
- Hub: section links, domains, figures, leader display, games and news reversed.
- Event domain tabs reversed; live and upcoming lists each sorted newest first.

This is NOT yet an application-wide reversal of all domain lists/tabs. Do not
reverse message history or backend/security arrays mechanically. Rankings also
need an explicit policy for displaying original ranks after presentation changes.

## Registration implemented

The existing username/password/birth-date flow now has two explicit confirmations.
No registration request is sent before the second confirmation is accepted.
Editing returns to step one; the password is masked on review. Existing server
validation and request format are unchanged.

## Required backend work — not implemented here

This repository is a Vite frontend with an SPA-only Vercel rewrite. It has no
server implementation or database schema for the existing session API. Merely
having DATABASE_URL on Vercel does not connect browser code to a database. Never
expose DATABASE_URL or SMS/translation provider secrets via VITE_ variables.

Provide the existing backend repository and API/schema contract before adding:

- Name, email, E.164 phone, country persistence, server password-strength checks,
  uniqueness checks, and verified contact status. Format checks alone cannot
  establish that citizen details are genuine.
- Twilio/Vonage recovery: server-generated one-time proof, ten-minute expiry,
  hashed proof storage, generic responses, resend cooldown, attempt/rate limits,
  atomic consumption, secure password hashing and session revocation. Existing
  optional Firebase recovery is retained unchanged, not replaced by mock SMS.
- Event ownership and authorized edit endpoints. A browser-side user-id check
  is not sufficient authorization.
- Server-proxied Google/LibreTranslate with selected-language handling, provider
  configuration, consent/data-handling review, caching and failure states.
- Darija/Auto and additional calendar locales; current language set is unchanged.

No SMS service can promise unconditional delivery everywhere or unlimited sends.
Abuse protection must remain even when account recovery is available at all hours.

## Publishing

Publish frontend changes as a PR/preview on the existing Vercel project. Production
requires merging that PR. No new project/database is created. Replit publishing
and synchronization require access to the existing Replit workspace or its own
Git deployment configuration; this session has no Replit deployment tool.
