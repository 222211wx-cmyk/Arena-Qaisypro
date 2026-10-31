import { isAccountId, type AccountId } from '@/lib/account-id';
import { tokens } from "@workspace/gdna-ds/tokens";
import { mountLightweightBackButton } from "./lib/lightweight-back-button";
mountLightweightBackButton();
import { createLightweightCallBoundary } from "./lib/lightweight-call-boundary";
import { announceAccountChange, fetchSharedClipSession, subscribeAccountChanges, subscribeSessionWake } from "./lib/account-session-events";
import {
  uploadClip,
  cancelPendingUploads,
  type ClipUploadMetadata,
} from "./components/clips/clipUpload";
import { readClipDuration } from "./components/clips/readClipDuration";

import { clipOverlayCss } from "./components/clips/clipOverlayStyles";
import { reelsShellCss } from "./components/clips/reelsStyles";
import { mountReels, type ReelsController } from "./components/clips/reelsFeed";
import { reelsIcons } from "./components/clips/reelsIcons";

const BASE = import.meta.env.BASE_URL;
const FEED_TIMEOUT_MS = 12_000;
const root = document.getElementById("root");
if (!root) throw new Error("Clip root is missing");

const palette = tokens.color.dark;
const space = tokens.spacing;
const style = document.createElement("style");
style.textContent = `
  :root{color-scheme:dark;font-family:${tokens.fontFamily.sans.join(",")};background:${palette.background};color:${palette.foreground}}
  *{box-sizing:border-box}body{margin:0;background:${palette.background};color:${palette.foreground}}
  main{padding:calc(${space} * 4);margin:auto;max-width:48rem}header{display:flex;align-items:center;justify-content:space-between}
  section,form{display:grid;gap:calc(${space} * 3);padding:calc(${space} * 4);margin-block:calc(${space} * 4);background:${palette.card};border:1px solid ${palette.border};border-radius:${tokens.radius}}
  h1,h2,p{margin-block:calc(${space} * 2)}label{display:grid;gap:calc(${space} * 2)}
  input,select,button{font:inherit;color:inherit;background:${palette.secondary};border:1px solid ${palette.input};border-radius:${tokens.radius};padding:calc(${space} * 3)}
  input[type=checkbox],input[type=radio]{inline-size:auto}button{cursor:pointer;background:${palette.primary};color:${palette.primaryForeground};font-weight:700}
  button.secondary{background:${palette.secondary};color:${palette.secondaryForeground}}button:disabled{opacity:.55;cursor:not-allowed}
  fieldset{display:grid;gap:calc(${space} * 3);border:1px solid ${palette.border};border-radius:${tokens.radius}}
  fieldset label{display:flex;align-items:center;gap:calc(${space} * 2)}
  progress{inline-size:100%;accent-color:${palette.primary}}video,audio{inline-size:100%;max-block-size:60vh;background:${palette.background};display:block}
  .clip-media-frame{overflow:hidden;position:relative;border-radius:${tokens.radius}}
  ${clipOverlayCss(palette, space)}
  .comment-form,.title-edit{display:flex;gap:calc(${space} * 2)}.comment-form input,.title-edit input{min-inline-size:0;flex:1}
  .copy-link-fallback{inline-size:min(100%,28rem)}
  .clip-zoomed{transform:scale(1.35);transform-origin:center;position:relative;z-index:2}article{overflow:visible}
  a{color:${palette.primary}}.muted{color:${palette.mutedForeground}}.error{color:${palette.destructive}}[hidden]{display:none!important}
  ${reelsShellCss(palette as unknown as Record<string, string>, space)}
  /* The upload composer lives inside the reels shell; drop the standalone
     centered <main> layout so the form fills the composer sheet width. */
  #reels-root main{padding:0;margin:0;max-width:none}
  #reels-root main > header{display:none}
  .reels-css-fullscreen{background:${palette.background}}
  .reels-install-help{position:absolute;z-index:30;top:calc(${space} * 18);inset-inline:calc(${space} * 4);padding:calc(${space} * 3);background:${palette.card};color:${palette.cardForeground};border:1px solid ${palette.border};border-radius:${tokens.radius}}
  .reels-install-help button{margin-inline-start:calc(${space} * 2)}
`;
document.head.appendChild(style);

root.innerHTML = `
<div id="reels-root" data-testid="clip-shell"></div>
<div id="composer" class="reels-composer" role="dialog" aria-label="Publier un clip" aria-modal="true" hidden>
<div class="reels-composer-head">
  <button id="composer-close" type="button" class="reels-icon-btn" aria-label="Fermer">${reelsIcons.close()}</button>
  <h2>Publier un clip</h2>
</div>
<div class="reels-composer-body">
<main dir="rtl">
  <div id="auth" class="muted" aria-live="polite">جارٍ التحقق من تسجيل الدخول…</div>
  <form id="upload" data-testid="clip-upload" hidden>
    <h2>رفع صوت أو فيديو</h2>
    <input id="file" data-testid="clip-file-input" type="file" accept="video/*,audio/*" hidden>
    <button id="choose-file" class="secondary" type="button" aria-controls="file" aria-describedby="selection duration-status">Choisir un fichier — فيديو / أوديو</button>
    <p id="selection" class="muted" role="status" aria-live="polite">اختر ملف صوت أو فيديو</p>
    <div id="progress-wrap" hidden>
      <progress id="progress" data-testid="clip-progress" max="100" value="0"></progress>
      <p id="upload-status" data-testid="clip-status" role="status" aria-live="polite"></p>
    </div>
    <label id="display-name-row" for="display-name" hidden>
      <span>اسم الفيشي</span>
      <input id="display-name" data-testid="clip-display-name" type="text" dir="auto" autocomplete="off" aria-describedby="display-name-error">
      <span id="display-name-error" class="error" role="alert" aria-live="polite"></span>
    </label>
    <p id="duration-status" data-testid="clip-duration" class="muted" role="status" aria-live="polite"></p>
    <div>
      <button id="submit" data-testid="clip-submit" type="submit" disabled>نشر</button>
      <button id="cancel" class="secondary" type="button" hidden>Annuler</button>
    </div>
    <button id="clear-pending" class="secondary" type="button">Annuler les téléversements inachevés</button>
    <p class="muted">60 ثانية على الأقل — لا حد زمني مفروض.</p>
    <p id="upload-error" data-testid="clip-error" class="error" role="alert" aria-live="assertive"></p>
    <div id="receipt" data-testid="clip-receipt" role="status" aria-live="polite" hidden></div>
  </form>
</main>
</div>
</div>`;
const calls = createLightweightCallBoundary(root);

const element = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const auth = element<HTMLDivElement>("auth");
const form = element<HTMLFormElement>("upload");
const input = element<HTMLInputElement>("file");
const chooseFile = element<HTMLButtonElement>("choose-file");
const displayNameRow = element<HTMLLabelElement>("display-name-row");
const displayName = element<HTMLInputElement>("display-name");
const displayNameError = element<HTMLSpanElement>("display-name-error");
const durationStatus = element<HTMLParagraphElement>("duration-status");
const receipt = element<HTMLDivElement>("receipt");
const submit = element<HTMLButtonElement>("submit");
const cancel = element<HTMLButtonElement>("cancel");
const clearPending = element<HTMLButtonElement>("clear-pending");
const selection = element<HTMLParagraphElement>("selection");
const progressWrap = element<HTMLDivElement>("progress-wrap");
const progress = element<HTMLProgressElement>("progress");
const status = element<HTMLParagraphElement>("upload-status");
const uploadError = element<HTMLParagraphElement>("upload-error");
const reelsRoot = element<HTMLDivElement>("reels-root");
const composer = element<HTMLDivElement>("composer");
const composerClose = element<HTMLButtonElement>("composer-close");
const mutableControls = Array.from(form.querySelectorAll<HTMLInputElement | HTMLButtonElement>("input, #choose-file"));
let cachedFile: File | null = null;
let selectedDuration: number | null = null;
let durationController: AbortController | null = null;
let durationProbe: Promise<number | null> | null = null;
let uploadController: AbortController | null = null;
let selectedFileKey: string | null = null;
let submissionPending = false;
let clearingPending = false;
let uploadOwner: AccountId | null = null;
let accountReloading = false;
if (window.isSecureContext && "serviceWorker" in navigator) {
  // Same URL and scope as app-entry: keeps the canonical push/call worker current.
  void navigator.serviceWorker.register(`${BASE}sw.js`, { scope: BASE, updateViaCache: "none" }).catch(() => {});
}
const DURATION_CLICK_WAIT_MS = 8_000;

const MEDIA_EXTENSIONS = new Set([
  "3g2", "3gp", "aac", "aiff", "amr", "avi", "flac", "m4a", "m4v", "mkv",
  "mov", "mp3", "mp4", "mpeg", "mpg", "oga", "ogg", "ogv", "opus", "wav",
  "webm", "wma", "wmv",
]);

/** Strip only a recognized media suffix; dots in all other names are retained. */
export function defaultClipDisplayName(filename: string) {
  const dot = filename.lastIndexOf(".");
  if (dot <= 0 || !MEDIA_EXTENSIONS.has(filename.slice(dot + 1).toLocaleLowerCase())) {
    return filename;
  }
  return filename.slice(0, dot);
}

function fileSelectionKey(file: File) {
  return JSON.stringify([file.name, file.size, file.type, file.lastModified]);
}

function normalizedDisplayName() {
  return displayName.value.trim();
}

function displayNameValidationError() {
  const value = normalizedDisplayName();
  if (!value) return "اسم الفيشي مطلوب";
  if ([...value].length > 120) return "اسم الفيشي خاصو يكون 120 حرف أو أقل";
  return "";
}

function updateSubmitState() {
  // Selection is enough to make the action discoverable. Size, duration and
  // title errors are explained after a click instead of by a disabled button.
  clearPending.disabled = clearingPending || accountReloading || uploadOwner === null || Boolean(uploadController);
  submit.disabled = clearingPending || accountReloading || uploadOwner === null || Boolean(uploadController) || !cachedFile;
}

function formatBytes(bytes: number) {
  return new Intl.NumberFormat("ar").format(bytes) + " بايت";
}

function formatDuration(seconds: number) {
  const whole = Math.floor(seconds);
  return `${Math.floor(whole / 3600).toString().padStart(2, "0")}:${Math.floor(whole / 60 % 60).toString().padStart(2, "0")}:${(whole % 60).toString().padStart(2, "0")}`;
}

type PublishedClip = { name: string; code: string };

export function finalizePublication(published: PublishedClip) {
  progress.value = 100;
  status.textContent = "تم نشر الملف — publication confirmée";
  cachedFile = null;
  selectedDuration = null;
  input.value = "";
  displayName.value = "";
  displayNameRow.hidden = true;
  displayNameError.textContent = "";
  selectedFileKey = null;
  chooseFile.textContent = "Choisir un fichier — فيديو / أوديو";
  durationStatus.textContent = "";
  selection.textContent = "تم نشر الملف";
  updateSubmitState();
  receipt.replaceChildren();
  const name = document.createElement("p");
  name.textContent = published.name;
  const code = document.createElement("p");
  code.textContent = published.code;
  code.dir = "ltr";
  receipt.append(name, code);
  const link = document.createElement("a");
  link.href = `${BASE}clip/${published.code}`;
  link.textContent = "فتح الملف";
  receipt.append(link);
  receipt.hidden = false;
}

chooseFile.addEventListener("click", () => input.click());

input.addEventListener("change", async () => {
  const selected = input.files?.[0];
  // A dismissed picker must not discard the previous selection.
  if (!selected) return;
  durationController?.abort();
  const probing = new AbortController();
  durationController = probing;
  const nextFileKey = fileSelectionKey(selected);
  if (nextFileKey !== selectedFileKey) {
    displayName.value = defaultClipDisplayName(selected.name);
  }
  selectedFileKey = nextFileKey;
  displayNameRow.hidden = false;
  cachedFile = selected;
  selectedDuration = null;
  displayName.disabled = false;
  chooseFile.textContent = selected.name;
  selection.textContent = "✓ Fichier sélectionné";
  updateSubmitState();
  uploadError.textContent = "";
  displayNameError.textContent = "";
  displayName.setAttribute("aria-invalid", "false");
  progressWrap.hidden = false;
  progress.value = 0;
  status.textContent = `0% — 0 من ${formatBytes(selected.size)}`;
  receipt.hidden = true;
  receipt.replaceChildren();
  durationStatus.textContent = "المدة: جارٍ القراءة…";
  cancel.hidden = false;
  const probe = readClipDuration(selected, probing.signal).then(duration => {
    if (probing.signal.aborted || cachedFile !== selected) return null;
    selectedDuration = duration;
    durationStatus.textContent = `المدة: ${formatDuration(duration)}`;
    return duration;
  }).catch(() => {
    if (!probing.signal.aborted && cachedFile === selected) {
      durationStatus.textContent = "Durée inconnue — vérification par le serveur";
    }
    return null;
  }).finally(() => {
    if (durationProbe === probe) durationProbe = null;
    if (!uploadController && cachedFile === selected) cancel.hidden = true;
  });
  durationProbe = probe;
  await probe;
});

displayName.addEventListener("input", () => {
  if (!displayNameValidationError()) {
    displayNameError.textContent = "";
    displayName.setAttribute("aria-invalid", "false");
  }
  updateSubmitState();
});

cancel.addEventListener("click", () => {
  const reason = new DOMException("Cancelled", "AbortError");
  if (uploadController) {
    uploadController.abort(reason);
    // A publication waiting on the selection probe owns that wait too. Abort
    // both so cancellation cannot later fall through into transfer.
    if (durationProbe) durationController?.abort(reason);
  } else if (durationController) {
    durationController.abort(reason);
    durationStatus.textContent = "تم إلغاء قراءة المدة";
    cancel.hidden = true;
  }
});

clearPending.addEventListener("click", async () => {
  if (clearingPending || uploadOwner === null || uploadController || accountReloading) return;
  if (!window.confirm("Annuler vos téléversements inachevés, y compris ceux ouverts dans un autre onglet ? Les publications confirmées seront conservées.")) return;
  const owner = uploadOwner;
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), 30_000);
  clearingPending = true;
  updateSubmitState();
  uploadError.textContent = "";
  try {
    const count = await cancelPendingUploads(owner, controller.signal);
    if (uploadOwner === owner) uploadError.textContent = `${count} téléversement(s) inachevé(s) annulé(s). Vous pouvez réessayer.`;
  } catch (error) {
    if (uploadOwner === owner) uploadError.textContent = error instanceof Error ? error.message : "Annulation indisponible — réessayez";
  } finally {
    clearTimeout(timer);
    clearingPending = false;
    updateSubmitState();
  }
});

async function awaitPendingDurationProbe(signal: AbortSignal) {
  signal.throwIfAborted();
  const pending = durationProbe;
  if (!pending) return selectedDuration;
  let timer = 0;
  let rejectAborted: ((reason: unknown) => void) | null = null;
  const aborted = new Promise<never>((_, reject) => {
    rejectAborted = reject;
  });
  const onAbort = () => rejectAborted?.(
    signal.reason ?? new DOMException("Cancelled", "AbortError"),
  );
  signal.addEventListener("abort", onAbort, { once: true });
  try {
    const duration = await Promise.race([
      pending,
      new Promise<null>(resolve => {
        timer = window.setTimeout(() => resolve(null), DURATION_CLICK_WAIT_MS);
      }),
      aborted,
    ]);
    signal.throwIfAborted();
    return duration;
  } finally {
    clearTimeout(timer);
    signal.removeEventListener("abort", onAbort);
  }
}

function reportUploadProgress(percent: number, uploaded: number, total: number) {
  const displayPercent = Math.floor(percent);
  progress.value = percent;
  submit.textContent = `Téléversement ${displayPercent}%…`;
  status.textContent = `${formatBytes(uploaded)} من ${formatBytes(total)} — ${displayPercent}%`;
}

form.addEventListener("submit", async event => {
  event.preventDefault();
  const file = cachedFile;
  if (!file || clearingPending || uploadOwner === null || accountReloading || uploadController || submissionPending) return;
  submissionPending = true;
  uploadError.textContent = "";
  displayNameError.textContent = "";
  displayName.setAttribute("aria-invalid", "false");
  const title = normalizedDisplayName();
  const titleError = displayNameValidationError();
  if (titleError) {
    displayNameError.textContent = titleError;
    displayName.setAttribute("aria-invalid", "true");
    displayName.focus();
    submissionPending = false;
    return;
  }
  const owner = uploadOwner;
  const operation = new AbortController();
  uploadController = operation;
  mutableControls.forEach(control => { control.disabled = true; });
  submit.disabled = true;
  submit.textContent = "Téléversement 0%…";
  cancel.hidden = false;
  cancel.disabled = false;
  progressWrap.hidden = false;
  progress.value = 0;
  status.textContent = `0% — 0 من ${formatBytes(file.size)} — جارٍ التحقق من المدة…`;
  try {
    const duration = selectedDuration ?? await awaitPendingDurationProbe(operation.signal);
    operation.signal.throwIfAborted();
    if (cachedFile !== file) return;
    if (duration !== null && duration < 60) throw new Error("خاص دقيقة الفوق");
    const metadata: ClipUploadMetadata = { title, durationSec: duration };
    const published = await uploadClip(file, metadata, operation.signal, reportUploadProgress, { expectedOwner: owner });
    if (uploadOwner !== owner) return;
    finalizePublication({ ...published, name: title });
    reloadFeedAfterPublish();
  } catch (error) {
    const cancelled = operation.signal.aborted;
    uploadError.textContent = cancelled ? "تم إلغاء الرفع — Annulé"
      : error instanceof Error ? error.message : "تعذر الرفع — حاول مجدداً";
    status.textContent = cancelled ? "توقف الرفع" : "لم يكتمل الرفع";
  } finally {
    submissionPending = false;
    uploadController = null;
    mutableControls.forEach(control => { control.disabled = false; });
    updateSubmitState();
    submit.textContent = "نشر";
    cancel.hidden = true;
  }
});


// ── Reels feed + upload composer wiring ──────────────────────────────────────
// The fullscreen Reels feed is the primary surface. The camera button (and the
// empty-state "publish") open this composer, which hosts the existing upload
// form and direct helixly-clips upload pipeline.
let reels: ReelsController | null = null;
let lastFocusBeforeComposer: HTMLElement | null = null;

function openComposer() {
  lastFocusBeforeComposer = document.activeElement as HTMLElement;
  reels?.pause();
  composer.hidden = false;
  (chooseFile ?? composerClose).focus();
}
function closeComposer() {
  if (["/publish", "/cli"].some(path => window.location.pathname.replace(/\/$/, "").endsWith(path))) {
    window.location.assign(`${BASE}clips`);
    return;
  }
  composer.hidden = true;
  reels?.resume();
  lastFocusBeforeComposer?.focus();
}
composerClose.addEventListener("click", closeComposer);
composerClose.textContent = "Retour";
composer.addEventListener("keydown", event => { if (event.key === "Escape") closeComposer(); });

function mountReelsFeed() {
  reels?.destroy();
  try {
    reels = mountReels(reelsRoot, { onOpenComposer: openComposer });
  } catch (error) {
    console.error("Clips feed mount failed", error);
    reelsRoot.replaceChildren();
    const message = document.createElement("p");
    message.setAttribute("role", "alert");
    message.textContent = "Impossible d’ouvrir Clips. Réessayez ou revenez à l’accueil.";
    const retry = document.createElement("button");
    retry.textContent = "Réessayer";
    retry.onclick = mountReelsFeed;
    const home = document.createElement("a");
    home.href = BASE; home.textContent = "Accueil";
    reelsRoot.append(message, retry, home);
  }
}

/** After a successful publish, refresh the feed and return to it. */
function reloadFeedAfterPublish() {
  closeComposer();
  mountReelsFeed();
}

let authFlight: Promise<void> | null = null;
let authGeneration = 0;
let verifiedAccount: AccountId | null | undefined;

function reloadForAccountChange() {
  if (accountReloading) return;
  accountReloading = true;
  ++authGeneration;
  // Account-bound selections cannot safely follow a new cookie owner.
  uploadController?.abort();
  durationController?.abort();
  uploadOwner = null;
  form.hidden = true;
  calls.setAccount(null);
  reels?.destroy();
  window.location.reload();
}

function acceptAccount(id: AccountId | null): boolean {
  if (verifiedAccount !== undefined && verifiedAccount !== id) {
    announceAccountChange(id);
    reloadForAccountChange();
    return false;
  }
  verifiedAccount = id;
  return true;
}

function clearComposerIdentity() {
  uploadController?.abort();
  durationController?.abort();
  uploadOwner = null;
  cachedFile = null;
  selectedDuration = null;
  selectedFileKey = null;
  input.value = "";
  displayName.value = "";
  receipt.replaceChildren();
  receipt.hidden = true;
  form.hidden = true;
  calls.setAccount(null);
  updateSubmitState();
}

async function verifyAuth() {
  const generation = authGeneration;
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), FEED_TIMEOUT_MS);
  try {
    const response = await fetchSharedClipSession();
    controller.signal.throwIfAborted();
    if (accountReloading || generation !== authGeneration) return;
    if (response.status === 401) {
      clearComposerIdentity();
      if (!acceptAccount(null)) return;
      auth.innerHTML = `<a href="${BASE}login">سجل الدخول لرفع الصوت أو الفيديو</a>`;
      return;
    }
    if (!response.ok) throw new Error(`Session verification unavailable (${response.status}) — Réessayer`);
    const me = await response.json();
    if (accountReloading || generation !== authGeneration) return;
    if (!me || !isAccountId(me.id) || typeof me.username !== "string") {
      throw new Error("Réponse de session invalide — Réessayer");
    }
    if (!acceptAccount(me.id)) return;
    {
      calls.setAccount(typeof me.id === "number" ? me.id : null);
      uploadOwner = me.id;
    }
    auth.textContent = "يمكنك رفع ملفك الآن";
    form.hidden = false;
  } catch (error) {
    if (accountReloading || generation !== authGeneration) return;
    // Network errors, 429 and 5xx are not logout. Preserve a verified selection.
    auth.replaceChildren();
    const message = document.createElement("span");
    message.textContent = error instanceof Error ? error.message : "تعذر التحقق من الجلسة — حاول مجدداً";
    const retry = document.createElement("button");
    retry.type = "button";
    retry.textContent = "Réessayer — إعادة المحاولة";
    retry.onclick = () => void loadAuth();
    auth.append(message, retry);
  } finally {
    clearTimeout(timer);
  }
}

function loadAuth(): Promise<void> {
  if (authFlight) return authFlight;
  const flight = verifyAuth().finally(() => { if (authFlight === flight) authFlight = null; });
  authFlight = flight;
  return flight;
}

const stopAccountEvents = subscribeAccountChanges(reloadForAccountChange);
const stopSessionWake = subscribeSessionWake(() => void loadAuth());
window.addEventListener("pagehide", event => {
  // BFCache retains this document and its subscriptions for pageshow.
  if (!event.persisted) { stopAccountEvents(); stopSessionWake(); }
});

document.body.dataset.clipReady = "true";
// Mount the fullscreen Reels feed immediately (it resolves its own viewer
// identity for engagement scoping). Resolve auth in parallel to enable the
// upload composer form.
mountReelsFeed();
if (["/publish", "/cli"].some(path => window.location.pathname.replace(/\/$/, "").endsWith(path))) openComposer();
void loadAuth();