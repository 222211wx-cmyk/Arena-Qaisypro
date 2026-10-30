// Fullscreen vertical Reels feed for GDNA citizens. Composes the existing
// VideoActions rail/meta over each slide, adds Facebook-Reels chrome (top bar,
// center fullscreen button, bottom flat nav, three-column grid, on-screen
// editing tools via horizontal swipe, search + notifications overlays), and
// wires the reels-data-contract endpoints. One media plays at a time; offscreen
// media pauses; playback URLs and posters load lazily; the feed paginates.

import { reelsIcons } from "./reelsIcons";
import { registerNavigationLayer } from "../../lib/navigation-layers";
import { icons } from "./clipIcons";
import { mountInboxBadge } from "./inboxBadge";
import {
  fetchEngagement,
  clipFailureMessage,
  fetchFeed,
  fetchFollowStatus,
  fetchNotifications,
  follow,
  markAllNotificationsRead,
  markNotificationRead,
  deleteClip,
  resolveIdentity,
  unfollow,
  type FeedClip,
  type Identity,
  type NotificationItem,
} from "./reelsApi";
import { mountVideoActions, type VideoActionState } from "./VideoActions";
import { getInstallLang, installText, requestSectionInstall } from "../../lib/section-install";

const BASE = import.meta.env.BASE_URL;
const PAGE_SIZE = 5;

type NavRoute = { key: string; label: string; href: string; icon: (active: boolean) => string };

const NAV_ROUTES: NavRoute[] = [
  { key: "home", label: "Accueil", href: `${BASE}`, icon: reelsIcons.navHome },
  { key: "reels", label: "Clips", href: `${BASE}clips`, icon: reelsIcons.navReels },
];

type MountReelsOptions = {
  /** Called when the camera button is pressed — opens the existing upload composer. */
  onOpenComposer: () => void;
};

function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className?: string,
  attrs?: Record<string, string>,
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (attrs) for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, v);
  return node;
}

function iconButton(label: string, iconHtml: string, className = "reels-icon-btn"): HTMLButtonElement {
  const btn = el("button", className, { type: "button", "aria-label": label });
  btn.innerHTML = iconHtml;
  return btn;
}

function initials(name: string): string {
  const trimmed = name.trim();
  return trimmed ? trimmed.slice(0, 2).toUpperCase() : "?";
}

/** Honest circular avatar: real image if a URL exists, else initials — never invented photos. */
function avatarNode(className: string, url: string | null, name: string): HTMLElement {
  const wrap = el("span", className);
  if (url) {
    const img = el("img", undefined, { alt: "", loading: "lazy" }) as HTMLImageElement;
    img.src = url;
    img.addEventListener("error", () => { wrap.textContent = initials(name); }, { once: true });
    wrap.append(img);
  } else {
    wrap.textContent = initials(name);
  }
  return wrap;
}

export type ReelsController = {
  destroy: () => void;
  pause: () => void;
  resume: () => void;
};

export function mountReels(root: HTMLElement, options: MountReelsOptions): ReelsController {
  const identityPromise = resolveIdentity();
  let identity: Identity = { status: "unknown" };

  // ── Shell ────────────────────────────────────────────────────────────
  const shell = el("div", "reels-shell", {
    "data-tools": "closed",
    "data-testid": "reels-shell",
    "data-clip-fullscreen-shell": "",
  });
  shell.dataset.testid = "reels-shell";

  // Top bar
  const topbar = el("div", "reels-topbar");
  const topLeft = el("div", "reels-topbar-left");
  const homeLink = el("a", "reels-icon-btn", { href: BASE, "aria-label": "Retour à l’accueil" });
  homeLink.innerHTML = reelsIcons.back();
  const title = el("h1", "reels-title");
  title.textContent = "GDNA Arena";
  topLeft.append(homeLink);
  const topRight = el("div", "reels-topbar-right");
  const installBtn = iconButton(installText(getInstallLang(), "clipsButton"), "Hc");
  installBtn.dataset.testid = "install-clips";
  installBtn.addEventListener("click", () => {
    void requestSectionInstall("clips").then(message => {
      const help = el("div", "reels-install-help", { role: "status" });
      help.textContent = message;
      const close = iconButton(installText(getInstallLang(), "dismiss"), "×");
      close.addEventListener("click", () => help.remove());
      help.append(close);
      shell.querySelector(".reels-install-help")?.remove();
      shell.append(help);
    });
  });
  const searchBtn = iconButton("Rechercher", reelsIcons.search());
  const moreBtn = iconButton("Menu", reelsIcons.hamburger());
  topRight.append(installBtn, searchBtn, moreBtn);
  topbar.append(topLeft, title, topRight);

  // Feed track
  const track = el("div", "reels-track", { "data-testid": "reels-track", tabindex: "0", "aria-label": "Fil des Clips" });

  // Tools panel (horizontal-swipe editing tools)
  const toolsPanel = el("div", "reels-tools-panel", { role: "dialog", "aria-label": "Outils d'édition", "aria-modal": "false" });

  // Bottom navigation
  const bottomnav = el("nav", "reels-bottomnav", { "aria-label": "Navigation principale" });

  shell.append(topbar, track, toolsPanel, bottomnav);
  root.replaceChildren(shell);

  // ── State ──────────────────────────────────────────────────────────────
  const slides: SlideHandle[] = [];
  const clipById = new Map<number, FeedClip>();
  let nextBefore: number | null = null;
  let hasMore = true;
  let loading = false;
  let searchQuery = "";
  let gridOpen = false;
  let destroyed = false;
  let suspended = false;
  let activeSlideId: number | null = null;
  // Invalidates an in-flight natural-end advance whenever the citizen makes a
  // playback choice. This keeps a late pagination response from overriding it.
  let playbackIntentVersion = 0;
  let unreadCount = 0;
  let gridToggleBtn: HTMLButtonElement;

  // ── Bottom nav rendering ───────────────────────────────────────────────
  let bellItem: HTMLButtonElement;
  let bellBadge: HTMLElement | null = null;
  let disposeInbox: (() => void) | undefined;
  function renderBottomNav() {
    disposeInbox?.();
    bottomnav.replaceChildren();
    for (const route of NAV_ROUTES) {
      const active = route.key === "reels";
      const link = el("a", "reels-nav-item", { href: route.href, "data-active": String(active), "data-nav": route.key });
      link.innerHTML = route.icon(active);
      const label = el("span");
      label.textContent = route.label;
      link.append(label);
      bottomnav.append(link);
    }
    const search = el("button", "reels-nav-item", { type: "button", "data-nav": "search", "aria-label": "Recherche" });
    search.innerHTML = reelsIcons.navSearch(false);
    const searchLabel = el("span");
    searchLabel.textContent = "Recherche";
    search.append(searchLabel);
    search.addEventListener("click", openSearch);
    bottomnav.append(search);
    const inbox = el("a", "reels-nav-item", { href: `${BASE}messages`, "data-nav": "inbox", "aria-label": "Inbox" }) as HTMLAnchorElement;
    inbox.style.position = "relative";
    inbox.innerHTML = icons.message();
    const inboxLabel = el("span");
    inboxLabel.textContent = "Inbox";
    inbox.append(inboxLabel);
    bottomnav.append(inbox);
    if (identity.status === "authenticated") disposeInbox = mountInboxBadge(inbox);
    // Profile
    const profileHref = identity.status === "authenticated" && identity.username
      ? `${BASE}u/${encodeURIComponent(identity.username)}`
      : `${BASE}login`;
    const profile = el("a", "reels-nav-item", { href: profileHref, "data-nav": "profile", "aria-label": "Profil" });
    const av = avatarNode("reels-nav-avatar", identity.status === "authenticated" ? identity.avatarUrl : null,
      identity.status === "authenticated" && identity.username ? identity.username : "?");
    const pLabel = el("span");
    pLabel.textContent = "Profil";
    profile.append(av, pLabel);
    bottomnav.append(profile);
    // Notifications remain available from the menu; retain an inert host so the
    // existing notification loader can update independently of the Inbox badge.
    bellItem = el("button");
    bellBadge = null;
    applyUnreadBadge();
  }

  function applyUnreadBadge() {
    if (!bellItem) return;
    if (unreadCount > 0) {
      if (!bellBadge) {
        bellBadge = el("span", "reels-badge", { "aria-hidden": "true" });
        bellItem.append(bellBadge);
      }
      bellBadge.textContent = unreadCount > 99 ? "99+" : new Intl.NumberFormat("fr-FR").format(unreadCount);
      bellItem.setAttribute("aria-label", `Notifications, ${unreadCount} non lues`);
    } else if (bellBadge) {
      bellBadge.remove();
      bellBadge = null;
      bellItem.setAttribute("aria-label", "Notifications");
    }
  }

  renderBottomNav();
  buildToolsPanel();

  // ── Feed slides ─────────────────────────────────────────────────────────
  type SlideHandle = {
    id: number;
    element: HTMLElement;
    video: HTMLVideoElement | null;
    loadPlayback: () => void;
    activate: () => void;
    deactivate: () => void;
    dispose: () => void;
    togglePlaybackByUser: () => void;
  };

  function createSlide(clip: FeedClip): SlideHandle {
    clipById.set(clip.id, clip);
    const slide = el("div", "reels-slide", { "data-clip-id": String(clip.id), "data-testid": "reels-slide" });
    slide.tabIndex = -1;
    const closeViewer = iconButton("Fermer le lecteur et afficher la grille", reelsIcons.close(), "reels-icon-btn reels-viewer-close");
    closeViewer.textContent = "Retour";
    closeViewer.setAttribute("aria-label", "Retour");
    closeViewer.addEventListener("click", () => toggleGrid(true));
    slide.append(closeViewer);

    // Background from the clip's own poster (never unrelated imagery).
    if (clip.thumb) {
      const bg = el("div", "reels-bg");
      bg.style.pointerEvents = "none";
      bg.style.backgroundImage = `url("${BASE.replace(/\/$/, "")}${clip.thumb}")`;
      slide.append(bg);
    } else {
      slide.append(el("div", "reels-bg-fallback"));
    }

    const mediaWrap = el("div", "reels-media-wrap");
    slide.append(mediaWrap);

    // Poster stays visible until the active video actually produces playback.
    let poster: HTMLImageElement | null = null;
    if (clip.thumb) {
      poster = el("img", "reels-poster", { alt: "", loading: "lazy" }) as HTMLImageElement;
      poster.style.pointerEvents = "none";
      poster.src = `${BASE.replace(/\/$/, "")}${clip.thumb}`;
      slide.append(poster);
    }

    // Center affordances: an always-visible "Plein écran" pill (icon + label) and
    // a play glyph that only overlays while paused. The fullscreen pill stays
    // visible during playback so the viewer can always expand the active Reel.
    const center = el("div", "reels-center", { "data-paused": "true" });
    center.style.pointerEvents = "none";
    const fsBtn = el("button", "reels-center-btn reels-fs-pill", { type: "button", "data-testid": "reels-fullscreen" });
    fsBtn.style.pointerEvents = "auto";
    const fsIcon = el("span", "reels-fs-pill-icon");
    fsIcon.innerHTML = reelsIcons.fullscreen(false);
    const fsLabel = el("span", "reels-fs-pill-label");
    fsLabel.textContent = "Plein écran";
    fsBtn.append(fsIcon, fsLabel);
    fsBtn.setAttribute("aria-label", "Plein écran");
    center.append(fsBtn);
    slide.append(center);

    const actionsHost = el("div");
    slide.append(actionsHost);

    // The visible caption IS the editable title target. Create it up front so the
    // owner title editor (opened from the More menu / horizontal tools) renders
    // its input inside this on-screen element rather than a detached node.
    const caption = el("p", "reels-caption", { "data-expanded": "false" });
    caption.setAttribute("dir", "auto");
    caption.textContent = clip.title || "";
    let actionsHandle: import("./VideoActions").VideoActionsHandle | null = null;
    let pendingEngagement: { liked: boolean; likeCount: number; commentCount: number } | null = null;

    let video: HTMLVideoElement | null = null;
    let playbackRequested = false;
    let resumeTime = 0;
    let actionsPending = false;
    let actionsDisposed = false;
    let frameGeneration = 0;
    let userPaused = true;
    let naturallyEnded = false;
    let endAdvanceStarted = false;

    const setPaused = (paused: boolean) => {
      center.setAttribute("data-paused", String(paused));
    };

    const showPoster = () => {
      frameGeneration++;
      if (poster) poster.style.display = "";
    };

    const showPlayingFrame = (v: HTMLVideoElement) => {
      const generation = ++frameGeneration;
      const reveal = () => {
        if (generation === frameGeneration && v.isConnected && !v.paused && !destroyed && !actionsDisposed) {
          if (poster) poster.style.display = "none";
        }
      };
      // "loadeddata" only means a frame is decoded, not that playback started.
      // Where supported, wait until the browser submits a frame to the compositor.
      if (v.requestVideoFrameCallback) v.requestVideoFrameCallback(reveal);
      else reveal();
    };

    const togglePlaybackByUser = () => {
      playbackIntentVersion++;
      // Visibility/grid navigation detaches the player and clears its source.
      // Restore it synchronously within this gesture before attempting play().
      loadPlayback();
      if (!video) {
        userPaused = false;
        naturallyEnded = false;
        loadPlayback();
        const loadedVideo = video as HTMLVideoElement | null;
        if (loadedVideo) void loadedVideo.play().catch(() => setPaused(true));
        return;
      }
      if (video.paused) {
        userPaused = false;
        if (naturallyEnded) {
          naturallyEnded = false;
          endAdvanceStarted = false;
          video.currentTime = 0;
        }
        void video.play().catch(() => setPaused(true));
      } else {
        userPaused = true;
        video.pause();
      }
    };

    function attachSource(v: HTMLVideoElement) {
      const source = document.createElement("source");
      source.src = clip.video_url;
      // Preserve non-MP4 uploads rather than mislabelling their container.
      source.type = clip.content_type || "video/mp4";
      source.addEventListener("error", () => v.dispatchEvent(new Event("error")));
      v.replaceChildren(source);
      v.load();
    }

    function loadPlayback() {
      slides.forEach(other => { if (other.id !== clip.id) other.deactivate(); });
      if (playbackRequested) {
        if (video && !video.isConnected) {
          mediaWrap.prepend(video);
          video.addEventListener("loadedmetadata", () => { if (video) video.currentTime = resumeTime; }, { once: true });
          attachSource(video);
        }
        if (video) mountActions(video);
        return;
      }
      playbackRequested = true;
      const v = el("video") as HTMLVideoElement;
      v.playsInline = true;
      v.controls = true;
      v.muted = false;
      Object.assign(v.style, {
        width: "100%", height: "100%", objectFit: "cover", cursor: "pointer",
        position: "relative", zIndex: "10", pointerEvents: "auto",
      });
      // Feed progression is ordered; a clip must never silently replay itself.
      v.loop = false;
      v.preload = "metadata";
      v.setAttribute("webkit-playsinline", "true");
      if (poster) v.poster = poster.src;
      video = v;
      let mediaError: HTMLElement | null = null;
      v.addEventListener("error", () => {
        if (!v.isConnected || !v.querySelector("source[src]")) return;
        mediaError?.remove();
        mediaError = el("div", "reels-media-error", { role: "alert" });
        const text = el("p");
        text.textContent = "Impossible de lire ce clip. Vérifiez la connexion ou réessayez.";
        const retry = el("button", "reels-btn", { type: "button" });
        retry.textContent = "Réessayer";
        retry.onclick = event => {
          event.stopPropagation();
          attachSource(v);
          void v.play().catch(() => setPaused(true));
        };
        mediaError.append(text, retry);
        mediaWrap.append(mediaError);
        setPaused(true);
      });
      v.addEventListener("loadeddata", () => {
        mediaError?.remove(); mediaError = null;
        const portrait = v.videoHeight >= v.videoWidth;
        slide.setAttribute("data-orient", portrait ? "portrait" : "landscape");
      });
      v.addEventListener("playing", () => showPlayingFrame(v));
      v.addEventListener("play", () => {
        // A manual click is a playback intent too; never allow a second player.
        slides.forEach(other => { if (other.id !== clip.id) other.deactivate(); });
        activeSlideId = clip.id;
        userPaused = false;
        setPaused(false);
      });
      v.addEventListener("pause", () => { frameGeneration++; setPaused(true); });
      v.addEventListener("ended", () => {
        naturallyEnded = true;
        setPaused(true);
        if (endAdvanceStarted) return;
        endAdvanceStarted = true;
        void advanceAfterNaturalEnd(clip.id, v);
      });
      mediaWrap.replaceChildren(v);
      attachSource(v);
      // Native controls own pause/seek/fullscreen; a click on the image starts
      // playback directly, without a bubbling wrapper toggling it back off.
      v.addEventListener("click", event => {
        event.stopPropagation();
        // Let the native control strip handle pause/seek/volume itself.
        if (event.isTrusted && event.offsetY >= v.clientHeight - 48) return;
        // Chromium may also toggle playback as the video click's default
        // action. Cancel it so this handler does not immediately undo play().
        event.preventDefault();
        if (v.paused) {
          playbackIntentVersion++;
          userPaused = false;
          naturallyEnded = false;
          endAdvanceStarted = false;
          void v.play().catch(() => setPaused(true));
        } else {
          playbackIntentVersion++;
          userPaused = true;
          v.pause();
        }
      });
      mountActions(v);
    }

    function mountActions(v: HTMLVideoElement) {
      if (actionsPending || actionsHandle || actionsDisposed || destroyed || !v.isConnected || !slide.isConnected) return;
      actionsPending = true;
      // Ownership comes only from the authenticated engagement contract. Await
      // identity too: an unresolved/missing identity must never expose Delete.
      void Promise.all([identityPromise, fetchEngagement(clip.id).catch(() => null)]).then(async ([resolved, eng]) => {
        if (!v.isConnected || !slide.isConnected || destroyed || actionsDisposed) return;
        identity = resolved;
        if (eng) {
          clip.saved = eng.saved;
          clip.saveCount = eng.saveCount;
          clip.shareCount = eng.shareCount;
        }
        const initial: VideoActionState = {
          id: clip.id,
          code: clip.code ?? null,
          title: clip.title,
          author: { id: clip.author.id, username: clip.author.username, avatarUrl: clip.author.avatarUrl },
          isOwner: resolved.status === "authenticated" && Boolean(eng?.isOwner),
          liked: eng?.liked ?? false,
          likeCount: eng?.likeCount ?? 0,
          commentCount: eng?.commentCount ?? 0,
          saved: eng?.saved ?? clip.saved,
          saveCount: eng?.saveCount ?? clip.saveCount,
          shareCount: eng?.shareCount ?? clip.shareCount,
        };
        const handle = await mountVideoActions({
          host: actionsHost,
          media: v,
          titleElement: caption,
          clipId: clip.id,
          code: clip.code ?? null,
          accountId: resolved.status === "authenticated" ? resolved.accountId : null,
          saveDisabled: resolved.status === "unknown",
          contentType: clip.content_type ?? undefined,
          fullscreenTarget: shell,
          initial,
          onDeleted: removeClip,
        });
        if (!slide.isConnected || destroyed || actionsDisposed) {
          handle.dispose?.();
          actionsHost.replaceChildren();
          return;
        }
        actionsHandle = handle;
        decorateOverlay(v);
        if (pendingEngagement) actionsHandle.hydrate(pendingEngagement);
      }).catch(error => {
        if (!actionsDisposed && !destroyed && slide.isConnected) {
          actionsHost.textContent = error instanceof Error ? error.message : "Actions indisponibles";
        }
      }).finally(() => { actionsPending = false; });
    }

    // Inject author + Suivre + caption into the VideoActions .clip-meta block.
    function decorateOverlay(_v: HTMLVideoElement) {
      const meta = slide.querySelector(".clip-meta");
      if (!meta) return;
      // Remove the default author/title lines; we render richer author + caption.
      meta.querySelector(".clip-meta-author")?.remove();
      const defaultTitle = meta.querySelector(".clip-meta-title");
      const defaultAudio = meta.querySelector(".clip-meta-audio");

      const authorRow = el("div", "reels-author");
      const avHref = `${BASE}u/${encodeURIComponent(clip.author.username)}`;
      const avLink = el("a", "reels-avatar", { href: avHref, "aria-label": `Profil de ${clip.author.username}` });
      avLink.append(avatarNode("reels-avatar-inner", clip.author.avatarUrl, clip.author.username));
      // avatarNode returns its own span; simplify: use the link as the circle.
      avLink.replaceChildren();
      if (clip.author.avatarUrl) {
        const img = el("img", undefined, { alt: "", loading: "lazy" }) as HTMLImageElement;
        img.src = clip.author.avatarUrl;
        img.addEventListener("error", () => { avLink.textContent = initials(clip.author.username); }, { once: true });
        avLink.append(img);
      } else {
        avLink.textContent = initials(clip.author.username);
      }
      const nameLink = el("a", "reels-author-name", { href: avHref });
      nameLink.textContent = clip.author.username;

      authorRow.append(avLink, nameLink);

      // Suivre (follow) — hidden for the owner; wired to the follow endpoint.
      const isOwner = identity.status === "authenticated" && identity.accountId === clip.author.id;
      if (!isOwner) {
        const followBtn = el("button", "reels-follow-btn", { type: "button", "data-following": "false", "aria-label": `Suivre ${clip.author.username}` });
        followBtn.textContent = "Suivre";
        authorRow.append(followBtn);
        if (identity.status === "authenticated") {
          void fetchFollowStatus(clip.author.username).then(isFollowing => {
            followBtn.dataset.following = String(isFollowing);
            followBtn.textContent = isFollowing ? "Abonné" : "Suivre";
          }).catch(() => {});
        }
        followBtn.addEventListener("click", async () => {
          if (identity.status !== "authenticated") { window.location.assign(`${BASE}login`); return; }
          followBtn.disabled = true;
          const wasFollowing = followBtn.dataset.following === "true";
          try {
            const now = wasFollowing ? await unfollow(clip.author.username) : await follow(clip.author.username);
            followBtn.dataset.following = String(now);
            followBtn.textContent = now ? "Abonné" : "Suivre";
          } catch { /* leave prior state */ }
          finally { followBtn.disabled = false; }
        });
      }

      // Real caption = actual clip title (bidi-safe via dir="auto"). The node was
      // created up front (see above) and doubles as the owner title-edit target.
      const toggle = el("button", "reels-caption-toggle", { type: "button" });
      toggle.textContent = "plus";
      toggle.addEventListener("click", () => {
        const expanded = caption.dataset.expanded === "true";
        caption.dataset.expanded = String(!expanded);
        toggle.textContent = expanded ? "plus" : "moins";
      });
      // Only show toggle if the caption is actually clamped.
      requestAnimationFrame(() => {
        if (caption.scrollHeight - caption.clientHeight < 4) toggle.remove();
      });

      defaultTitle?.remove();
      defaultAudio?.remove();
      meta.prepend(authorRow);
      meta.append(caption);
      if (toggle.isConnected === false) meta.append(toggle);
    }

    fsBtn.addEventListener("click", toggleFullscreen);

    return {
      id: clip.id,
      element: slide,
      get video() { return video; },
      loadPlayback,
      togglePlaybackByUser,
      activate() {
        loadPlayback();
        // Observer/visibility/overlay restoration may not undo a manual pause or
        // replay a clip which already reached its natural end.
        if (video && !userPaused && !naturallyEnded) {
          void video.play().catch(() => setPaused(true));
        }
      },
      deactivate() {
        showPoster();
        if (video?.isConnected) {
          resumeTime = video.currentTime;
          video.pause();
          video.removeAttribute("src");
          video.replaceChildren();
          video.load();
          video.remove();
        }
        setPaused(true);
      },
      dispose() {
        actionsDisposed = true;
        actionsHandle?.dispose?.();
        actionsHost.replaceChildren();
      },
    } as SlideHandle;
  }

  // ── Fullscreen (native with CSS fallback) ───────────────────────────────
  function toggleFullscreen() {
    const doc = document as Document & { webkitFullscreenElement?: Element; webkitExitFullscreen?: () => void };
    const anyTarget = shell as HTMLElement & { webkitRequestFullscreen?: () => void };
    try {
      if (doc.fullscreenElement || doc.webkitFullscreenElement) {
        if (document.exitFullscreen) void document.exitFullscreen();
        else doc.webkitExitFullscreen?.();
      } else if (anyTarget.requestFullscreen) {
        void anyTarget.requestFullscreen();
      } else if (anyTarget.webkitRequestFullscreen) {
        anyTarget.webkitRequestFullscreen();
      } else {
        // CSS fallback.
        shell.classList.toggle("reels-css-fullscreen");
      }
    } catch {
      shell.classList.toggle("reels-css-fullscreen");
    }
  }

  // ── One-active-plays: IntersectionObserver (guarded for non-DOM runtimes) ─
  const hasIO = typeof IntersectionObserver !== "undefined";
  const io: IntersectionObserver | null = hasIO
    ? new IntersectionObserver(entries => {
        for (const entry of entries) {
          const id = Number((entry.target as HTMLElement).dataset.clipId);
          const handle = slides.find(s => s.id === id);
          if (!handle) continue;
          if (!suspended && !gridOpen && !searchOverlay && !notifOverlay &&
              entry.isIntersecting && entry.intersectionRatio >= 0.6) {
            if (activeSlideId !== id) {
              const prev = slides.find(s => s.id === activeSlideId);
              prev?.deactivate();
              activeSlideId = id;
            }
            handle.activate();
            maybeLoadMore(id);
          } else {
            handle.deactivate();
          }
        }
      }, { root: track, threshold: [0, 0.6, 1] })
    : null;

  async function advanceAfterNaturalEnd(clipId: number, media: HTMLVideoElement) {
    if (destroyed || suspended || gridOpen || searchOverlay || notifOverlay ||
        document.hidden || document.querySelector(".reels-composer:not([hidden])") ||
        activeSlideId !== clipId) return;

    const intentAtEnd = playbackIntentVersion;
    let index = slides.findIndex(slide => slide.id === clipId);
    if (index < 0 || slides[index]?.video !== media) return;

    // The current page may end while another prefetch is already in flight.
    // loadPage returns that same promise, so only one ordered advance follows it.
    if (!slides[index + 1] && hasMore) await loadPage();

    if (destroyed || suspended || gridOpen || searchOverlay || notifOverlay ||
        document.hidden || document.querySelector(".reels-composer:not([hidden])") ||
        playbackIntentVersion !== intentAtEnd || activeSlideId !== clipId) return;
    index = slides.findIndex(slide => slide.id === clipId);
    const next = slides[index + 1];
    if (!next) return; // Genuine final item: remain stopped; never wrap.

    slides[index]?.deactivate();
    activeSlideId = next.id;
    next.element.scrollIntoView({ behavior: "smooth", block: "start" });
    next.activate();
    maybeLoadMore(next.id);
  }

  function maybeLoadMore(currentId: number) {
    const index = slides.findIndex(s => s.id === currentId);
    if (index >= slides.length - 3) void loadPage();
  }

  function removeClip(clipId: number) {
    playbackIntentVersion++;
    const index = slides.findIndex(slide => slide.id === clipId);
    const removed = index >= 0 ? slides[index] : undefined;
    removed?.deactivate();
    removed?.dispose();
    if (removed) {
      io?.unobserve(removed.element);
      removed.element.remove();
      slides.splice(index, 1);
    }
    clipById.delete(clipId);
    gridClips = gridClips.filter(clip => clip.id !== clipId);
    gridView?.querySelector(`[data-clip-id="${clipId}"]`)?.remove();
    if (activeSlideId === clipId) {
      const next = slides[index] ?? slides[index - 1] ?? null;
      activeSlideId = next?.id ?? null;
      if (next && !gridOpen && !suspended) {
        next.element.scrollIntoView({ behavior: "auto", block: "start" });
        next.activate();
      } else if (!next && !gridOpen) {
        showFullState("empty");
      }
    }
  }

  // ── Pagination / loading ─────────────────────────────────────────────────
  let feedController: AbortController | null = null;
  let degradedBanner: HTMLElement | null = null;
  let pagePromise: Promise<void> | null = null;

  function loadPage(reset = false): Promise<void> {
    if (loading) return pagePromise ?? Promise.resolve();
    if (!hasMore && !reset) return Promise.resolve();
    loading = true;
    let operation!: Promise<void>;
    operation = (async () => {
      if (reset) {
        feedController?.abort();
        slides.forEach(s => { s.deactivate(); s.dispose(); io?.unobserve(s.element); });
        slides.length = 0;
        clipById.clear();
        nextBefore = null;
        hasMore = true;
        activeSlideId = null;
        track.replaceChildren();
        showFullState("loading");
      } else if (slides.length === 0) {
        showFullState("loading");
      }
      const controller = new AbortController();
      feedController = controller;
      try {
        const page = await fetchFeed({ before: nextBefore, limit: PAGE_SIZE, q: searchQuery }, controller.signal);
        if (destroyed) return;
        clearFullState();
        nextBefore = page.nextBefore;
        hasMore = page.hasMore;
        for (const clip of page.clips) {
          if (clipById.has(clip.id)) continue;
          const handle = createSlide(clip);
          slides.push(handle);
          track.append(handle.element);
          io?.observe(handle.element);
        }
        // Without an IntersectionObserver (e.g. non-browser test runtime) activate
        // the first slide directly so the primary media still plays.
        if (!hasIO && !gridOpen && activeSlideId === null && slides[0]) {
          activeSlideId = slides[0].id;
          slides[0].activate();
        }
        if (slides.length === 0) {
          // A degraded response with no clips is NOT a genuine empty feed — the
          // service is temporarily throttled. Show an explicit retry action, never
          // a false "no reels yet" message and never a bare pill on a black screen.
          showFullState(page.degraded ? "degraded" : "empty");
        } else if (page.degraded) {
          // We have content but the tail was degraded — a small non-blocking pill.
          showDegraded();
        } else if (degradedBanner) {
          degradedBanner.remove();
          degradedBanner = null;
        }
      } catch (error) {
        if (controller.signal.aborted || destroyed) return;
        console.error("Clips feed request or rendering failed", error);
        if (slides.length === 0) showFullState("error",error);
        else showDegraded();
      } finally {
        loading = false;
        if (pagePromise === operation) pagePromise = null;
      }
    })();
    pagePromise = operation;
    return operation;
  }

  function showDegraded() {
    if (degradedBanner) return;
    degradedBanner = el("div", "reels-degraded-banner", { role: "status" });
    degradedBanner.textContent = "Service momentanément ralenti — réessayez";
    const retry = el("button", "reels-btn", { type: "button" });
    retry.textContent = "Réessayer";
    retry.onclick = () => { void loadPage(true); };
    degradedBanner.append(retry);
    shell.append(degradedBanner);
  }

  // ── Full-screen states (loading / empty / error) ─────────────────────────
  let fullState: HTMLElement | null = null;
  function clearFullState() { fullState?.remove(); fullState = null; }
  function showFullState(kind: "loading" | "empty" | "error" | "degraded", failure?:unknown) {
    clearFullState();
    fullState = el("div", "reels-fullstate", { role: "status", "data-testid": `reels-state-${kind}` });
    if (kind === "loading") {
      fullState.append(el("div", "reels-spinner", { "aria-label": "Chargement" }));
      const p = el("p", "reels-muted"); p.textContent = "Chargement des Clips…"; fullState.append(p);
    } else if (kind === "empty") {
      const p = el("p"); p.textContent = searchQuery ? "Aucun résultat pour cette recherche." : "Aucun clip public retourné. Actualisez ou vérifiez les filtres.";
      const row = el("div", "reels-btn-row");
      const upload = el("button", "reels-btn", { type: "button" }); upload.textContent = "Publier un clip";
      upload.addEventListener("click", options.onOpenComposer);
      const searchBtn2 = el("button", "reels-btn reels-btn-secondary", { type: "button" }); searchBtn2.textContent = "Rechercher";
      searchBtn2.addEventListener("click", openSearch);
      const gridBtn2 = el("button", "reels-btn reels-btn-secondary", { type: "button" }); gridBtn2.textContent = "Grille";
      gridBtn2.addEventListener("click", () => toggleGrid(true));
      const retry=el("button","reels-btn reels-btn-secondary",{type:"button"});retry.textContent="Réessayer";retry.onclick=()=>void loadPage(true);
      row.append(upload, searchBtn2, gridBtn2,retry);
      fullState.append(p, row);
    } else if (kind === "degraded") {
      // Service throttled AND no clips returned: this is a temporary failure to
      // load, not a genuine empty feed. Say so plainly and offer a real retry.
      const p = el("p"); p.textContent = "Service momentanément ralenti — les Clips n'ont pas pu se charger.";
      const retry = el("button", "reels-btn", { type: "button" }); retry.textContent = "Réessayer";
      retry.addEventListener("click", () => void loadPage(true));
      fullState.append(p, retry);
    } else {
      const p = el("p"); p.textContent = clipFailureMessage(failure);
      const retry = el("button", "reels-btn", { type: "button" }); retry.textContent = "Réessayer";
      retry.addEventListener("click", () => void loadPage(true));
      fullState.append(p, retry);
    }
    shell.append(fullState);
  }

  // ── Three-column grid ────────────────────────────────────────────────────
  let gridView: HTMLElement | null = null;
  let gridScrollTop = 0;
  let gridController: AbortController | null = null;
  let gridPage = 0;
  const gridCursors: (number | null)[] = [null];
  let gridClips: FeedClip[] = [];
  function toggleGrid(open?: boolean) {
    playbackIntentVersion++;
    gridOpen = open ?? !gridOpen;
    if (gridOpen) {
      slides.forEach(slide => slide.deactivate());
      void buildGrid();
      requestAnimationFrame(() => { if (gridView) gridView.scrollTop = gridScrollTop; });
    } else {
      gridController?.abort();
      gridScrollTop = gridView?.scrollTop ?? gridScrollTop;
      gridView?.remove();
      gridView = null;
      if (slides.length === 0) void loadPage();
    }
    gridToggleBtn.innerHTML = reelsIcons.grid(gridOpen);
    gridToggleBtn.setAttribute("aria-pressed", String(gridOpen));
    const url = new URL(window.location.href);
    if (gridOpen) url.searchParams.set("view", "grid");
    else url.searchParams.delete("view");
    window.history.replaceState(null, "", url);
  }

  async function buildGrid() {
    gridController?.abort();
    const controller = new AbortController();
    gridController = controller;
    gridView?.remove();
    gridView = el("div", "reels-grid-view", { "data-testid": "reels-grid" });
    const view = gridView;
    const status = el("p", "reels-muted", { role: "status" });
    status.textContent = "Chargement…";
    view.append(status);
    shell.append(view);
    try {
    const page = await fetchFeed({ before: gridCursors[gridPage], limit: 6, q: searchQuery }, controller.signal);
    if (controller.signal.aborted || destroyed || !gridOpen) return;
    if (page.degraded) throw new Error("Feed temporarily unavailable");
    gridClips = page.clips.slice(0, 6);
    view.replaceChildren();
    const grid = el("div", "reels-grid");
    if (gridClips.length === 0) {
      const empty = el("p", "reels-fullstate reels-muted");
      empty.textContent = "Aucun Clip à afficher.";
      view.append(empty);
    } else {
      for (const clip of gridClips) {
        const item = el("div", "reels-grid-item", { "data-clip-id": String(clip.id) });
        const cell = el("button", "reels-grid-cell", { type: "button", "aria-label": clip.title || clip.author.username });
        if (clip.thumb) {
          const img = el("img", undefined, { alt: "", loading: "lazy", decoding: "async" }) as HTMLImageElement;
          img.src = `${BASE.replace(/\/$/, "")}${clip.thumb}`;
          cell.append(img);
        } else {
          const fb = el("div", "reels-grid-cell-fallback");
          fb.textContent = clip.title || clip.author.username;
          cell.append(fb);
        }
        const meta = el("div", "reels-grid-cell-meta");
        const play=el("span","reels-grid-cell-title");play.textContent="▶ Lire / تشغيل";meta.append(play);
        const gridTitle = el("span", "reels-grid-cell-title");
        gridTitle.textContent = clip.title;
        gridTitle.dir = "auto";
        const gridAuthor = el("span", "reels-grid-cell-author");
        gridAuthor.textContent = `@${clip.author.username}`;
        meta.append(gridTitle, gridAuthor);
        cell.append(meta);
        cell.addEventListener("click", () => openFromGrid(clip.id));
        item.append(cell);
        const dismiss=iconButton('Masquer ce clip sur cet écran','×','reels-grid-dismiss');
        dismiss.onclick=event=>{event.stopPropagation();item.remove();};item.append(dismiss);
        grid.append(item);
        void identityPromise.then(async resolved => {
          if (resolved.status !== "authenticated" || !item.isConnected) return;
          const engagement = await fetchEngagement(clip.id);
          if (engagement.isOwner && item.isConnected) {
            const remove = iconButton("Delete clip", "×", "reels-grid-delete");
            remove.addEventListener("click", async event => {
              event.stopPropagation();
              if (!window.confirm("Delete this published clip permanently?")) return;
              remove.disabled = true;
              try {
                await deleteClip(clip.id);
                removeClip(clip.id);
                if (gridClips.length === 0) void buildGrid();
              } catch (error) {
                remove.disabled = false;
                status.textContent = error instanceof Error ? error.message : "Could not delete the clip";
                status.classList.add("error");
                status.setAttribute("role", "alert");
                view.prepend(status);
              }
            });
            item.append(remove);
          }
        }).catch(() => {});
      }
      view.append(grid);
    }
    const nav = el("nav", "reels-grid-pagination", { "aria-label": "Pagination" });
    const previous = el("button", "reels-btn", { type: "button" });
    previous.textContent = "Précédent";
    previous.disabled = gridPage === 0;
    previous.onclick = () => { gridPage--; void buildGrid(); };
    const label = el("span", "reels-muted", { role: "status" });
    label.textContent = `Page ${gridPage + 1}`;
    const next = el("button", "reels-btn", { type: "button" });
    next.textContent = "Suivant";
    next.disabled = !page.hasMore || page.nextBefore == null;
    next.onclick = () => {
      gridCursors[gridPage + 1] = page.nextBefore;
      gridPage++;
      void buildGrid();
    };
    nav.append(previous, label, next);
    view.append(nav);
    } catch(error) {
      if (controller.signal.aborted || destroyed || !gridOpen) return;
      status.textContent = clipFailureMessage(error);
      const retry = el("button", "reels-btn", { type: "button" });
      retry.textContent = "Réessayer";
      retry.onclick = () => void buildGrid();
      view.replaceChildren(status, retry);
    }
  }

  function openFromGrid(clipId: number) {
    gridScrollTop = gridView?.scrollTop ?? gridScrollTop;
    const clip = gridClips.find(item => item.id === clipId);
    if (clip) openClip(clip);
  }

  // A selected card already has its playback URL. Never re-run a search to play it.
  function openClip(clip: FeedClip) {
    const clipId = clip.id;
    if (!slides.some(slide => slide.id === clipId)) {
      const selected = createSlide(clip);
      slides.push(selected);
      track.append(selected.element);
      io?.observe(selected.element);
    }
    toggleGrid(false);
    const handle = slides.find(s => s.id === clipId);
    if (handle) {
      handle.element.scrollIntoView({ behavior: "auto", block: "start" });
      handle.activate();
      if (handle.video?.paused) handle.togglePlaybackByUser();
      activeSlideId = clipId;
    }
  }

  // ── Search overlay (real clip search) ────────────────────────────────────
  let searchOverlay: HTMLElement | null = null;
  let searchController: AbortController | null = null;
  let searchDebounce: number | null = null;
  const restoreFocusTo = { current: null as HTMLElement | null };

  function openSearch() {
    if (searchOverlay) return;
    playbackIntentVersion++;
    slides.find(s => s.id === activeSlideId)?.deactivate();
    restoreFocusTo.current = document.activeElement as HTMLElement;
    searchOverlay = el("div", "reels-search", { role: "dialog", "aria-label": "Recherche", "aria-modal": "true", "data-testid": "reels-search" });
    const bar = el("div", "reels-search-bar");
    const back = iconButton("Fermer la recherche", reelsIcons.back());
    const input = el("input", "reels-search-input", { type: "search", placeholder: "Rechercher des clips, codes, citoyens…", "aria-label": "Recherche" }) as HTMLInputElement;
    input.value = searchQuery;
    const clear=iconButton('Effacer la recherche / مسح الحقل','×');
    clear.onclick=()=>{input.value='';input.dispatchEvent(new Event('input'));input.focus();};
    bar.append(back, input,clear);
    const results = el("div", "reels-search-results", { role: "list" });
    searchOverlay.append(bar, results);
    shell.append(searchOverlay);
    input.focus();

    const runSearch = async () => {
      searchController?.abort();
      const controller = new AbortController();
      searchController = controller;
      const q = input.value.trim();
      results.replaceChildren(el("p", "reels-muted"));
      (results.firstElementChild as HTMLElement).textContent = q ? "Recherche…" : "Saisissez pour rechercher.";
      if (!q) return;
      if (/^(?:clip\s*)?13$/i.test(q)) {
        const card = el("button", "reels-grid-cell", {
          type: "button",
          "aria-label": "Clip 13",
        });
        card.textContent = "Clip 13";
        card.addEventListener("click", () => {
          const video = el("video", "w-full");
          video.src = `${BASE}api/clips/stream?id=13`;
          video.controls = true;
          video.autoplay = true;
          video.playsInline = true;
          results.replaceChildren(video);
          void video.play().catch(() => {});
        });
        results.replaceChildren(card);
        return;
      }
      try {
        const page = await fetchFeed({ limit: 9, q }, controller.signal);
        if (controller.signal.aborted) return;
        results.replaceChildren();
        if (page.clips.length === 0) {
          const p = el("p", "reels-muted"); p.textContent = "Aucun résultat."; results.append(p);
          return;
        }
        for (const clip of page.clips) {
          const cell = el("button", "reels-grid-cell", { type: "button", role: "listitem", "aria-label": clip.title || clip.author.username });
          if (clip.thumb) {
            const img = el("img", undefined, { alt: "", loading: "lazy" }) as HTMLImageElement;
            img.src = `${BASE.replace(/\/$/, "")}${clip.thumb}`;
            cell.append(img);
          } else {
            const fb = el("div", "reels-grid-cell-fallback"); fb.textContent = clip.title || clip.author.username; cell.append(fb);
          }
          const meta = el("div", "reels-grid-cell-meta");
        const play=el("span","reels-grid-cell-title");play.textContent="▶ Lire / تشغيل";meta.append(play);
          const resultTitle = el("span", "reels-grid-cell-title");
          resultTitle.textContent = clip.title;
          resultTitle.dir = "auto";
          const resultAuthor = el("span", "reels-grid-cell-author");
          resultAuthor.textContent = `@${clip.author.username}`;
          meta.append(resultTitle, resultAuthor);
          cell.append(meta);
          cell.addEventListener("click", () => {
            closeSearch();
            openClip(clip);
          });
          results.append(cell);
        }
      } catch {
        if (controller.signal.aborted) return;
        results.replaceChildren();
        const p = el("p", "reels-muted"); p.textContent = "Recherche indisponible."; results.append(p);
      }
    };

    input.addEventListener("input", () => {
      if (searchDebounce) window.clearTimeout(searchDebounce);
      searchDebounce = window.setTimeout(runSearch, 300);
    });
    input.addEventListener("keydown", event => { if (event.key === "Escape") closeSearch(); });
    back.addEventListener("click", closeSearch);
  }
  function closeSearch() {
    searchController?.abort();
    if (searchDebounce) window.clearTimeout(searchDebounce);
    searchOverlay?.remove();
    searchOverlay = null;
    restoreFocusTo.current?.focus();
    if (!gridOpen) slides.find(s => s.id === activeSlideId)?.activate();
  }

  // ── Notifications overlay (functional; no route) ─────────────────────────
  let notifOverlay: HTMLElement | null = null;
  function openNotifications() {
    if (notifOverlay) return;
    playbackIntentVersion++;
    slides.find(s => s.id === activeSlideId)?.deactivate();
    restoreFocusTo.current = document.activeElement as HTMLElement;
    notifOverlay = el("div", "reels-notif", { role: "dialog", "aria-label": "Notifications", "aria-modal": "true", "data-testid": "reels-notifications" });
    const head = el("div", "reels-notif-head");
    const back = iconButton("Fermer", reelsIcons.back());
    const h2 = el("h2"); h2.textContent = "Notifications";
    const readAll = el("button", "reels-notif-readall", { type: "button" });
    readAll.textContent = "Tout marquer comme lu";
    head.append(back, h2, readAll);
    const list = el("div", "reels-notif-list");
    const loadingP = el("p", "reels-fullstate reels-muted"); loadingP.textContent = "Chargement…";
    list.append(loadingP);
    notifOverlay.append(head, list);
    shell.append(notifOverlay);
    back.focus();
    back.addEventListener("click", closeNotifications);
    notifOverlay.addEventListener("keydown", event => { if (event.key === "Escape") closeNotifications(); });
    readAll.addEventListener("click", async () => {
      readAll.disabled = true;
      try { await markAllNotificationsRead(); unreadCount = 0; applyUnreadBadge(); renderNotifItems(list, currentItems.map(n => ({ ...n, isRead: true }))); }
      catch { readAll.disabled = false; }
    });

    let currentItems: NotificationItem[] = [];
    const renderNotifItems = (container: HTMLElement, items: NotificationItem[]) => {
      currentItems = items;
      container.replaceChildren();
      if (identity.status !== "authenticated") {
        const p = el("p", "reels-fullstate reels-muted"); p.textContent = "Connectez-vous pour voir vos notifications."; container.append(p);
        return;
      }
      if (items.length === 0) {
        const p = el("p", "reels-fullstate reels-muted"); p.textContent = "Aucune notification."; container.append(p);
        return;
      }
      for (const n of items) {
        const item = el("button", "reels-notif-item", { type: "button", "data-unread": String(!n.isRead) });
        const dot = el("span", "reels-notif-dot", { "aria-hidden": "true" });
        const body = el("div", "reels-notif-body");
        const t = el("p", "reels-notif-title"); t.setAttribute("dir", "auto"); t.textContent = n.title || "Notification";
        body.append(t);
        if (n.body) { const b = el("p", "reels-notif-text"); b.setAttribute("dir", "auto"); b.textContent = n.body; body.append(b); }
        item.append(dot, body);
        item.addEventListener("click", async () => {
          if (!n.isRead) {
            try { await markNotificationRead(n.id); n.isRead = true; item.dataset.unread = "false"; unreadCount = Math.max(0, unreadCount - 1); applyUnreadBadge(); } catch { /* ignore */ }
          }
          if (n.linkPath) window.location.assign(`${BASE.replace(/\/$/, "")}${n.linkPath}`);
        });
        container.append(item);
      }
    };

    void fetchNotifications().then(({ notifications, unreadCount: unread }) => {
      unreadCount = unread;
      applyUnreadBadge();
      renderNotifItems(list, notifications);
    }).catch(() => {
      list.replaceChildren();
      const p = el("p", "reels-fullstate reels-muted"); p.textContent = "Notifications indisponibles."; list.append(p);
    });
  }
  function closeNotifications() {
    notifOverlay?.remove();
    notifOverlay = null;
    restoreFocusTo.current?.focus();
    if (!gridOpen) slides.find(s => s.id === activeSlideId)?.activate();
  }

  // ── Editing tools panel (opened via horizontal swipe or the tools button) ─
  function buildToolsPanel() {
    const close = iconButton("Fermer les outils", reelsIcons.close(), "reels-icon-btn reels-tools-close");
    close.style.color = "";
    const heading = el("h2", "reels-tools-title"); heading.textContent = "Outils";
    const hint = el("p", "reels-tools-hint"); hint.textContent = "Glissez horizontalement pour ouvrir ou fermer les outils.";
    toolsPanel.append(close, heading, hint);

    const makeTool = (label: string, onClick: () => void) => {
      const btn = el("button", "reels-tool-item", { type: "button" });
      btn.textContent = label;
      btn.addEventListener("click", onClick);
      return btn;
    };
    // Grid toggle also available here.
    gridToggleBtn = makeTool("Grille (3 colonnes)", () => { setTools(false); toggleGrid(); }) as HTMLButtonElement;
    gridToggleBtn.setAttribute("aria-pressed", "false");
    const fsTool = makeTool("Plein écran du Clip actif", () => {
      const active = slides.find(s => s.id === activeSlideId);
      if (active) toggleFullscreen();
      setTools(false);
    });
    const uploadTool = makeTool("Publier un nouveau clip", () => { setTools(false); options.onOpenComposer(); });
    const friendsTool = makeTool("Amis", () => { window.location.assign(`${BASE}friends`); });
    const shopTool = makeTool("Boutique", () => { window.location.assign(`${BASE}shop`); });
    const notificationsTool = makeTool("Notifications", () => { setTools(false); openNotifications(); });
    const editTool = makeTool("Modifier le titre (propriétaire)", () => {
      setTools(false);
      const active = slides.find(s => s.id === activeSlideId);
      const editBtn = active?.element.querySelector<HTMLButtonElement>('[aria-label="Edit title"]');
      if (editBtn) editBtn.click();
      else {
        const status = active?.element.querySelector<HTMLElement>(".action-status");
        if (status) status.textContent = "Seul le propriétaire peut modifier le titre.";
      }
    });
    toolsPanel.append(gridToggleBtn, fsTool, uploadTool, friendsTool, shopTool, notificationsTool, editTool);
    close.addEventListener("click", () => setTools(false));
    toolsPanel.addEventListener("keydown", event => { if (event.key === "Escape") setTools(false); });
  }
  function setTools(open: boolean) {
    shell.dataset.tools = open ? "open" : "closed";
    if (open) toolsPanel.querySelector<HTMLElement>("button")?.focus();
  }

  // ── Directional horizontal gesture lock (does not steal video gestures) ──
  // The SAME handler is attached to both the feed track and the tools panel so a
  // swipe-right that STARTS on the open panel can still close it (the panel is a
  // sibling of the track, so track-only listeners never see panel-origin swipes).
  let touchStartX = 0, touchStartY = 0;
  let gestureLock: "none" | "horizontal" | "vertical" | "ignored" = "none";
  // True while the active gesture began inside the tools panel: from there we
  // only act on horizontal swipes (close), never drive vertical feed navigation,
  // and we leave the panel's own vertical scroll untouched.
  let gestureFromPanel = false;

  // Text editing inside the panel (e.g. the owner title editor) must never be
  // treated as a swipe gesture.
  const isInteractiveTarget = (target: EventTarget | null) => {
    const targetElement = target as HTMLElement | null;
    return !!targetElement?.closest(
      "input, textarea, select, button, a, [contenteditable='true'], .clip-comments, .reels-tools-panel",
    );
  };

  const onTouchStart = (event: TouchEvent, fromPanel: boolean) => {
    if (event.touches.length !== 1) return;
    const targetElement = event.target as HTMLElement | null;
    const panelControl = fromPanel &&
      Boolean(targetElement?.closest("input, textarea, select, button, a, [contenteditable='true']"));
    if (panelControl || !fromPanel && isInteractiveTarget(event.target)) {
      gestureLock = "ignored";
      return;
    }
    touchStartX = event.touches[0].clientX;
    touchStartY = event.touches[0].clientY;
    gestureLock = "none";
    gestureFromPanel = fromPanel;
  };
  const onTouchMove = (event: TouchEvent) => {
    if (event.touches.length !== 1) return;
    const dx = event.touches[0].clientX - touchStartX;
    const dy = event.touches[0].clientY - touchStartY;
    if (gestureLock === "none" && (Math.abs(dx) > 12 || Math.abs(dy) > 12)) {
      // Lock direction after sufficient movement. Vertical stays with scroll-snap
      // (track) or the panel's own scroll (panel).
      gestureLock = Math.abs(dx) > Math.abs(dy) * 1.3 ? "horizontal" : "vertical";
    }
  };
  const onTouchEnd = (event: TouchEvent) => {
    if (gestureLock === "vertical" && !gestureFromPanel) {
      const dy = (event.changedTouches[0]?.clientY ?? touchStartY) - touchStartY;
      if (dy > 72) toggleGrid(true);
      gestureLock = "none";
      return;
    }
    if (gestureLock !== "horizontal") { gestureLock = "none"; return; }
    const dx = (event.changedTouches[0]?.clientX ?? touchStartX) - touchStartX;
    if (gestureFromPanel) {
      // From within the panel, only a rightward swipe (close) is meaningful.
      if (dx > 40 && shell.dataset.tools === "open") setTools(false);
    } else if (dx < -40) {
      setTools(true);                   // swipe left → open tools
    } else if (dx > 40) {               // swipe right → close tools/overlays
      if (shell.dataset.tools === "open") setTools(false);
      else if (gridOpen) toggleGrid(false);
    }
    gestureLock = "none";
    gestureFromPanel = false;
  };

  track.addEventListener("touchstart", e => onTouchStart(e, false), { passive: true });
  track.addEventListener("touchmove", onTouchMove, { passive: true });
  track.addEventListener("touchend", onTouchEnd, { passive: true });
  toolsPanel.addEventListener("touchstart", e => onTouchStart(e, true), { passive: true });
  toolsPanel.addEventListener("touchmove", onTouchMove, { passive: true });
  toolsPanel.addEventListener("touchend", onTouchEnd, { passive: true });

  // Desktop: wheel + keyboard vertical navigation.
  let wheelLock = false;
  track.addEventListener("wheel", event => {
    if (Math.abs(event.deltaY) < Math.abs(event.deltaX)) return; // horizontal wheel ignored
    if (wheelLock) { event.preventDefault(); return; }
    event.preventDefault();
    wheelLock = true;
    step(event.deltaY > 0 ? 1 : -1);
    window.setTimeout(() => { wheelLock = false; }, 420);
  }, { passive: false });

  function step(direction: 1 | -1) {
    const index = slides.findIndex(s => s.id === activeSlideId);
    const nextIndex = Math.min(Math.max((index < 0 ? 0 : index) + direction, 0), slides.length - 1);
    slides[nextIndex]?.element.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  const onKey = (event: KeyboardEvent) => {
    if (searchOverlay || notifOverlay || document.querySelector(".reels-composer")) return;
    if ((event.target as HTMLElement)?.closest("input, textarea")) return;
    if (event.key === "ArrowDown" || event.key === "PageDown" || event.key === "j") { event.preventDefault(); step(1); }
    else if (event.key === "ArrowUp" || event.key === "PageUp" || event.key === "k") { event.preventDefault(); step(-1); }
    else if (event.key === "Escape") {
      if (shell.classList.contains("reels-css-fullscreen")) shell.classList.remove("reels-css-fullscreen");
      else if (document.fullscreenElement === shell) void document.exitFullscreen();
    }
    else if (event.key === "f") { if (activeSlideId !== null) toggleFullscreen(); }
    else if (event.key === "g") { toggleGrid(); }
    else if (event.key === " " || event.key === "Spacebar") {
      const a = slides.find(s => s.id === activeSlideId);
      if (a?.video) { event.preventDefault(); a.togglePlaybackByUser(); }
    }
  };
  document.addEventListener("keydown", onKey);

  // ── Top-bar wiring ───────────────────────────────────────────────────────
  searchBtn.addEventListener("click", openSearch);
  moreBtn.addEventListener("click", () => setTools(true));

  // Pause active media when the tab is hidden; resume the active slide when visible.
  const onVisibility = () => {
    if (document.hidden) slides.find(s => s.id === activeSlideId)?.deactivate();
    else if (!suspended && !gridOpen && !searchOverlay && !notifOverlay) {
      slides.find(s => s.id === activeSlideId)?.activate();
    }
  };
  document.addEventListener("visibilitychange", onVisibility);

  // ── Boot: identity → unread count → first page ───────────────────────────
  void identityPromise.then(resolved => {
    if (destroyed) return;
    identity = resolved;
    renderBottomNav();
    if (resolved.status === "authenticated") {
      void fetchNotifications().then(({ unreadCount: unread }) => { unreadCount = unread; applyUnreadBadge(); }).catch(() => {});
    }
  });
  const query = new URLSearchParams(window.location.search);
  searchQuery = query.get("q")?.trim() ?? "";
  const initialGrid = query.get("view") === "grid";
  if (query.get("search") === "1") queueMicrotask(openSearch);
  if (initialGrid) toggleGrid(true);
  else void loadPage();

  document.body.dataset.clipReady = "true";

  const removeNavigation = registerNavigationLayer({
    priority: 10,
    active: () => Boolean(searchOverlay || notifOverlay || gridOpen),
    back: () => {
      if (searchOverlay) { closeSearch(); return openSearch; }
      if (notifOverlay) { closeNotifications(); return openNotifications; }
      toggleGrid(false);
      return () => toggleGrid(true);
    },
  });

  return {
    pause() {
      playbackIntentVersion++;
      suspended = true;
      slides.forEach(slide => slide.deactivate());
    },
    resume() {
      suspended = false;
      if (!gridOpen && !searchOverlay && !notifOverlay && !document.hidden) {
        slides.find(slide => slide.id === activeSlideId)?.activate();
      }
    },
    destroy() {
      removeNavigation();
      playbackIntentVersion++;
      destroyed = true;
      disposeInbox?.();
      io?.disconnect();
      feedController?.abort();
      gridController?.abort();
      searchController?.abort();
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("visibilitychange", onVisibility);
      slides.forEach(s => { s.deactivate(); s.dispose(); });
      shell.remove();
    },
  };
}
