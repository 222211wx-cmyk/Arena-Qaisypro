import { trackEvent } from "@/lib/analytics";

export type ClipUploadMetadata = {
  /** Citizen-facing publication title. */
  title: string;
  /** Untrusted hint only. Null means the browser could not read media metadata. */
  durationSec: number | null;
};

/** Browser transfer progress; publication still requires server confirmation. */
export type ClipUploadProgress = (percent: number, uploadedBytes: number, totalBytes: number) => void;

export type PublishedClip = {
  code: string;
  name: string;
  [key: string]: unknown;
};

function abortReason(signal: AbortSignal) {
  return signal.reason ?? new DOMException("Cancelled", "AbortError");
}

async function errorMessage(response: Response) {
  try {
    const body = await response.json();
    if (typeof body?.error === "string") return body.error;
  } catch {
    // Fall through to the status message.
  }
  return `تعذر الرفع (${response.status})`;
}

export type ClipUploadStage = "session" | "presign" | "storage" | "confirm";
export const API_TIMEOUT_MS = 30_000;
export const STORAGE_IDLE_TIMEOUT_MS = 90_000;

// Bound both headers and JSON parsing. Never log a signed URL, cookie or identity.
async function apiJson(url: string, init: RequestInit, signal?: AbortSignal) {
  const controller = new AbortController();
  const abort = () => controller.abort(signal?.reason);
  signal?.throwIfAborted();
  signal?.addEventListener("abort", abort, { once: true });
  const timer = setTimeout(() => controller.abort(new Error("API sans réponse après 30 s — réessayez")), API_TIMEOUT_MS);
  try {
    const response = await fetch(url, { ...init, credentials: "include", cache: "no-store", signal: controller.signal });
    if (!response.ok) throw Object.assign(new Error(await errorMessage(response)), { status: response.status });
    return await response.json();
  } catch (error) {
    if (controller.signal.aborted) throw abortReason(controller.signal);
    throw error;
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener("abort", abort);
  }
}

function postJson(url: string, body: Record<string, unknown>, signal: AbortSignal) {
  return apiJson(url, {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
  }, signal);
}

export async function currentUploadOwner(signal?: AbortSignal): Promise<number> {
  const me = await apiJson(`${import.meta.env.BASE_URL}api/auth/session`, {}, signal);
  if (!Number.isSafeInteger(me?.id) || me.id <= 0 || typeof me.username !== "string") throw new Error("Compte non vérifié — réessayez");
  return me.id;
}

function putOriginal(url: string, file: File, signal: AbortSignal, onProgress: ClipUploadProgress) {
  return new Promise<void>((resolve, reject) => {
    signal.throwIfAborted();
    const xhr = new XMLHttpRequest();
    const abort = () => xhr.abort();
    let idle: ReturnType<typeof setTimeout>;
    let settled = false;
    const finish = (error?: unknown) => {
      if (settled) return;
      settled = true;
      clearTimeout(idle);
      signal.removeEventListener("abort", abort);
      xhr.onload = xhr.onerror = xhr.onabort = null;
      xhr.upload.onprogress = null;
      if (error) reject(error); else resolve();
    };
    const resetIdle = () => {
      clearTimeout(idle);
      idle = setTimeout(() => {
        finish(new Error("R2 : aucun progrès depuis 90 s — vérifiez CORS et la connexion, puis réessayez"));
        xhr.abort();
      }, STORAGE_IDLE_TIMEOUT_MS);
    };
    xhr.open("PUT", url);
    xhr.setRequestHeader("Content-Type", file.type || "application/octet-stream");
    xhr.setRequestHeader("If-None-Match", "*");
    xhr.upload.onprogress = event => {
      if (event.loaded > 0) resetIdle();
      if (event.lengthComputable) onProgress(event.loaded / event.total * 100, event.loaded, event.total);
    };
    xhr.onload = () => finish(xhr.status >= 200 && xhr.status < 300 ? undefined : Object.assign(new Error(`R2 : échec PUT (${xhr.status})`), { status: xhr.status }));
    xhr.onerror = () => finish(new Error("R2 : échec réseau ou CORS — vérifiez la console et la politique du bucket"));
    xhr.onabort = () => finish(abortReason(signal));
    signal.addEventListener("abort", abort, { once: true });
    resetIdle();
    try { signal.throwIfAborted(); xhr.send(file); } catch (error) { finish(error); }
  });
}

export const MAX_CLIP_BYTES = 5 * 1024 ** 3;
export const FILE_TOO_LARGE_MESSAGE = "تعذر رفع هذا الملف — اختر ملفاً آخر";

/** Transfer original bytes to storage; publish only after server confirmation. */
export async function uploadClip(
  file: File,
  metadata: ClipUploadMetadata,
  signal: AbortSignal,
  onProgress: ClipUploadProgress,
  options: { expectedOwner: number; onStage?: (stage: ClipUploadStage) => void },
): Promise<PublishedClip> {
  signal.throwIfAborted();
  if (file.size > MAX_CLIP_BYTES) throw new Error(FILE_TOO_LARGE_MESSAGE);
  let stage: ClipUploadStage = "session";
  const enter = (next: ClipUploadStage) => { stage = next; options.onStage?.(next); };
  try {
    enter("session");
    const owner = await currentUploadOwner(signal);
    if (owner !== options.expectedOwner) {
      throw new Error("Le compte a changé — ce fichier ne sera pas publié avec un autre compte");
    }
    const contentType = file.type || "application/octet-stream";
    enter("presign");
    const session = await postJson(`${import.meta.env.BASE_URL}api/clips/presign`, {
      filename: file.name, title: metadata.title, contentType, size: file.size,
      durationSec: metadata.durationSec, ownerId: owner,
    }, signal);
    if (typeof session?.uploadUrl !== "string" || typeof session?.key !== "string") {
      throw new Error("تعذر بدء الرفع — حاول مجدداً");
    }
    const signed = new URL(session.uploadUrl);
    if (signed.protocol !== "https:" || signed.username || signed.password) throw new Error("رابط الرفع غير صالح");
    enter("storage");
    onProgress(0, 0, file.size);
    await putOriginal(session.uploadUrl, file, signal, onProgress);
    signal.throwIfAborted();
    enter("confirm");
    const body = await postJson(`${import.meta.env.BASE_URL}api/clips/confirm`, {
      key: session.key, ownerId: owner,
    }, signal);
    signal.throwIfAborted();
    const clip = body?.clip && typeof body.clip === "object" ? body.clip : null;
    const code = body?.code ?? clip?.code;
    if (body?.ok !== true || typeof body.url !== "string" || !clip || typeof code !== "string" || !/^HELX-\d{6}$/.test(code)) {
      throw new Error("لم يؤكد الخادم نشر الكليب");
    }
    const publicUrl = new URL(body.url);
    if (publicUrl.protocol !== "https:" || publicUrl.username || publicUrl.password) throw new Error("رابط العرض غير صالح");
    trackEvent("clip_upload_success", { outcome: "published" });
    return { ...clip, url: body.url, code, name: clip.title ?? body.name ?? clip.name ?? metadata.title };
  } catch (error) {
    if (!signal.aborted) console.error("[clip-upload]", { stage, status: (error as { status?: number })?.status ?? null, failure: error instanceof Error ? error.name : "Error" });
    throw error;
  }
}
