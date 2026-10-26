/* Standard Web Push handlers appended to the canonical PWA worker. */
// One-time retirement of the old Clips queue only. Never touch chat keys/outbox.
self.addEventListener("activate", event => {
  event.waitUntil(new Promise(resolve => {
    const deletion = indexedDB.deleteDatabase("helixly-clips-uploads-v1");
    deletion.onsuccess = deletion.onerror = deletion.onblocked = () => resolve();
  }));
});
// Worker replays ciphertext only; no plaintext, decryption keys, or API caches.
self.addEventListener("sync", event => {
  if (event.tag !== "gdna-lite-outbox") return;
  event.waitUntil((async () => {
    const result = await GDNA_LITE_SYNC.drainLiteOutbox({
      idb: indexedDB, request: fetch.bind(self), base: self.registration.scope,
      now: () => Date.now(), sleep: ms => new Promise(resolve => setTimeout(resolve, ms)),
    });
    const clients = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    for (const client of clients) {
      const url = new URL(client.url);
      const base = new URL(self.registration.scope).pathname.replace(/\/$/, "");
      if (url.origin === self.location.origin && (url.pathname === base + "/lite" || url.pathname.startsWith(base + "/lite/"))) {
        client.postMessage({ type: "gdna-lite-sync", result });
      }
    }
    // Rejection asks the browser to reschedule, without an unbounded worker loop.
    if (result.retry) throw new Error("Lite outbox has retryable work");
  })());
});
const GDNA_CALL_ID = /^[A-Za-z0-9_-]{1,128}$/;
const GDNA_CALL_TTL_MS = 30_000;

function gdnaText(value) {
  return typeof value === "string" ? value.trim() : "";
}

function gdnaCallId(data) {
  const id = gdnaText(data && (data.callId || data.call_id || data.id));
  return GDNA_CALL_ID.test(id) ? id : "";
}

function gdnaExpiry(value) {
  if (typeof value === "number" && Number.isFinite(value)) return value < 1e12 ? value * 1000 : value;
  const raw = gdnaText(value);
  if (!raw) return null;
  const numeric = Number(raw);
  if (Number.isFinite(numeric)) return numeric < 1e12 ? numeric * 1000 : numeric;
  const parsed = Date.parse(raw);
  return Number.isFinite(parsed) ? parsed : null;
}

function gdnaKind(data) {
  return gdnaText(data && (data.type || data.event)).toUpperCase().replace(/[-\s]/g, "_");
}

function gdnaAppUrl(callId, action) {
  const url = new URL("messages", self.registration.scope);
  if (callId) url.searchParams.set("callId", callId);
  if (action) url.searchParams.set("action", action);
  return url.toString();
}

function gdnaCloseCall(callId) {
  return self.registration.getNotifications({ tag: "gdna-incoming-call-" + callId })
    .then(items => items.forEach(item => item.close()));
}

function gdnaClientsMessage(message) {
  return self.clients.matchAll({ type: "window", includeUncontrolled: true }).then(items => {
    const scope = new URL(self.registration.scope);
    items.forEach(client => {
      try {
        const url = new URL(client.url);
        if (url.origin === scope.origin && url.pathname.startsWith(scope.pathname)) client.postMessage(message);
      } catch {}
    });
  });
}

function gdnaFocusOrOpen(url) {
  const trusted = new URL(url, self.registration.scope);
  if (trusted.origin !== self.location.origin ||
      !trusted.pathname.startsWith(new URL(self.registration.scope).pathname)) {
    trusted.href = gdnaAppUrl("", "");
  }
  return self.clients.matchAll({ type: "window", includeUncontrolled: true }).then(items => {
    const client = items.find(item => {
      try {
        const candidate = new URL(item.url);
        const scope = new URL(self.registration.scope);
        return candidate.origin === trusted.origin && candidate.pathname.startsWith(scope.pathname);
      } catch { return false; }
    });
    if (!client) return self.clients.openWindow(trusted.toString());
    return Promise.resolve(client.navigate(trusted.toString())).catch(() => client)
      .then(() => client.focus());
  });
}

// A worker cannot read the page's installation ID from localStorage. Renew the
// previous endpoint only; the server checks its original account/session owner.
self.addEventListener("pushsubscriptionchange", event => {
  event.waitUntil((async () => {
    const previous = event.oldSubscription;
    if (!previous || !previous.endpoint) throw new Error("Previous subscription unavailable");
    const subscription = event.newSubscription || await new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error("Subscription renewal timed out")), 15_000);
      self.registration.pushManager.subscribe(previous.options).then(
        value => { clearTimeout(timer); resolve(value); },
        error => { clearTimeout(timer); reject(error); },
      );
    });
    if (!subscription) throw new Error("Replacement subscription unavailable");
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 10_000);
    try {
      const response = await fetch(new URL("api/browser-push/subscriptions/renew", self.registration.scope).toString(), {
        method: "POST",
        credentials: "same-origin",
        signal: controller.signal,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          oldEndpoint: previous.endpoint,
          subscription: subscription.toJSON(),
        }),
      });
      if (!response.ok) throw new Error("Subscription renewal rejected");
    } finally {
      clearTimeout(timer);
    }
  })().catch(() => {
    // Do not log private endpoint/key values. The normal authenticated restore
    // on the next app opening also repairs a renewal that happened offline.
    console.warn("Call notification renewal failed; reopen the app or enable call alerts again.");
    return gdnaClientsMessage({ type: "GDNA_PUSH_RENEWAL_FAILED" });
  }));
});

self.addEventListener("push", event => {
  let data = {};
  try { data = event.data ? event.data.json() : {}; } catch { return; }
  if (!data || typeof data !== "object") return;
  data = Object.assign(
    {},
    data,
    data.notification && typeof data.notification === "object" ? data.notification : {},
    data.data && typeof data.data === "object" ? data.data : {},
  );
  const callId = gdnaCallId(data);
  if (!callId) return;
  const kind = gdnaKind(data);
  const terminal = [
    "CALL_ENDED", "ENDED_CALL", "CALL_TERMINAL", "MISSED_CALL", "CALL_MISSED",
    "DECLINED_CALL", "CALL_DECLINED", "CALL_EXPIRED",
  ].includes(kind);
  if (terminal) {
    event.waitUntil(Promise.all([
      gdnaCloseCall(callId).catch(() => {}),
      gdnaClientsMessage({ type: "GDNA_CALL_TERMINAL", callId, status: kind === "MISSED_CALL" ? "missed" : "ended" }),
    ]));
    return;
  }
  if (kind !== "INCOMING_CALL" && kind !== "CALL_INCOMING") return;
  const now = Date.now();
  const suppliedExpiry = gdnaExpiry(data.expiresAt || data.expires_at);
  const expiresAt = suppliedExpiry === null ? now + GDNA_CALL_TTL_MS : Math.min(suppliedExpiry, now + GDNA_CALL_TTL_MS);
  if (expiresAt <= now) {
    event.waitUntil(gdnaCloseCall(callId).catch(() => {}));
    return;
  }
  const fromName = gdnaText(data.fromName || data.callerName);
  const title = gdnaText(data.title) || (fromName ? "مكالمة واردة من " + fromName : "مكالمة جديدة");
  const options = {
    body: gdnaText(data.body) || "لديك مكالمة واردة",
    icon: new URL("icon.png", self.registration.scope).toString(),
    tag: "gdna-incoming-call-" + callId,
    requireInteraction: true,
    silent: false,
    vibrate: [200, 100, 200, 100, 200],
    actions: [
      { action: "answer", title: "الرد" },
      { action: "decline", title: "رفض" },
    ],
    data: { kind: "incoming", callId, expiresAt },
  };
  event.waitUntil(Promise.all([
    gdnaClientsMessage({ type: "GDNA_CALL_INVITATION", callId }),
    gdnaCloseCall(callId).catch(() => {}).then(() => self.registration.showNotification(title, options))
      .then(() => {
        // Worker lifetime is not extended to simulate ringing. This timer is
        // only a best-effort stale-card close if the browser keeps us alive.
        setTimeout(() => { gdnaCloseCall(callId).catch(() => {}); }, expiresAt - Date.now());
      }),
  ]));
});

self.addEventListener("notificationclick", event => {
  const data = event.notification && event.notification.data || {};
  if (data.kind !== "incoming") return;
  const callId = gdnaCallId(data);
  event.notification.close();
  if (!callId) {
    event.waitUntil(gdnaFocusOrOpen(gdnaAppUrl("", "")));
    return;
  }
  const action = gdnaText(event.action).toLowerCase();
  const expired = gdnaExpiry(data.expiresAt) !== null && gdnaExpiry(data.expiresAt) <= Date.now();
  if (action === "answer" && !expired) {
    event.waitUntil(gdnaFocusOrOpen(gdnaAppUrl(callId, "answer")));
  } else if (action === "decline" && !expired) {
    const endpoint = new URL("api/call/decline", self.registration.scope);
    endpoint.searchParams.set("id", callId);
    event.waitUntil(fetch(endpoint.toString(), {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
    }).then(response => {
      if (!response.ok) throw new Error("Decline failed");
      return gdnaFocusOrOpen(gdnaAppUrl(callId, ""));
    }).catch(() => gdnaFocusOrOpen(gdnaAppUrl(callId, "decline"))));
  } else {
    // Notification body clicks are passive and never auto-answer.
    event.waitUntil(gdnaFocusOrOpen(gdnaAppUrl(callId, "")));
  }
});