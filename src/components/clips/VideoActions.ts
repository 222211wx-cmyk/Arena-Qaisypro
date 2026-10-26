import { icons } from "./clipIcons";
import { isClipSaved, toggleClipSaved } from "./savedClips";

const BASE = import.meta.env.BASE_URL;

export type VideoActionState = {
  id: number;
  code?: string | null;
  title: string;
  author: { id: number; username: string; avatarUrl?: string | null };
  isOwner: boolean;
  liked: boolean;
  likeCount: number;
  commentCount: number;
  /** Persisted bookmark state (from engagement/by-code/feed). */
  saved?: boolean;
  saveCount?: number;
  /** Persisted share count (from engagement/by-code/feed). */
  shareCount?: number;
};

/** Formats an integer count with French (fr-FR) grouping. */
export function formatCount(value: number): string {
  return new Intl.NumberFormat("fr-FR").format(Number.isFinite(value) ? value : 0);
}

type MountOptions = {
  host: HTMLElement;
  media: HTMLMediaElement;
  titleElement: HTMLElement;
  initial?: VideoActionState;
  clipId: number;
  code?: string | null;
  /** Viewer account id used to scope local (device-only) saves. */
  accountId?: number | string | null;
  /**
   * Disable the bookmark control entirely. Used when the identity lookup failed
   * for a reason other than 401, so we must not write to the anonymous bucket
   * under an account that may actually be signed in.
   */
  saveDisabled?: boolean;
  /** Content type label shown next to the audio/video badge. */
  contentType?: string | null;
  /** App shell that must enter fullscreen so persistent navigation stays visible. */
  fullscreenTarget?: HTMLElement;
  /** Removes the deleted clip from the owning surface after the durable API succeeds. */
  onDeleted?: (clipId: number) => void | Promise<void>;
};

/**
 * Handle returned by mountVideoActions so callers can hydrate the like/comment
 * controls after mount (the feed row lacks those fields and fetches them from
 * /engagement asynchronously). Hydration NEVER clobbers a value the viewer has
 * already mutated in this session — an in-flight or completed user like/comment
 * takes precedence over a late server snapshot.
 */
export type VideoActionsHandle = {
  /** Merge a later engagement snapshot into the rendered like/comment controls. */
  hydrate(snapshot: Partial<Pick<VideoActionState, "liked" | "likeCount" | "commentCount">>): void;
  /** Release document listeners and the media overlay when a feed slide is removed. */
  dispose?: () => void;
};

async function apiJson(path: string, init?: RequestInit) {
  const response = await fetch(`${BASE}api${path}`, {
    credentials: "include",
    ...init,
    headers: init?.body ? { "Content-Type": "application/json", ...init.headers } : init?.headers,
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(typeof body?.error === "string" ? body.error : `Request failed (${response.status})`);
  return body;
}

/** Vertical rail icon button. Icon SVG stays; label is aria-only + count text. */
function railButton(label: string, iconHtml: string): HTMLButtonElement {
  const control = document.createElement("button");
  control.type = "button";
  control.className = "clip-rail-btn";
  control.setAttribute("aria-label", label);
  const iconWrap = document.createElement("span");
  iconWrap.className = "clip-rail-icon";
  iconWrap.innerHTML = iconHtml;
  control.append(iconWrap);
  if (["Like", "Unlike", "Comments", "Partage"].includes(label)) {
    const caption = document.createElement("span");
    caption.className = "clip-rail-label";
    caption.textContent = label === "Comments" ? "Comment" : label === "Unlike" ? "Like" : label;
    control.append(caption);
  }
  return control;
}

/** Menu item inside the three-dot popover. */
function menuItem(label: string, iconHtml: string): HTMLButtonElement {
  const control = document.createElement("button");
  control.type = "button";
  control.className = "clip-menu-item";
  control.setAttribute("role", "menuitem");
  const iconWrap = document.createElement("span");
  iconWrap.className = "clip-menu-icon";
  iconWrap.innerHTML = iconHtml;
  iconWrap.setAttribute("aria-hidden", "true");
  const text = document.createElement("span");
  text.textContent = label;
  control.append(iconWrap, text);
  control.setAttribute("aria-label", label);
  return control;
}

function setCount(control: HTMLButtonElement, value: number) {
  let count = control.querySelector<HTMLElement>(".clip-rail-count");
  if (!count) {
    count = document.createElement("strong");
    count.className = "clip-rail-count";
    control.append(count);
  }
  count.textContent = formatCount(value);
}

function showMessage(status: HTMLElement, message: string, error = false) {
  status.textContent = message;
  status.classList.toggle("error", error);
}

async function copyLink(url: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(url);
      return true;
    }
  } catch {
    // Clipboard permissions/focus rules vary by browser; try the legacy path.
  }
  const textarea = document.createElement("textarea");
  textarea.value = url;
  textarea.readOnly = true;
  textarea.setAttribute("aria-hidden", "true");
  textarea.style.cssText = "position:fixed;inset-inline-start:-9999px;opacity:0";
  document.body.append(textarea);
  textarea.focus();
  textarea.select();
  let copied = false;
  try {
    copied = typeof document.execCommand === "function" && document.execCommand("copy");
  } catch {
    copied = false;
  } finally {
    textarea.remove();
  }
  return copied;
}

function showSelectableLink(status: HTMLElement, url: string) {
  const label = document.createElement("span");
  label.textContent = "Copy this link: ";
  const input = document.createElement("input");
  input.type = "text";
  input.readOnly = true;
  input.value = url;
  input.className = "copy-link-fallback";
  input.setAttribute("aria-label", "Share link");
  input.addEventListener("focus", () => input.select());
  input.addEventListener("click", () => input.select());
  status.classList.remove("error");
  status.replaceChildren(label, input);
  input.focus();
  input.select();
}

export async function mountVideoActions(options: MountOptions): Promise<VideoActionsHandle> {
  // Every file-backed Clips surface is one-shot. Ordered feeds decide what comes
  // next; direct/story/selfie players simply stop at the natural end.
  options.media.loop = false;
  let state = options.initial;
  // Tracks whether the viewer has mutated like/comment this session. Once true,
  // a late /engagement hydration must not overwrite the user's own value.
  let userChangedLike = false;
  let userChangedComment = false;
  // Filled in once the like/comment controls are built; lets hydrate() re-render.
  let applyHydration: VideoActionsHandle["hydrate"] = () => {};
  let removeOutsideClick: (() => void) | undefined;
  const noopHandle: VideoActionsHandle = {
    hydrate: snapshot => applyHydration(snapshot),
    dispose: () => {
      removeOutsideClick?.();
      overlay.remove();
      shell.remove();
    },
  };
  const shell = document.createElement("div");
  shell.className = "video-actions-shell";
  shell.innerHTML = `
    <div class="clip-overlay">
      <div class="clip-rail" role="toolbar" aria-label="Clip actions" aria-orientation="vertical"></div>
      <div class="clip-meta">
        <div class="clip-meta-author"></div>
        <p class="clip-meta-title"></p>
        <p class="clip-meta-audio"></p>
      </div>
    </div>
    <p class="action-status muted" role="status" aria-live="polite"></p>
    <div class="clip-comments" hidden></div>`;
  options.host.replaceChildren(shell);
  const overlay = shell.querySelector(".clip-overlay") as HTMLDivElement;
  const rail = overlay.querySelector(".clip-rail") as HTMLDivElement;
  const metaAuthor = overlay.querySelector(".clip-meta-author") as HTMLDivElement;
  const metaTitle = overlay.querySelector(".clip-meta-title") as HTMLParagraphElement;
  const metaAudio = overlay.querySelector(".clip-meta-audio") as HTMLParagraphElement;
  const status = shell.querySelector(".action-status") as HTMLParagraphElement;
  const comments = shell.querySelector(".clip-comments") as HTMLDivElement;
  // Video: the rail/meta overlay floats over the media, so relocate it into the
  // media's (position:relative) frame. Audio has no picture, so its rail/meta
  // stay in the host as a static block below the native controls (no overlay).
  const audioLayout = options.media instanceof HTMLAudioElement ||
    (options.contentType ?? "").startsWith("audio/");
  overlay.classList.toggle("clip-overlay-static", audioLayout);
  const mediaFrame = options.media.parentElement;
  if (!audioLayout && mediaFrame) mediaFrame.appendChild(overlay);

  try {
    if (!state) {
      const data = await apiJson(`/clips/${options.clipId}/engagement`);
      state = data.engagement as VideoActionState;
    }
  } catch (error) {
    showMessage(status, error instanceof Error ? error.message : "Actions unavailable", true);
    return noopHandle;
  }
  const current = state;

  // ── Left-bottom meta: author profile link, title, audio/media label ──
  // Public citizen identity; never link to the legacy identity page.
  const authorLink = document.createElement("a");
  authorLink.className = "clip-meta-author-link";
  authorLink.href = `${BASE}u/${encodeURIComponent(current.author.username)}`;
  authorLink.textContent = `@${current.author.username}`;
  authorLink.setAttribute("aria-label", `Open ${current.author.username}'s profile`);
  metaAuthor.replaceChildren(authorLink);
  metaTitle.textContent = current.title;
  // Both video and audio clips show the "Original audio" caption line
  // (no invented artist metadata).
  metaAudio.textContent = "Original audio";
  const citizen = document.createElement("div");
  citizen.className = "clip-citizen-mini";
  const citizenLink = authorLink.cloneNode(true) as HTMLAnchorElement;
  citizenLink.className = "clip-citizen-link";
  if (current.author.avatarUrl) {
    const avatar = document.createElement("img");
    avatar.src = current.author.avatarUrl;
    avatar.alt = "";
    avatar.loading = "lazy";
    citizenLink.prepend(avatar);
  } else {
    const initials = document.createElement("span");
    initials.className = "clip-citizen-initials";
    initials.setAttribute("aria-hidden", "true");
    initials.textContent = current.author.username.slice(0, 2).toUpperCase();
    citizenLink.prepend(initials);
  }
  citizen.append(citizenLink);
  for (const [label, mode] of [["Citizen card", "profile"], ["Message", "message"], ["Ask AI", "assistant"]] as const) {
    if (mode === "message" && current.isOwner) continue;
    const trigger = document.createElement("button");
    trigger.type = "button";
    trigger.textContent = label;
    trigger.dataset.testid = `clip-${mode}-${current.id}`;
    trigger.addEventListener("click", async () => {
      trigger.disabled = true;
      try {
        const { openClipCitizenPanel } = await import("./ClipCitizenPanel");
        await openClipCitizenPanel({ mode, clipId: current.id, peerId: current.author.id, peerUsername: current.author.username });
      } catch (error) {
        showMessage(status, error instanceof Error ? error.message : "Citizen panel unavailable", true);
      } finally { trigger.disabled = false; }
    });
    citizen.append(trigger);
  }
  shell.prepend(citizen);

  // ── Heart (like) ─────────────────────────────────────────────────────
  const heart = railButton(current.liked ? "Unlike" : "Like", icons.heart(current.liked));
  setCount(heart, current.likeCount);
  heart.classList.toggle("active", current.liked);
  const renderHeart = () => {
    const iconWrap = heart.querySelector(".clip-rail-icon");
    if (iconWrap) iconWrap.innerHTML = icons.heart(current.liked);
    heart.classList.toggle("active", current.liked);
    heart.setAttribute("aria-label", current.liked ? "Unlike" : "Like");
    setCount(heart, current.likeCount);
  };
  heart.addEventListener("click", async () => {
    heart.disabled = true;
    userChangedLike = true; // viewer intent wins over any late hydration
    try {
      const data = await apiJson(`/clips/${current.id}/like`, { method: "POST" });
      current.liked = Boolean(data.liked);
      current.likeCount = Number(data.likeCount);
      renderHeart();
      showMessage(status, current.liked ? "Liked" : "Like removed");
    } catch (error) {
      showMessage(status, error instanceof Error ? error.message : "Unable to update like", true);
    } finally {
      heart.disabled = false;
    }
  });

  // ── Comment ──────────────────────────────────────────────────────────
  const commentButton = railButton("Comments", icons.comment());
  setCount(commentButton, current.commentCount);
  let commentsLoaded = false;
  const loadComments = async () => {
    const data = await apiJson(`/clips/${current.id}/comments`);
    const list = document.createElement("div");
    list.className = "comment-list";
    const items = Array.isArray(data.comments) ? data.comments : [];
    if (!items.length) {
      const empty = document.createElement("p");
      empty.className = "muted";
      empty.textContent = "No comments yet.";
      list.append(empty);
    } else {
      for (const item of items) {
        const row = document.createElement("p");
        const author = document.createElement("a");
        author.href = `${BASE}u/${encodeURIComponent(String(item.username))}`;
        author.textContent = `${item.username}: `;
        row.append(author, document.createTextNode(String(item.content)));
        list.append(row);
      }
    }
    const form = document.createElement("form");
    form.className = "comment-form";
    const input = document.createElement("input");
    input.name = "content";
    input.maxLength = 500;
    input.required = true;
    input.placeholder = "Write a comment…";
    input.setAttribute("aria-label", "Comment");
    const submit = document.createElement("button");
    submit.type = "submit";
    submit.textContent = "Post";
    form.append(input, submit);
    form.addEventListener("submit", async event => {
      event.preventDefault();
      submit.disabled = true;
      userChangedComment = true; // viewer intent wins over any late hydration
      try {
        await apiJson(`/clips/${current.id}/comments`, {
          method: "POST",
          body: JSON.stringify({ content: input.value }),
        });
        input.value = "";
        current.commentCount++;
        setCount(commentButton, current.commentCount);
        commentsLoaded = false;
        await loadComments();
      } catch (error) {
        showMessage(status, error instanceof Error ? error.message : "Unable to post comment", true);
      } finally {
        submit.disabled = false;
      }
    });
    comments.replaceChildren(list, form);
    commentsLoaded = true;
  };
  commentButton.addEventListener("click", async () => {
    comments.hidden = !comments.hidden;
    commentButton.setAttribute("aria-expanded", String(!comments.hidden));
    if (!comments.hidden && !commentsLoaded) {
      try { await loadComments(); }
      catch (error) { showMessage(status, error instanceof Error ? error.message : "Unable to load comments", true); }
    }
  });

  // Late hydration from /engagement: apply the server snapshot ONCE to the
  // like/comment controls (the feed row omits these fields). It never overwrites
  // a value the viewer already changed this session, and it is latched so a
  // second, potentially stale snapshot can never clobber the applied state.
  let hydrated = false;
  applyHydration = snapshot => {
    if (hydrated) return;
    hydrated = true;
    if (!userChangedLike) {
      if (typeof snapshot.liked === "boolean") current.liked = snapshot.liked;
      if (typeof snapshot.likeCount === "number") current.likeCount = snapshot.likeCount;
      renderHeart();
    }
    if (!userChangedComment && typeof snapshot.commentCount === "number") {
      current.commentCount = snapshot.commentCount;
      setCount(commentButton, current.commentCount);
    }
  };

  const shareUrl = new URL(`${BASE}clips/${current.id}`, window.location.origin).href;

  // ── Share ────────────────────────────────────────────────────────────
  // The persisted share count is recorded ONLY after a successful native share
  // or link copy — never on cancellation. The endpoint is idempotent per
  // citizen, so retries do not inflate the count.
  const share = railButton("Partage", icons.share());
  let shareCount = Number(current.shareCount ?? 0);
  setCount(share, shareCount);
  const recordShare = async () => {
    // Anonymous viewers can still share the link; only authenticated citizens
    // increment the persisted count. A failed count never blocks the share.
    if (options.saveDisabled || options.accountId === null || options.accountId === undefined) return;
    try {
      const data = await apiJson(`/clips/${current.id}/share`, { method: "POST" });
      if (data?.shared === true && Number.isFinite(Number(data.shareCount))) {
        shareCount = Number(data.shareCount);
        current.shareCount = shareCount;
        setCount(share, shareCount);
      }
    } catch {
      // Sharing already succeeded for the user; a count failure is non-fatal.
    }
  };
  share.addEventListener("click", async () => {
    try {
      if (await copyLink(shareUrl)) {
        await recordShare();
        showMessage(status, "Lien copié");
      } else {
        // Fallback surface — the user must still copy manually, so do not count.
        showSelectableLink(status, shareUrl);
      }
    } catch (error) {
      // Cancellation (AbortError) must never record a share.
      if ((error as DOMException)?.name !== "AbortError") showMessage(status, "Partage indisponible", true);
    }
  });

  // ── Bookmark / Save (persisted per citizen) ──────────────────────────
  // Persistent server-side save is the source of truth. If identity is unknown
  // (non-401 failure) we fall back to a device-only save so the control stays
  // usable, labelled honestly.
  const canPersistSave = !options.saveDisabled &&
    options.accountId !== null && options.accountId !== undefined;
  let saved = current.saved ?? (canPersistSave ? false : isClipSaved(options.accountId ?? null, current.id));
  let saveCount = Number(current.saveCount ?? 0);
  const bookmark = railButton(saved ? "Enregistré" : "Enregistrer", icons.bookmark(saved));
  bookmark.setAttribute("aria-pressed", String(saved));
  bookmark.classList.toggle("active", saved);
  setCount(bookmark, saveCount);
  const renderBookmark = () => {
    const iconWrap = bookmark.querySelector(".clip-rail-icon");
    if (iconWrap) iconWrap.innerHTML = icons.bookmark(saved);
    bookmark.classList.toggle("active", saved);
    bookmark.setAttribute("aria-pressed", String(saved));
    bookmark.setAttribute("aria-label", saved ? "Enregistré" : "Enregistrer");
    setCount(bookmark, saveCount);
  };
  if (options.saveDisabled) {
    bookmark.disabled = true;
    bookmark.setAttribute("aria-label", "Enregistrement indisponible — statut de connexion inconnu");
  }
  bookmark.addEventListener("click", async () => {
    if (options.saveDisabled) return;
    if (!canPersistSave) {
      // No authenticated identity — degrade to device-only save (labelled honestly).
      const next = toggleClipSaved(options.accountId ?? null, current.id);
      if (next === null) { showMessage(status, "Enregistrement indisponible sur cet appareil", true); return; }
      saved = next;
      const iconWrap = bookmark.querySelector(".clip-rail-icon");
      if (iconWrap) iconWrap.innerHTML = icons.bookmark(saved);
      bookmark.classList.toggle("active", saved);
      bookmark.setAttribute("aria-pressed", String(saved));
      bookmark.setAttribute("aria-label", saved ? "Enregistré sur cet appareil" : "Enregistrer");
      showMessage(status, saved ? "Enregistré sur cet appareil" : "Retiré des enregistrements");
      return;
    }
    bookmark.disabled = true;
    try {
      const data = await apiJson(`/clips/${current.id}/save`, { method: "POST" });
      saved = Boolean(data.saved);
      saveCount = Number(data.saveCount ?? saveCount);
      current.saved = saved;
      current.saveCount = saveCount;
      renderBookmark();
      showMessage(status, saved ? "Enregistré" : "Retiré des enregistrements");
    } catch (error) {
      showMessage(status, error instanceof Error ? error.message : "Impossible d'enregistrer", true);
    } finally {
      bookmark.disabled = false;
    }
  });

  // ── Three-dot menu (secondary actions) ───────────────────────────────
  const menuWrap = document.createElement("div");
  menuWrap.className = "clip-menu-wrap";
  const more = railButton("More actions", icons.more());
  more.setAttribute("aria-haspopup", "menu");
  more.setAttribute("aria-expanded", "false");
  const menu = document.createElement("div");
  menu.className = "clip-menu";
  menu.setAttribute("role", "menu");
  menu.setAttribute("aria-label", "More clip actions");
  menu.hidden = true;
  menuWrap.append(more, menu);

  const closeMenu = () => {
    if (menu.hidden) return;
    menu.hidden = true;
    more.setAttribute("aria-expanded", "false");
  };
  const openMenu = () => {
    menu.hidden = false;
    more.setAttribute("aria-expanded", "true");
    const first = menu.querySelector<HTMLButtonElement>("button:not([hidden])");
    first?.focus();
  };
  more.addEventListener("click", () => {
    if (menu.hidden) openMenu();
    else closeMenu();
  });
  const onOutsideClick = (event: MouseEvent) => {
    if (!menuWrap.contains(event.target as Node)) closeMenu();
  };
  document.addEventListener("click", onOutsideClick);
  removeOutsideClick = () => document.removeEventListener("click", onOutsideClick);
  menu.addEventListener("keydown", event => {
    if (event.key === "Escape") {
      event.stopPropagation();
      closeMenu();
      more.focus();
    }
  });

  // Copy link (menu)
  const copy = menuItem("Copy link", icons.link());
  copy.addEventListener("click", async () => {
    closeMenu();
    if (await copyLink(shareUrl)) showMessage(status, "Link copied");
    else showSelectableLink(status, shareUrl);
  });
  menu.append(copy);

  // Message (menu) — not for owner
  const message = menuItem("Message", icons.message());
  if (current.isOwner) message.hidden = true;
  message.addEventListener("click", async () => {
    closeMenu();
    message.disabled = true;
    try {
      const { openUnifiedMessenger } = await import("../messenger/UnifiedMessenger");
      await openUnifiedMessenger({ peerId: current.author.id, peerUsername: current.author.username, context: `clip:${current.id}` });
    } catch (error) {
      showMessage(status, error instanceof Error ? error.message : "Unable to open messages", true);
      message.disabled = false;
    }
  });
  menu.append(message);

  // Zoom (menu)
  const zoom = menuItem("Zoom", icons.zoom());
  zoom.addEventListener("click", () => {
    const zoomed = options.media.classList.toggle("clip-zoomed");
    zoom.classList.toggle("active", zoomed);
    zoom.setAttribute("aria-pressed", String(zoomed));
    showMessage(status, zoomed ? "Zoomed in" : "Zoom reset");
  });
  menu.append(zoom);

  // Fullscreen (menu)
  const fullscreen = menuItem("Fullscreen", icons.fullscreen());
  fullscreen.addEventListener("click", async () => {
    closeMenu();
    const target = options.fullscreenTarget ?? options.media.closest<HTMLElement>("[data-clip-fullscreen-shell]");
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else if (target?.requestFullscreen) await target.requestFullscreen();
      else if (target && "webkitRequestFullscreen" in target) {
        (target as HTMLElement & { webkitRequestFullscreen(): void }).webkitRequestFullscreen();
      } else if (target) {
        target.classList.toggle("clip-css-fullscreen");
      } else {
        throw new Error("Fullscreen shell is unavailable");
      }
    } catch { showMessage(status, "Fullscreen is unavailable", true); }
  });
  menu.append(fullscreen);

  // Edit title (menu) — owner only
  if (current.isOwner) {
    const edit = menuItem("Edit title", icons.edit());
    edit.addEventListener("click", () => {
      closeMenu();
      const form = document.createElement("form");
      form.className = "title-edit";
      const input = document.createElement("input");
      input.value = current.title;
      input.maxLength = 120;
      input.required = true;
      input.setAttribute("aria-label", "Clip title");
      const save = document.createElement("button");
      save.type = "submit";
      save.textContent = "Save";
      form.append(input, save);
      options.titleElement.replaceChildren(form);
      input.focus();
      input.select();
      form.addEventListener("submit", async event => {
        event.preventDefault();
        save.disabled = true;
        try {
          const data = await apiJson(`/clips/${current.id}`, {
            method: "PATCH",
            body: JSON.stringify({ title: input.value }),
          });
          current.title = String(data.clip.title);
          options.titleElement.textContent = current.title;
          metaTitle.textContent = current.title;
          document.title = `${current.title} — HELIXLY`;
          showMessage(status, "Title saved");
        } catch (error) {
          save.disabled = false;
          showMessage(status, error instanceof Error ? error.message : "Unable to save title", true);
        }
      });
    });
    menu.append(edit);

    // Delete is deliberately gated by both the server-derived engagement owner
    // flag and a resolved authenticated identity. Usernames are display data and
    // are never used as authorization evidence.
    if (!options.saveDisabled && options.accountId !== null && options.accountId !== undefined) {
      const remove = menuItem("Delete clip", icons.more());
      remove.classList.add("clip-menu-item-destructive");
      remove.addEventListener("click", async () => {
        closeMenu();
        if (!window.confirm("Delete this published clip permanently?")) return;
        remove.disabled = true;
        try {
          await apiJson(`/clips/${current.id}`, { method: "DELETE" });
          options.media.pause();
          options.media.removeAttribute("src");
          options.media.load();
          showMessage(status, "Clip deleted");
          await options.onDeleted?.(current.id);
        } catch (error) {
          showMessage(status, error instanceof Error ? error.message : "Could not delete the clip", true);
          remove.disabled = false;
        }
      });
      menu.append(remove);
    }
  }

  // Rail order: heart, comment, share, bookmark/save, three-dots.
  rail.append(heart, commentButton, share, bookmark, menuWrap);
  return noopHandle;
}
