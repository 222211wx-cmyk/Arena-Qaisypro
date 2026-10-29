# Ameeq Imperial — lightweight mode

The title is an application persona, not independent administrative or legal
authority. `api-server/ameeq-brain.js` describes actual capabilities, not a new
trained neural network. The existing model configuration remains server-only.

## Offline and privacy

- Device caching is opt-in, after sign-in. IndexedDB stores up to 50 question/
  answer exchanges (100 messages), 20 public clip metadata records and up to 10
  public author usernames from that feed. It does not cache videos, private
  inboxes, account secrets or provider keys. LocalStorage stores only consent/
  account selection metadata. Storage is not encrypted; users are warned before
  enabling it on a shared device.
- The Ameeq-only service worker caches the static page shell and JS/CSS assets,
  never API responses, media or third-party requests. Open/reload Ameeq once
  after enabling caching while online before relying on offline navigation.
- Offline replies explicitly identify limited guidance/no local model. Exact
  previously answered questions may reuse a marked stale answer. Stress and
  isolation guidance, educational-medical caveats, and crisis escalation are
  rule-based. New research reports and live data require connectivity.
- Logout and account-change events purge the owned cache. Late async replies
  are rejected after identity changes. Existing cookie sessions are not copied
  into IndexedDB. The browser may evict local data; this is not a backup.

## Language, maps and voice

Online model instructions request the user's language/dialect, with no guarantee
of perfect Soussi/Oujdi or other dialect accuracy. Offline language detection is
only a small heuristic; unsupported Tamazight guidance is explicitly labelled.
Medical text includes an educational disclaimer and does not diagnose/prescribe.

Map questions reveal explicit map controls. Destination is user-entered; the
provided Errachidia point (31.9310,-4.4250) is labelled general/temporary, not an
Arena office. A Google Maps search link requires no embedded API key. No Firebase
or GIPHY key is repurposed. Speech requires an explicit click and a suitable
installed browser/device voice; turn-by-turn navigation belongs to Maps.

## Existing providers

DATABASE_URL, R2, Firebase, Agora/CALL_MEDIA_PROVIDER and Expo configuration are
unchanged. The assistant links to the existing messages.call interface so users
can choose recipients and consent to calls/notifications using existing flows.
This change does not independently activate, validate, or guarantee push, video
calls, mobile Expo delivery or network failover. No partnership is claimed, and
internet-dependent providers cannot replace missing internet connectivity.

## Verification

Vitest tests cover IndexedDB bounds/account isolation/deletion, explicit map
links, opt-in caching and offline UI replies without chat network requests.
Ameeq/backend startup tests and TypeScript/build checks are separate. None of
these is a claim that a production browser was disconnected or that an actual
call, model response, map voice or mobile push delivery succeeded.

## Repository publication

The final feat/ameeq-imperial-world-ruler PR preserves the currently hosted
backend, startup protections and all incremental Ameeq features in source.
The requested ruler file is an application persona/roadmap only; example
numbers and world-ruler wording are not live facts, permissions or evidence of
activated departments. Only its identity/title is used by responses.

Both the original backend login route and the retained standalone auth adapter
accept a username or email identifier, using a parameterized case-insensitive
OR lookup with duplicate/collision rejection. Registration is unchanged.

The deployed source can precede merging this PR. Until merged, main-based
automatic deployments can still overwrite these features. PR creation does not
mean merge; no merge is performed by the available publication tool.
