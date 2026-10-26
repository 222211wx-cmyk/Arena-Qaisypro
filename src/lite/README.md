# GDNA Lite — resilient text-first portal

A **vanilla DOM / TypeScript** frontend for low-bandwidth, high-resilience access to
GDNA citizenship, messaging, and market. It ships **no React, no app contexts, no
heavy imports, and no web fonts**, and draws its visuals from a tiny subset of the
`@workspace/gdna-ds` design tokens (imperial gold `#d4af37`, pure black, neon blue
`#00d4ff`), inlined as CSS variables so the design system's React runtime is never
pulled in.

## What the infrastructure owner needs to wire (NOT owned by this agent)

This agent owns **only** `src/lite/**` and `src/lite-entry.ts`. The infrastructure
owner owns Vite config, `index.html`, the service worker, the network helper, and
bootstrap. Please wire:

1. **Entry / bootstrap.** `src/lite-entry.ts` exports a default and named function
   `mountLite`:

   ```ts
   import mountLite from "./lite-entry";
   // or: import { mountLite } from "./lite-entry";
   mountLite(document.getElementById("app")!); // element optional; defaults to #lite-root or <body>
   ```

   `mountLite(root?, options?)` returns a cleanup function. It reads the current
   `location.pathname` and renders the matching route (see Routes below). It attaches
   its own history/`popstate` listener for in-app navigation. Call the returned
   cleanup to unmount. **Lite never auto-mounts** — the infrastructure owner calls
   `mountLite` explicitly.

2. **A dedicated HTML shell + Vite input** for the Lite bundle so it is **not**
   bundled with the React app. Give it an element with `id="lite-root"` (or pass a
   root explicitly). Keep the shell font-free; do not add `<link>` font tags.

3. **Network helper** at `src/lib/network-detect.ts` exposing:

   ```ts
   getNetworkState(): NetworkState
   subscribeNetwork(listener: (s: NetworkState) => void): () => void
   setLimitedData(on: boolean): void
   authorizeDownload(bytes: number | null, label: string): boolean
   // NetworkState = { forceLiteMode, limitedData, effectiveType, saveData, downlink: number|null }
   // preference key: "gdna.limitedData" = "true" | "false"
   ```

   `src/lite/net.ts` is now a thin **static re-export** of this module — the single
   source of truth for network state and the `gdna.limitedData` preference. No shim.

4. **Service worker / background sync.** Lite's offline queue (see
   `docs/lite-offline.md`) is an **account-scoped IndexedDB** database owned by this
   agent (`src/lite/offline-queue.ts`). Two drain paths:
   - **With an open client:** post `{ type: "gdna-lite-sync" }` to clients; Lite
     listens on `navigator.serviceWorker` messages and on `online` and drains.
   - **Without any open client (true Background Sync):** import the worker-safe
     drain from **`src/lite/sw-drain.ts`** inside the SW:
     ```js
     import { drainOutboxInWorker, knownQueueAccountIds } from "<lite>/sw-drain";
     self.addEventListener("sync", (e) => {
       if (e.tag === "gdna-lite-outbox")
         e.waitUntil((async () => {
           for (const id of await knownQueueAccountIds()) await drainOutboxInWorker(id);
         })());
     });
     ```
     It re-verifies the live session via `/api/auth/me` before every send, re-sends
     exactly the stored ciphertext with its `clientMessageId` + `expectedSenderId`,
     reclaims leases abandoned by a crashed tab, and never re-encrypts. Register a
     Background Sync with tag `gdna-lite-outbox`.
   **Do not cache private/API responses in the SW** — snapshots live in Lite's own
   IndexedDB, cleared on logout/account change (across tabs via `BroadcastChannel`).

## Routes

- `/lite` — home (citizenship overview, links)
- `/lite/in` — India edition (Hindi + English)
- `/lite/africa` — Africa edition (Arabic / French / English)
- `/lite/brasil` — Brasil edition (Portuguese)
- `/lite/u/:username` and `/lite/:username` — citizen profile (aliases). Region
  names (`in`, `africa`, `brasil`) and section names are **reserved** and never
  treated as usernames.
- In-app sections (rendered client-side, no separate HTML): market, Hisn, messages,
  settings, login.

The five existing foundation languages (en, fr, ar, es, de) are retained; the region
editions add hi (Hindi) and pt (Portuguese) as Lite-local strings only.

## Budget

Target: **core JS < 50KB gzip**, initial total **< 150KB gzip**. The E2EE library is
loaded via **dynamic import only when entering messages**, so it never counts against
the core budget. No automatic image/media bytes: citizen cards are text-only and
images load only on a deliberate tap through the bounded media endpoint after
`authorizeDownload` agreement.

Run `pnpm --filter @workspace/gdna-arena build` (infrastructure owner) then inspect
the Lite chunk sizes; report raw + gzip.
