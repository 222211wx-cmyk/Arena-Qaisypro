/**
 * Lite page renderers. Each returns a DOM node for a route. Pages compose the
 * shared section wrapper so loading / error+retry / empty / offline-snapshot states
 * are handled per-section.
 */
import { el, mount, skeleton } from "./dom";
import { authorizeDownload } from "./net";
import { section, liteCitizenCard, limitedDataToggle, installControl, type CitizenSummary } from "./components";
import { safeRead, ApiError } from "./api";
import { getUser, login, logout, type SessionUser } from "./session";
import {
  fetchRooms,
  fetchMessages,
  sendText,
  pendingCount,
  RecipientNotSetUpError,
  type LiteRoom,
  type DecryptedMessage,
} from "./messaging";
import { EDITION_LANGS, RTL_LANGS, stringsFor, type LiteLang, type Strings } from "./i18n";
import { href, type Route } from "./router";
import { reportMeasurement } from "../lib/operator-telemetry";
import { recoveryCopy } from "../i18n/recovery-copy";
import { offlineRecoveryCopy } from "../i18n/offline-recovery-copy";
import { recoveryWebHref } from "../lib/recovery-links";
import { coreCopy, coreCopyLocales } from "../i18n/core-auth-copy";

interface Ctx {
  s: Strings;
  lang: LiteLang;
  navigate: (r: Route) => void;
  setLang: (l: LiteLang) => void;
  edition: "default" | "in" | "africa" | "brasil";
}

function requireUser(ctx: Ctx): { node: HTMLElement } | { user: SessionUser } {
  const user = getUser();
  if (user) return { user };
  const node = el("div", { class: "l-card l-stack" }, [
    el("div", { text: ctx.s.loginRequired }),
    el("button", { class: "l-btn l-btn-primary l-btn-sm", text: ctx.s.login, onClick: () => ctx.navigate({ kind: "login" }) }),
  ]);
  return { node };
}

/* ── Home ─────────────────────────────────────────────────────────── */
export function homePage(ctx: Ctx): HTMLElement {
  const root = el("div", { class: "l-stack" });

  const langs = EDITION_LANGS[ctx.edition] ?? EDITION_LANGS.default;
  const picker = el("div", { class: "l-row l-row-wrap" }, [
    el("span", { class: "l-small l-muted", text: `${ctx.s.settings_lang}:` }),
    ...langs.map((l) =>
      el("button", {
        class: ctx.lang === l ? "l-btn l-btn-sm l-btn-primary" : "l-btn l-btn-sm l-btn-ghost",
        text: l.toUpperCase(),
        onClick: () => ctx.setLang(l),
      }),
    ),
  ]);

  const header = el("div", { class: "l-card l-stack" }, [
    el("div", { class: "l-crown", text: ctx.s.crown_banner }),
    el("div", { class: "l-h1", text: ctx.s.brand }),
    el("div", { class: "l-muted", text: ctx.s.tagline }),
    picker,
    installControl(ctx.s),
  ]);
  root.appendChild(header);

  root.appendChild(
    section<CitizenSummary[]>({
      s: ctx.s,
      skeletonLines: 6,
      load: async (signal) => {
        const user = getUser();
        const res = await safeRead<{ citizens?: CitizenSummary[]; nextCursor?: number | null }>(
          "/api/lite/citizens?limit=12",
          { accountId: user?.id ?? null, snapshotKey: "citizens", signal },
        );
        return { data: res.data.citizens ?? [], fromSnapshot: res.fromSnapshot };
      },
      isEmpty: (d) => d.length === 0,
      emptyText: ctx.s.empty_citizens,
      render: (citizens) => {
        const box = el("div", {}, [el("div", { class: "l-h2", text: ctx.s.nav_citizens })]);
        for (const c of citizens) box.appendChild(liteCitizenCard(c, ctx.s, (u) => ctx.navigate({ kind: "profile", username: u })));
        return box;
      },
    }),
  );
  return root;
}

/* ── Profile ──────────────────────────────────────────────────────── */
export function profilePage(ctx: Ctx, username: string): HTMLElement {
  const root = el("div", { class: "l-stack" });
  root.appendChild(
    el("button", { class: "l-btn l-btn-sm l-btn-ghost", text: `← ${ctx.s.back}`, onClick: () => history.back() }),
  );
  root.appendChild(
    section<CitizenSummary>({
      s: ctx.s,
      load: async (signal) => {
        const user = getUser();
        const res = await safeRead<{ profile: CitizenSummary }>(`/api/lite/profile/${encodeURIComponent(username)}`, {
          accountId: user?.id ?? null,
          snapshotKey: `profile:${username}`,
          signal,
        });
        return { data: res.data.profile, fromSnapshot: res.fromSnapshot };
      },
      render: (c) => {
        const card = liteCitizenCard(c, ctx.s, () => {});
        const meta = el("div", { class: "l-card l-stack" }, [
          el("div", { class: "l-row l-spread" }, [
            el("span", { class: "l-muted", text: ctx.s.profile_citizen }),
            el("span", { class: "l-gold", text: c.displayName || c.username }),
          ]),
          c.id != null
            ? el("div", { class: "l-row l-spread" }, [el("span", { class: "l-muted", text: "ID" }), el("span", { text: String(c.id) })])
            : null,
        ]);
        return el("div", {}, [card, meta]);
      },
    }),
  );
  return root;
}

/* ── Market ───────────────────────────────────────────────────────── */
interface MarketListing {
  id: number | string;
  type?: string;
  title: string;
  price?: string | number;
  description?: string;
  seller?: { username: string; displayName?: string };
}
export function marketPage(ctx: Ctx): HTMLElement {
  const root = el("div", { class: "l-stack" }, [el("div", { class: "l-h1", text: ctx.s.nav_market })]);
  root.appendChild(
    section<MarketListing[]>({
      s: ctx.s,
      skeletonLines: 5,
      load: async (signal) => {
        const user = getUser();
        const res = await safeRead<{ listings?: MarketListing[]; nextCursor?: number | null }>(
          "/api/lite/market?limit=12",
          { accountId: user?.id ?? null, snapshotKey: "market", signal },
        );
        return { data: res.data.listings ?? [], fromSnapshot: res.fromSnapshot };
      },
      isEmpty: (d) => d.length === 0,
      emptyText: ctx.s.empty_market,
      render: (items) => {
        const box = el("div", {});
        for (const it of items) {
          box.appendChild(
            el("div", { class: "l-card l-stack" }, [
              el("div", { class: "l-row l-spread l-row-wrap" }, [
                el("div", { class: "l-h2 l-grow", text: it.title }),
                it.price != null ? el("span", { class: "l-badge l-badge-gold", text: `${ctx.s.market_price}: ${it.price}` }) : null,
              ]),
              it.type ? el("span", { class: "l-badge", text: it.type }) : null,
              it.description ? el("div", { class: "l-small", text: it.description }) : null,
              it.seller ? el("button", {
                class: "l-btn l-btn-sm l-btn-ghost",
                text: `@${it.seller.username}`,
                onClick: () => ctx.navigate({ kind: "profile", username: it.seller!.username }),
              }) : null,
            ]),
          );
        }
        return box;
      },
    }),
  );
  return root;
}

/* ── Clips (text-only; audio may be unavailable) ──────────────────── */
interface ClipItem {
  id: number | string;
  title: string;
  durationSec?: number;
  username: string;
  audio: { url?: string; bytes?: number } | null;
}
export function clipsPage(ctx: Ctx): HTMLElement {
  const root = el("div", { class: "l-stack" }, [el("div", { class: "l-h1", text: ctx.s.nav_clips })]);
  root.appendChild(
    section<ClipItem[]>({
      s: ctx.s,
      skeletonLines: 5,
      load: async (signal) => {
        const user = getUser();
        const res = await safeRead<{ clips?: ClipItem[]; nextCursor?: number | null }>(
          "/api/lite/clips?limit=12",
          { accountId: user?.id ?? null, snapshotKey: "clips", signal },
        );
        return { data: res.data.clips ?? [], fromSnapshot: res.fromSnapshot };
      },
      isEmpty: (d) => d.length === 0,
      emptyText: ctx.s.empty_clips,
      render: (clips) => {
        const box = el("div", {});
        for (const clip of clips) {
          const dur = clip.durationSec != null ? `${Math.round(clip.durationSec)}s` : null;
          box.appendChild(
            el("div", { class: "l-card l-stack" }, [
              el("div", { class: "l-row l-spread l-row-wrap" }, [
                el("div", { class: "l-h2 l-grow", text: clip.title }),
                dur ? el("span", { class: "l-badge", text: dur }) : null,
              ]),
              el("div", { class: "l-small l-muted", text: `@${clip.username}` }),
              // No autoplay, no thumbnail, no speculative sizes. Audio is only
              // offered when a real derivative with a real byte size exists.
              clip.audio && typeof clip.audio.bytes === "number"
                ? clipAudioControl(clip.audio.url, clip.audio.bytes, ctx.s, clip.id)
                : el("div", { class: "l-small l-muted", text: ctx.s.audio_unavailable }),
            ]),
          );
        }
        return box;
      },
    }),
  );
  return root;
}

function clipAudioControl(url: string | undefined, bytes: number, s: Strings, clipId: number | string): HTMLElement {
  const host = el("div", {});
  if (!url) {
    mount(host, el("div", { class: "l-small l-muted", text: s.audio_unavailable }));
    return host;
  }
  const cid = typeof clipId === "number" ? clipId : Number(clipId);
  const mb = (bytes / 1_000_000).toFixed(2);
  mount(
    host,
    el("button", {
      class: "l-btn l-btn-sm l-btn-ghost",
      text: `${s.load_audio} (${mb} MB)`,
      onClick: () => {
        // Real encoded byte size drives the permission prompt; >1MB requires consent.
        if (!authorizeDownload(bytes, s.load_audio)) return;
        const audio = el("audio", { controls: true, preload: "none", src: url }) as HTMLAudioElement;
        audio.style.width = "100%";
        // Consented measurement: report ONLY after an actual successful transfer
        // (real bytes played), never on the button click above. `bytes` is the
        // real encoded size from clip metadata; the server re-validates it.
        let reported = false;
        audio.addEventListener(
          "playing",
          () => {
            if (reported) return;
            reported = true;
            void reportMeasurement({
              surface: "clips",
              outcome: "success",
              observedBytes: bytes,
              clipId: Number.isFinite(cid) ? cid : undefined,
            });
          },
          { once: true },
        );
        audio.addEventListener(
          "error",
          () => {
            if (reported) return;
            reported = true;
            void reportMeasurement({
              surface: "clips",
              outcome: "failure",
              observedBytes: 0,
              clipId: Number.isFinite(cid) ? cid : undefined,
            });
          },
          { once: true },
        );
        mount(host, audio);
      },
    }),
  );
  return host;
}

/* ── Hisn (fortress) ──────────────────────────────────────────────── */
export function hisnPage(ctx: Ctx): HTMLElement {
  const gate = requireUser(ctx);
  if ("node" in gate) return el("div", { class: "l-stack" }, [el("div", { class: "l-h1", text: ctx.s.hisn_title }), gate.node]);
  const user = gate.user;
  const root = el("div", { class: "l-stack" }, [
    el("div", { class: "l-h1", text: ctx.s.hisn_title }),
    el("div", { class: "l-card l-stack" }, [
      el("div", { class: "l-crown", text: ctx.s.crown_banner }),
      el("div", { class: "l-muted", text: ctx.s.hisn_desc }),
      el("div", { class: "l-row l-spread" }, [el("span", { class: "l-muted", text: ctx.s.profile_citizen }), el("span", { class: "l-gold", text: `@${user.username}` })]),
      el("div", { class: "l-row l-spread" }, [el("span", { class: "l-muted", text: "ID" }), el("span", { text: String(user.id) })]),
      limitedDataToggle(ctx.s),
    ]),
  ]);
  return root;
}

/* ── Messages ─────────────────────────────────────────────────────── */
export function messagesPage(ctx: Ctx, roomId?: number): HTMLElement {
  const gate = requireUser(ctx);
  if ("node" in gate) return el("div", { class: "l-stack" }, [el("div", { class: "l-h1", text: ctx.s.nav_messages }), gate.node]);
  const user = gate.user;

  if (roomId != null) return conversationView(ctx, user, roomId);

  const root = el("div", { class: "l-stack" }, [el("div", { class: "l-h1", text: ctx.s.nav_messages })]);

  // Offline queue status
  const queueInfo = el("div", {});
  void pendingCount(user).then((n) => {
    if (n > 0) mount(queueInfo, el("div", { class: "l-banner l-banner-warn", text: `${ctx.s.queued_offline} (${n})` }));
  });
  root.appendChild(queueInfo);

  root.appendChild(
    section<LiteRoom[]>({
      s: ctx.s,
      load: async (signal) => {
        const { rooms, fromSnapshot } = await fetchRooms(user, signal);
        return { data: rooms, fromSnapshot };
      },
      isEmpty: (d) => d.length === 0,
      emptyText: ctx.s.empty_messages,
      render: (rooms) => {
        const box = el("div", {});
        for (const r of rooms) {
          box.appendChild(
            el("button", {
              class: "l-card l-stack",
              style: "width:100%;text-align:inherit",
              onClick: () => ctx.navigate({ kind: "messages", roomId: r.id }),
            }, [
              el("div", { class: "l-h2", text: r.name }),
              r.lastMessagePreview ? el("div", { class: "l-small l-muted", text: r.lastMessagePreview }) : null,
            ]),
          );
        }
        return box;
      },
    }),
  );
  return root;
}

function conversationView(ctx: Ctx, user: SessionUser, roomId: number): HTMLElement {
  const root = el("div", { class: "l-stack" }, [
    el("button", { class: "l-btn l-btn-sm l-btn-ghost", text: `← ${ctx.s.nav_messages}`, onClick: () => ctx.navigate({ kind: "messages" }) }),
  ]);

  const list = section<DecryptedMessage[]>({
    s: ctx.s,
    load: async (signal) => {
      const { messages, fromSnapshot } = await fetchMessages(user, roomId, signal);
      return { data: messages, fromSnapshot };
    },
    isEmpty: (d) => d.length === 0,
    emptyText: ctx.s.empty_messages,
    render: (messages) => {
      const box = el("div", { class: "l-stack" });
      for (const m of messages) {
        const mine = m.userId === user.id;
        box.appendChild(
          el("div", { class: "l-card" }, [
            el("div", { class: "l-small l-muted", text: mine ? `@${user.username}` : `@${m.username}` }),
            el("div", {
              class: m.decryptError ? "l-small l-err" : "",
              text: m.decryptError ? ctx.s.decrypt_failed : (m.plaintext ?? ""),
            }),
            m.encrypted && !m.decryptError ? el("span", { class: "l-badge", text: "E2EE" }) : null,
          ]),
        );
      }
      return box;
    },
  });
  root.appendChild(list);

  // Composer
  const status = el("div", {});
  const ta = el("textarea", { class: "l-input", placeholder: ctx.s.compose, rows: 2 }) as HTMLTextAreaElement;
  const btn = el("button", { class: "l-btn l-btn-primary", text: ctx.s.send }) as HTMLButtonElement;
  let sending = false;

  async function submit(): Promise<void> {
    const text = ta.value.trim();
    if (sending || !text) return;
    sending = true;
    btn.disabled = true;
    ta.disabled = true;
    mount(status);
    try {
      const online = navigator.onLine;
      const res = await sendText(user, roomId, text, { online });
      ta.value = "";
      if (res.status === "queued") mount(status, el("div", { class: "l-banner l-banner-warn", text: ctx.s.queued_offline }));
      else mount(status, el("div", { class: "l-banner", text: ctx.s.send + " ✓" }));
    } catch (err) {
      if (err instanceof RecipientNotSetUpError) {
        mount(status, el("div", { class: "l-banner l-banner-err", text: ctx.s.connect_first }));
      } else if (err instanceof ApiError && err.status === 409) {
        mount(status, el("div", { class: "l-banner l-banner-err l-stack" }, [
          el("div", { text: ctx.s.needs_review }),
          el("div", { class: "l-small", text: ctx.s.needs_review_hint }),
        ]));
      } else {
        mount(status, el("div", { class: "l-banner l-banner-err", text: err instanceof Error ? err.message : ctx.s.section_error }));
      }
    } finally {
      sending = false;
      btn.disabled = false;
      ta.disabled = false;
    }
  }
  btn.addEventListener("click", () => void submit());

  root.appendChild(
    el("div", { class: "l-card l-stack" }, [
      el("div", { class: "l-h2", text: ctx.s.compose }),
      ta,
      status,
      el("div", { class: "l-row" }, [btn]),
    ]),
  );
  return root;
}

/* ── Settings ─────────────────────────────────────────────────────── */
export function settingsPage(ctx: Ctx): HTMLElement {
  const user = getUser();
  const recovery = recoveryCopy(ctx.lang);
  const langs = EDITION_LANGS[ctx.edition] ?? EDITION_LANGS.default;
  const allLangs: LiteLang[] = ["en", "fr", "ar", "es", "de", ...langs.filter((l) => !["en", "fr", "ar", "es", "de"].includes(l))];
  const uniqueLangs = Array.from(new Set(allLangs));

  const root = el("div", { class: "l-stack" }, [
    el("div", { class: "l-h1", text: ctx.s.nav_settings }),
    el("div", { class: "l-card l-stack" }, [
      el("div", { class: "l-h2", text: ctx.s.settings_lang }),
      el("div", { class: "l-row l-row-wrap" }, uniqueLangs.map((l) =>
        el("button", {
          class: ctx.lang === l ? "l-btn l-btn-sm l-btn-primary" : "l-btn l-btn-sm l-btn-ghost",
          text: l.toUpperCase(),
          onClick: () => ctx.setLang(l),
        }),
      )),
    ]),
    el("div", { class: "l-card l-stack" }, [
      el("div", { class: "l-h2", text: ctx.s.settings_data }),
      limitedDataToggle(ctx.s),
      el("div", { class: "l-small l-muted", text: ctx.s.limited_data_hint }),
      installControl(ctx.s),
    ]),
    el("div", { class: "l-card l-stack" }, [
      el("div", { class: "l-h2", text: ctx.s.login }),
      user
        ? el("div", { class: "l-row l-spread" }, [
            el("span", { class: "l-gold", text: `@${user.username}` }),
            el("button", { class: "l-btn l-btn-sm", text: ctx.s.logout, onClick: () => {
              void logout()
                .then(() => ctx.navigate({ kind: "home", edition: ctx.edition }))
                .catch(() => {
                  // Logout already exposes the failure and retry in the
                  // session gate; never navigate as if revocation succeeded.
                });
            } }),
          ])
        : el("button", { class: "l-btn l-btn-primary l-btn-sm", text: ctx.s.login, onClick: () => ctx.navigate({ kind: "login" }) }),
    ]),
    el("div", { class: "l-card l-stack" }, [
      el("div", { class: "l-h2", text: recovery.phoneTitle }),
      el("p", { class: "l-small l-muted", text: recovery.optIn }),
      el("a", { class: "l-btn l-btn-primary l-btn-sm", href: recoveryWebHref("/recovery-phone", "/lite/settings", ctx.lang), text: recovery.manage, "data-testid": "link-lite-recovery-phone" }),
      el("p", { class: "l-small l-muted", text: recovery.fullWeb }),
    ]),
    el("div", { class: "l-card l-stack" }, [
      el("div", { class: "l-h2", text: offlineRecoveryCopy(ctx.lang).title }),
      el("p", { class: "l-small l-muted", text: offlineRecoveryCopy(ctx.lang).intro }),
      el("a", { class: "l-btn l-btn-primary l-btn-sm", href: recoveryWebHref("/recovery-code", "/lite/settings", ctx.lang), text: offlineRecoveryCopy(ctx.lang).openPage, "data-testid": "link-lite-recovery-code" }),
    ]),
  ]);
  return root;
}

/* ── Login ────────────────────────────────────────────────────────── */
export function loginPage(ctx: Ctx): HTMLElement {
  const copy = coreCopy(ctx.lang in coreCopyLocales ? ctx.lang as keyof typeof coreCopyLocales : "en");
  const err = el("div", {});
  const uInput = el("input", { class: "l-input", type: "text", autocomplete: "username", name: "username" }) as HTMLInputElement;
  const pInput = el("input", { class: "l-input", type: "password", autocomplete: "current-password", name: "password" }) as HTMLInputElement;
  const btn = el("button", { class: "l-btn l-btn-primary", type: "submit", text: ctx.s.signIn }) as HTMLButtonElement;

  const form = el("form", { class: "l-card l-stack" }, [
    el("div", { class: "l-h1", text: ctx.s.login }),
    el("div", { class: "l-banner l-small l-muted l-stack", role: "note", "data-testid": "notice-lite-single-account" }, [
      el("p", { text: copy.singleAccount }),
      el("p", { text: copy.sessionNotice }),
      el("p", { text: copy.accessNotice }),
    ]),
    el("div", { class: "l-field" }, [el("label", { class: "l-label", text: ctx.s.username }), uInput]),
    el("div", { class: "l-field" }, [el("label", { class: "l-label", text: ctx.s.password }), pInput]),
    err,
    el("div", { class: "l-row" }, [btn]),
    el("a", { class: "l-gold", href: recoveryWebHref("/recover-account", "/lite/login", ctx.lang), text: recoveryCopy(ctx.lang).forgot, "data-testid": "link-lite-forgot-password" }),
    el("a", { class: "l-gold", href: recoveryWebHref("/recover-with-code", "/lite/login", ctx.lang), text: offlineRecoveryCopy(ctx.lang).link, "data-testid": "link-lite-recover-with-code" }),
    el("p", { class: "l-small l-muted", text: recoveryCopy(ctx.lang).fullWeb }),
    el("a", { class: "l-gold", href: `${import.meta.env.BASE_URL.replace(/\/$/, "")}/register?lang=${encodeURIComponent(ctx.lang)}`, text: copy.registerHere, "data-testid": "link-lite-register" }),
  ]) as HTMLFormElement;

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const username = uInput.value.trim();
    const password = pInput.value;
    if (!username || !password) return;
    btn.disabled = true;
    btn.textContent = ctx.s.signingIn;
    mount(err);
    void login(username, password)
      .then(() => ctx.navigate({ kind: "home", edition: ctx.edition }))
      .catch((e2: unknown) => {
        mount(err, el("div", { class: "l-banner l-banner-err", text: e2 instanceof Error ? e2.message : ctx.s.section_error }));
      })
      .finally(() => {
        btn.disabled = false;
        btn.textContent = ctx.s.signIn;
      });
  });

  return el("div", { class: "l-stack" }, [form]);
}

/* helper re-exports for the entry */
export { stringsFor, RTL_LANGS, skeleton };
