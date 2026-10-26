/**
 * Shared Lite UI components, built from the token subset. Vanilla DOM.
 */
import { el, mount, skeleton } from "./dom";
import { authorizeDownload, getNetworkState, setLimitedData, subscribeNetwork } from "./net";
import { apiMediaUrl } from "./messaging";
import type { Strings } from "./i18n";
import { reportMeasurement } from "../lib/operator-telemetry";

/**
 * Independent section with its own loading / error+retry / empty states, so one
 * failing section never takes down the rest of the portal.
 */
export function section<T>(opts: {
  s: Strings;
  load: (signal: AbortSignal) => Promise<{ data: T; fromSnapshot?: boolean }>;
  render: (data: T, fromSnapshot: boolean) => Node;
  isEmpty?: (data: T) => boolean;
  emptyText?: string;
  skeletonLines?: number;
}): HTMLElement {
  const host = el("div", { class: "l-section" });
  let controller: AbortController | null = null;

  async function run(): Promise<void> {
    controller?.abort();
    controller = new AbortController();
    mount(host, skeleton(opts.skeletonLines ?? 4));
    try {
      const { data, fromSnapshot } = await opts.load(controller.signal);
      if (controller.signal.aborted) return;
      if (opts.isEmpty?.(data)) {
        mount(host, el("div", { class: "l-card l-muted", text: opts.emptyText ?? "Nothing here yet." }));
        return;
      }
      const body = el("div", {});
      if (fromSnapshot) body.appendChild(el("div", { class: "l-banner l-banner-warn", text: opts.s.offline_snapshot }));
      body.appendChild(opts.render(data, Boolean(fromSnapshot)));
      mount(host, body);
    } catch (err) {
      if (controller.signal.aborted) return;
      const msg = err instanceof Error && err.message ? err.message : opts.s.section_error;
      mount(
        host,
        el("div", { class: "l-card l-stack" }, [
          el("div", { class: "l-err", text: opts.s.section_error }),
          el("div", { class: "l-small l-muted", text: msg }),
          el("button", { class: "l-btn l-btn-sm", text: opts.s.retry, onClick: () => void run() }),
        ]),
      );
    }
  }

  void run();
  return host;
}

/** Localized network banner: offline / slow / save-data. Auto-updates. */
export function networkBanner(s: Strings): { node: HTMLElement; dispose: () => void } {
  const node = el("div", {});
  function paint(): void {
    const online = typeof navigator === "undefined" ? true : navigator.onLine;
    const st = getNetworkState();
    let text: string | null = null;
    let cls = "l-banner";
    if (!online) {
      text = s.net_offline;
      cls = "l-banner l-banner-err";
    } else if (st.effectiveType === "slow-2g" || st.effectiveType === "2g") {
      text = s.net_slow;
      cls = "l-banner l-banner-warn";
    } else if (st.saveData || st.limitedData) {
      text = s.net_savedata;
      cls = "l-banner";
    }
    if (text) mount(node, el("div", { class: cls, text }));
    else mount(node);
  }
  const unsubNet = subscribeNetwork(() => paint());
  const on = () => paint();
  window.addEventListener("online", on);
  window.addEventListener("offline", on);
  paint();
  return {
    node,
    dispose() {
      unsubNet();
      window.removeEventListener("online", on);
      window.removeEventListener("offline", on);
    },
  };
}

/** Limited-data toggle. */
export function limitedDataToggle(s: Strings): HTMLElement {
  const input = el("input", { type: "checkbox" }) as HTMLInputElement;
  input.checked = getNetworkState().limitedData;
  input.addEventListener("change", () => setLimitedData(input.checked));
  subscribeNetwork((st) => {
    input.checked = st.limitedData;
  });
  return el("label", { class: "l-switch" }, [input, el("span", { text: s.limited_data })]);
}

export interface CitizenSummary {
  id?: number;
  username: string;
  displayName?: string;
  rank?: string;
  bio?: string;
  /** Presence of a stored avatar per the Lite API. Bytes load only on tap. */
  avatarUrl?: string | null;
  joined?: string;
}

/** Bounded Lite avatar endpoint. Server caps bytes (≤5120 with slow, else ≤10240). */
export function avatarEndpoint(username: string): string {
  const st = getNetworkState();
  const slow = st.limitedData || st.saveData || st.effectiveType === "2g" || st.effectiveType === "slow-2g";
  return `/api/lite/avatar/${encodeURIComponent(username)}${slow ? "?slow=1" : ""}`;
}

/**
 * Text-only citizen card. NO image bytes load automatically — the avatar is a slot
 * that fetches through the bounded Lite avatar endpoint only on a deliberate tap,
 * after download authorization.
 */
export function liteCitizenCard(
  c: CitizenSummary,
  s: Strings,
  onOpen: (username: string) => void,
): HTMLElement {
  const title = c.displayName || c.username;
  // The server caps the avatar at ≤10240 bytes (≤5120 with ?slow=1); pass that
  // upper bound so limited-data authorization can decide without a HEAD request.
  const st = getNetworkState();
  const slow = st.limitedData || st.saveData || st.effectiveType === "2g" || st.effectiveType === "slow-2g";
  const card = el("div", { class: "l-card l-stack" }, [
    el("div", { class: "l-row l-spread l-row-wrap" }, [
      el("div", { class: "l-grow" }, [
        el("div", { class: "l-h2", text: title }),
        el("div", { class: "l-small l-muted", text: `@${c.username}` }),
      ]),
      c.rank ? el("span", { class: "l-badge l-badge-gold", text: c.rank }) : null,
    ]),
    c.bio ? el("div", { class: "l-small", text: c.bio }) : null,
    c.avatarUrl ? mediaSlot(avatarEndpoint(c.username), `${title} photo`, s, slow ? 5120 : 10240) : null,
    el("div", { class: "l-row" }, [
      el("button", {
        class: "l-btn l-btn-sm",
        text: s.view_profile,
        onClick: () => onOpen(c.username),
      }),
    ]),
  ]);
  return card;
}

/**
 * Deliberate-tap media slot. Zero automatic bytes. On tap, asks the network helper
 * for download authorization before fetching the bounded media endpoint. A 503 from
 * the avatar encoder is surfaced explicitly rather than shown as a broken image.
 */
export function mediaSlot(path: string, label: string, s: Strings, knownBytes: number | null = null): HTMLElement {
  const slot = el("div", { class: "l-media-slot" });
  const showPrompt = () => {
    mount(
      slot,
      el("button", {
        class: "l-btn l-btn-sm l-btn-ghost",
        text: s.load_image,
        onClick: () => void load(),
      }),
      el("div", { class: "l-small l-muted", text: s.image_off }),
    );
  };
  async function load(): Promise<void> {
    if (!authorizeDownload(knownBytes, label)) return;
    mount(slot, el("div", { class: "l-small l-muted", text: s.loading }));
    try {
      const res = await fetch(apiMediaUrl(path), { credentials: "include" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const img = el("img", { alt: label, src: url }) as HTMLImageElement;
      img.addEventListener("load", () => URL.revokeObjectURL(url), { once: true });
      mount(slot, img);
      // Consented measurement: report only after the bytes actually arrived,
      // using the real transferred blob size (avatar surface).
      void reportMeasurement({ surface: "profile", outcome: "success", observedBytes: blob.size });
    } catch {
      void reportMeasurement({ surface: "profile", outcome: "failure", observedBytes: 0 });
      mount(
        slot,
        el("div", { class: "l-small l-err", text: s.section_error }),
        el("button", { class: "l-btn l-btn-sm", text: s.retry, onClick: () => void load() }),
      );
    }
  }
  showPrompt();
  return slot;
}

/** PWA install button (when supported) + iOS manual instructions. */
export function installControl(s: Strings): HTMLElement {
  const host = el("div", {});
  const w = window as typeof window & { __gdnaLiteInstallPrompt?: Event & { prompt: () => void } };

  const isIos = /iphone|ipad|ipod/i.test(navigator.userAgent) && !("MSStream" in window);
  const standalone =
    window.matchMedia?.("(display-mode: standalone)").matches ||
    (navigator as unknown as { standalone?: boolean }).standalone === true;

  function paint(): void {
    if (standalone) {
      mount(host);
      return;
    }
    if (w.__gdnaLiteInstallPrompt) {
      mount(
        host,
        el("button", {
          class: "l-btn l-btn-primary l-btn-sm",
          text: s.install_app,
          onClick: () => {
            const evt = w.__gdnaLiteInstallPrompt as (Event & { prompt: () => Promise<void> }) | undefined;
            void evt?.prompt();
          },
        }),
      );
    } else if (isIos) {
      mount(host, el("div", { class: "l-banner", text: s.install_ios }));
    } else {
      mount(host);
    }
  }

  const onPrompt = (e: Event) => {
    e.preventDefault();
    w.__gdnaLiteInstallPrompt = e as Event & { prompt: () => void };
    paint();
  };
  window.addEventListener("beforeinstallprompt", onPrompt);
  paint();
  return host;
}
