import { tokens } from "@workspace/gdna-ds/tokens";
import { mountLightweightBackButton } from "./lib/lightweight-back-button";
import { createLightweightCallBoundary } from "./lib/lightweight-call-boundary";
import { announceAccountChange, fetchSharedClipSession, subscribeAccountChanges, subscribeSessionWake } from "./lib/account-session-events";
import { mountVideoActions, type VideoActionState } from "./components/clips/VideoActions";
import { clipOverlayCss } from "./components/clips/clipOverlayStyles";
import { reelsIcons } from "./components/clips/reelsIcons";
import { fetchEngagement } from "./components/clips/reelsApi";

const BASE = import.meta.env.BASE_URL;
const FETCH_TIMEOUT_MS = 12_000;
const POLL_DELAY_MS = 4_000;
const MAX_AUTOMATIC_POLLS = 30;

type ClipByCode = {
  code: string;
  name: string;
  originalName: string;
  duration: number;
  size: number;
  created_at: string;
  contentType: string;
  processingStatus: string;
  url: string | null;
  id: number;
  author: { id: number; username: string; avatarUrl?: string | null };
  isOwner: boolean;
  liked: boolean;
  likeCount: number;
  commentCount: number;
  saved?: boolean;
  saveCount?: number;
  shareCount?: number;
};

const palette = tokens.color.dark;
const space = tokens.spacing;

function addStyles() {
  const style = document.createElement("style");
  style.textContent = `
    :root{color-scheme:dark;font-family:${tokens.fontFamily.sans.join(",")};background:${palette.background};color:${palette.foreground}}
    *{box-sizing:border-box}body{margin:0;background:${palette.background};color:${palette.foreground}}
    .direct-clip-shell{position:fixed;inset:var(--arena-navigation-height, 0px) 0 0;display:flex;flex-direction:column;background:${palette.background};overflow:hidden}
    .direct-clip-shell.clip-css-fullscreen{z-index:2147483647}
    .direct-topbar{height:64px;display:grid;grid-template-columns:1fr auto 1fr;align-items:center;padding:env(safe-area-inset-top,0px) calc(${space} * 3) 0;border-bottom:1px solid ${palette.border};flex:none}
    .direct-topbar h1{font-size:1.15rem;text-align:center;white-space:nowrap}
    .direct-topbar-right{display:flex;justify-content:flex-end;gap:calc(${space} * 2)}
    .direct-icon{display:inline-flex;align-items:center;justify-content:center;width:44px;height:44px;padding:0;border:0;border-radius:9999px;background:transparent;color:${palette.foreground};text-decoration:none}
    .direct-icon svg{width:24px;height:24px}
    main{padding:calc(${space} * 4) calc(${space} * 4) calc(78px + env(safe-area-inset-bottom,0px));margin:auto;max-width:48rem;width:100%;overflow-y:auto;flex:1}
    section{display:grid;gap:calc(${space} * 3);padding:calc(${space} * 4);margin-block:calc(${space} * 4);background:${palette.card};border:1px solid ${palette.border};border-radius:${tokens.radius}}
    h1,p{margin-block:calc(${space} * 2)}button,input{font:inherit;color:${palette.foreground};background:${palette.secondary};border:1px solid ${palette.input};border-radius:${tokens.radius};padding:calc(${space} * 3)}
    button{cursor:pointer;font-weight:700}button:disabled{opacity:.55}
    .comment-form,.title-edit{display:flex;gap:calc(${space} * 2)}.comment-form input,.title-edit input{min-inline-size:0;flex:1}
    .copy-link-fallback{inline-size:min(100%,28rem)}
    video,audio{inline-size:100%;max-block-size:72vh;background:${palette.background};display:block}.clip-zoomed{transform:scale(1.35);transform-origin:center;position:relative;z-index:2}
    #player-media{overflow:hidden;position:relative;border-radius:${tokens.radius}}
    .direct-close{position:sticky;top:0;z-index:4}
    .direct-bottomnav{position:absolute;left:0;right:0;bottom:0;z-index:20;display:flex;background:${palette.background};border-top:1px solid ${palette.border};padding:calc(${space} * 2) calc(${space} * 2) calc(env(safe-area-inset-bottom,0px) + ${space} * 2)}
    .direct-nav-item{flex:1;display:flex;flex-direction:column;align-items:center;gap:2px;padding:${space};border:0;background:transparent;color:${palette.mutedForeground};font-size:.625rem;text-decoration:none}
    .direct-nav-item svg{width:24px;height:24px}.direct-nav-item[data-active=true]{color:${palette.foreground}}
    ${clipOverlayCss(palette, space)}
    a{color:${palette.primary}}.muted{color:${palette.mutedForeground}}.error{color:${palette.destructive}}[hidden]{display:none!important}
  `;
  document.head.append(style);
}

async function fetchClip(code: string, signal: AbortSignal): Promise<ClipByCode> {
  if (/^[1-9]\d*$/.test(code)) {
    const response = await fetch(`${BASE}api/clips/${code}/engagement`, { credentials: "include", signal });
    if (!response.ok) throw new Error("Clip introuvable");
    const data = await response.json();
    if (!data.engagement?.code) throw new Error("Lien du clip indisponible");
    code = data.engagement.code;
  }
  const response = await fetch(`${BASE}api/clip/by-code/${encodeURIComponent(code)}`, {
    credentials: "include",
    cache: "no-store",
    signal,
  });
  if (!response.ok) {
    let message = `تعذر فتح الكليب (${response.status})`;
    try {
      const body = await response.json();
      if (typeof body?.error === "string") message = body.error;
    } catch {
      // Keep status-based error.
    }
    throw new Error(message);
  }
  const body = await response.json();
  if (!body?.clip || body.clip.code !== code) throw new Error("بيانات الكليب غير صالحة");
  return body.clip as ClipByCode;
}

function configureMediaSession(clip: ClipByCode, media: HTMLMediaElement) {
  if (!("mediaSession" in navigator)) return;
  navigator.mediaSession.metadata = new MediaMetadata({
    title: clip.name,
    artist: "HELIXLY",
    album: clip.code,
  });
  const actions: Array<[MediaSessionAction, MediaSessionActionHandler]> = [
    ["play", () => { void media.play(); }],
    ["pause", () => media.pause()],
    ["seekbackward", details => {
      media.currentTime = Math.max(0, media.currentTime - (details.seekOffset ?? 10));
    }],
    ["seekforward", details => {
      media.currentTime = Math.min(media.duration || Infinity, media.currentTime + (details.seekOffset ?? 10));
    }],
    ["seekto", details => {
      if (details.seekTime !== undefined) media.currentTime = details.seekTime;
    }],
  ];
  for (const [action, handler] of actions) {
    try { navigator.mediaSession.setActionHandler(action, handler); } catch { /* Unsupported action. */ }
  }
}

const IDENTITY_TIMEOUT_MS = 8_000;

type Identity =
  | { status: "authenticated"; accountId: number }
  | { status: "anonymous" }
  | { status: "unknown" };

/**
 * Resolve the viewer identity with a bounded timeout. Only a 401 confirms an
 * anonymous viewer (safe to scope saves to the anonymous bucket). Any other
 * failure (network/timeout/5xx) returns "unknown" so the caller disables saving
 * instead of writing a logged-in user's save into the anonymous bucket.
 */
async function resolveIdentity(): Promise<Identity> {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), IDENTITY_TIMEOUT_MS);
  try {
    const response = await fetchSharedClipSession();
    if (controller.signal.aborted) return { status: "unknown" };
    if (response.status === 401) return { status: "anonymous" };
    if (!response.ok) return { status: "unknown" };
    const me = await response.json().catch(() => null);
    if (me && Number.isSafeInteger(me.id) && me.id > 0 && typeof me.username === "string") return { status: "authenticated", accountId: me.id };
    return { status: "unknown" };
  } catch {
    return { status: "unknown" };
  } finally {
    clearTimeout(timer);
  }
}

let stopPlayerSession: (() => void) | undefined;

export function renderClipPlayer(code: string) {
  mountLightweightBackButton();
  stopPlayerSession?.();
  const root = document.getElementById("root");
  if (!root) throw new Error("Clip root is missing");
  addStyles();
  // Start identity resolution immediately, but the video may render before it
  // settles; we await it right before mounting actions to avoid a save race.
  const identityPromise = resolveIdentity();
  let reloading = false;
  let verifiedAccount: number | null | undefined;
  let refreshFlight: Promise<void> | null = null;
  const reloadAccount = () => {
    if (reloading) return;
    reloading = true;
    loadController?.abort();
    calls.setAccount(null);
    root.querySelectorAll<HTMLMediaElement>("video,audio").forEach(media => media.pause());
    actions.replaceChildren();
    window.location.reload();
  };
  const acceptIdentity = (identity: Identity) => {
    if (identity.status === "unknown" || reloading) return;
    const id = identity.status === "authenticated" ? identity.accountId : null;
    if (verifiedAccount !== undefined && verifiedAccount !== id) {
      announceAccountChange(id);
      reloadAccount();
    } else verifiedAccount = id;
  };
  void identityPromise.then(acceptIdentity);
  const stopAccount = subscribeAccountChanges(reloadAccount);
  const stopWake = subscribeSessionWake(() => {
    if (refreshFlight || reloading) return;
    refreshFlight = resolveIdentity().then(acceptIdentity).finally(() => { refreshFlight = null; });
  });
  const onPageHide = (event: PageTransitionEvent) => { if (!event.persisted) stopPlayerSession?.(); };
  window.addEventListener("pagehide", onPageHide);
  stopPlayerSession = () => {
    reloading = true;
    loadController?.abort();
    calls.dispose();
    stopAccount();
    stopWake();
    window.removeEventListener("pagehide", onPageHide);
  };
  root.innerHTML = `
    <div class="direct-clip-shell" data-clip-fullscreen-shell data-testid="clip-player-shell">
      <header class="direct-topbar">
        <a class="direct-icon" href="${BASE}" aria-label="Retour à l’accueil">${reelsIcons.back()}</a>
        <h1>GDNA Arena</h1>
        <div class="direct-topbar-right">
          <a class="direct-icon" href="${BASE}clips?search=1" aria-label="Recherche">${reelsIcons.search()}</a>
          <a class="direct-icon" href="${BASE}clips?view=grid" aria-label="Menu">${reelsIcons.hamburger()}</a>
        </div>
      </header>
      <main dir="rtl">
       <a class="direct-close" href="${BASE}clips?view=grid" aria-label="Fermer le lecteur et afficher la grille">Retour</a>
      <section>
        <p id="player-code" dir="ltr">${code}</p>
        <h1 id="player-name">جارٍ تحميل الكليب…</h1>
        <div id="player-media"></div>
        <div id="player-actions"></div>
        <p id="player-status" class="muted" role="status" aria-live="polite"></p>
        <p id="player-error" class="error" role="alert" aria-live="assertive"></p>
        <button id="player-retry" type="button" hidden>إعادة المحاولة</button>
      </section>
      </main>
      <nav class="direct-bottomnav" aria-label="Navigation principale">
        <a class="direct-nav-item" href="${BASE}">${reelsIcons.navHome(false)}<span>Accueil</span></a>
        <a class="direct-nav-item" data-active="true" href="${BASE}clips">${reelsIcons.navReels(true)}<span>Clips</span></a>
        <a class="direct-nav-item" href="${BASE}clips?search=1">${reelsIcons.navSearch(false)}<span>Recherche</span></a>
        <a class="direct-nav-item" href="${BASE}login">${reelsIcons.navFriends(false)}<span>Profil</span></a>
      </nav>
    </div>`;
  const calls = createLightweightCallBoundary(root);
  void identityPromise.then(identity => {
    if (reloading) return;
    if (identity.status === "authenticated") calls.setAccount(identity.accountId);
    else if (identity.status === "anonymous") calls.setAccount(null);
  });

  const name = document.getElementById("player-name") as HTMLHeadingElement;
  const mediaRoot = document.getElementById("player-media") as HTMLDivElement;
  const status = document.getElementById("player-status") as HTMLParagraphElement;
  const actions = document.getElementById("player-actions") as HTMLDivElement;
  const error = document.getElementById("player-error") as HTMLParagraphElement;
  const retry = document.getElementById("player-retry") as HTMLButtonElement;
  const playerShell = document.querySelector<HTMLElement>("[data-clip-fullscreen-shell]")!;
  let loadController: AbortController | null = null;

  const load = async () => {
    loadController?.abort();
    const controller = new AbortController();
    loadController = controller;
    retry.hidden = true;
    error.textContent = "";
    mediaRoot.replaceChildren();
    actions.replaceChildren();
    let polls = 0;
    try {
      while (!controller.signal.aborted) {
        const timeout = window.setTimeout(
          () => controller.abort(new DOMException("Request timed out", "TimeoutError")),
          FETCH_TIMEOUT_MS,
        );
        let clip: ClipByCode;
        try {
          clip = await fetchClip(code, controller.signal);
        } finally {
          clearTimeout(timeout);
        }
        name.textContent = clip.name || clip.originalName || clip.code;
        if (clip.processingStatus === "failed") {
          throw new Error("فشل تجهيز الكليب. على صاحب الملف إعادة رفعه.");
        }
        if (clip.url) {
          const media = document.createElement(clip.contentType.startsWith("audio/") ? "audio" : "video");
          media.controls = true;
          media.loop = false;
          media.setAttribute("controlsList", "nofullscreen");
          media.preload = "metadata";
          if (media instanceof HTMLVideoElement) media.playsInline = true;
          media.src = clip.url;
          mediaRoot.replaceChildren(media);
          status.textContent = "التشغيل في الخلفية أو مع قفل الشاشة يعتمد على نظام الهاتف والمتصفح.";
          configureMediaSession(clip, media);
          // Wait for identity before mounting actions so device-only saves are
          // scoped correctly (or disabled when identity is unknown).
           const identity = await identityPromise;
           const engagement = await fetchEngagement(clip.id).catch(() => null);
           if (reloading || controller.signal.aborted || loadController !== controller) return;
          await mountVideoActions({
            host: actions,
            media,
            titleElement: name,
            clipId: clip.id,
            code: clip.code,
            accountId: identity.status === "authenticated" ? identity.accountId : null,
            saveDisabled: identity.status === "unknown",
            contentType: clip.contentType,
             fullscreenTarget: playerShell,
            initial: {
              id: clip.id,
              code: clip.code,
              title: clip.name,
              author: clip.author,
               isOwner: identity.status === "authenticated" && Boolean(engagement?.isOwner),
               liked: engagement?.liked ?? clip.liked,
               likeCount: engagement?.likeCount ?? clip.likeCount,
               commentCount: engagement?.commentCount ?? clip.commentCount,
               saved: engagement?.saved ?? clip.saved,
               saveCount: engagement?.saveCount ?? clip.saveCount,
               shareCount: engagement?.shareCount ?? clip.shareCount,
            } satisfies VideoActionState,
             onDeleted: () => {
               media.pause();
               media.removeAttribute("src");
               media.load();
               window.location.assign(`${BASE}clips?view=grid`);
             },
          });
          document.title = `${name.textContent} — HELIXLY`;
          return;
        }
        if (++polls >= MAX_AUTOMATIC_POLLS) {
          throw new Error("الكليب ما زال قيد التجهيز. أعد المحاولة بعد قليل.");
        }
        status.textContent = clip.processingStatus === "queued"
          ? "تم استلام الملف — في انتظار المعالجة. يمكنك المغادرة والعودة لاحقاً."
          : "جارٍ تجهيز الكليب على الخادم… يمكنك المغادرة والعودة لاحقاً.";
        await new Promise<void>((resolve, reject) => {
          const timer = window.setTimeout(resolve, POLL_DELAY_MS);
          controller.signal.addEventListener("abort", () => {
            clearTimeout(timer);
            reject(controller.signal.reason);
          }, { once: true });
        });
      }
    } catch (cause) {
      if (loadController !== controller || controller.signal.aborted &&
        controller.signal.reason?.name === "AbortError") return;
      status.textContent = "";
      error.textContent = cause instanceof Error ? cause.message : "تعذر فتح الكليب";
      retry.hidden = false;
    }
  };
  retry.addEventListener("click", () => void load());
  let touchStartY = 0;
  let touchIgnored = false;
  playerShell.addEventListener("touchstart", event => {
    if (event.touches.length !== 1) return;
    touchIgnored = Boolean((event.target as HTMLElement | null)?.closest(
      "input, textarea, select, button, a, .clip-comments, .clip-menu",
    ));
    touchStartY = event.touches[0].clientY;
  }, { passive: true });
  playerShell.addEventListener("touchend", event => {
    if (touchIgnored) return;
    const endY = event.changedTouches[0]?.clientY ?? touchStartY;
    if (endY - touchStartY > 72) {
      playerShell.querySelector<HTMLMediaElement>("video,audio")?.pause();
      window.location.assign(`${BASE}clips?view=grid`);
    }
  }, { passive: true });
  document.addEventListener("keydown", event => {
    if (event.key !== "Escape") return;
    if (playerShell.classList.contains("clip-css-fullscreen")) playerShell.classList.remove("clip-css-fullscreen");
    else if (document.fullscreenElement === playerShell) void document.exitFullscreen();
  });
  document.body.dataset.clipReady = "true";
  void load();
}