import { trackEvent } from "@/lib/analytics";

export type ClipUploadMetadata = {
  /** Citizen-facing publication title. */
  title: string;
  /** Untrusted hint only. Null means the browser could not read media metadata. */
  durationSec: number | null;
};

/** Progress counts only storage-acknowledged bytes. */
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

async function postJson(url: string, body: Record<string, unknown>, signal: AbortSignal) {
  const response = await fetch(url, {
    method: "POST",
    credentials: "include",
    cache: "no-store",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal,
  });
  if (!response.ok) throw Object.assign(new Error(await errorMessage(response)), { status: response.status });
  return response.json();
}


export async function currentUploadOwner(signal?: AbortSignal): Promise<number> {
  const response = await fetch(`${import.meta.env.BASE_URL}api/auth/me`, { credentials: "include", cache: "no-store", signal });
  if (response.status === 401) throw new Error("Reconnectez-vous pour publier");
  if (!response.ok) throw new Error(`Vérification de session indisponible (${response.status}) — réessayez`);
  const me = await response.json();
  if (!Number.isSafeInteger(me?.id) || me.id <= 0 || typeof me.username !== "string") throw new Error("Compte non vérifié — réessayez");
  return me.id;
}

function putOriginal(url: string, file: File, signal: AbortSignal, onProgress: ClipUploadProgress) {
  return new Promise<void>((resolve, reject) => {
    signal.throwIfAborted();
    const xhr = new XMLHttpRequest();
    const abort = () => xhr.abort();
    const finish = (error?: unknown) => {
      signal.removeEventListener("abort", abort);
      xhr.onload = xhr.onerror = xhr.onabort = null;
      xhr.upload.onprogress = null;
      if (error) reject(error); else resolve();
    };
    xhr.open("PUT", url);
    xhr.setRequestHeader("Content-Type", file.type || "application/octet-stream");
    xhr.setRequestHeader("If-None-Match", "*");
    xhr.upload.onprogress = event => {
      if (event.lengthComputable) onProgress(event.loaded / event.total * 100, event.loaded, event.total);
    };
    xhr.onload = () => finish(xhr.status >= 200 && xhr.status < 300 ? undefined : new Error(`تعذر الرفع (${xhr.status})`));
    xhr.onerror = () => finish(new Error("تعذر الاتصال — حاول مجدداً"));
    xhr.onabort = () => finish(abortReason(signal));
    signal.addEventListener("abort", abort, { once: true });
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
  options: { expectedOwner: number },
): Promise<PublishedClip> {
  signal.throwIfAborted();
  if (file.size > MAX_CLIP_BYTES) throw new Error(FILE_TOO_LARGE_MESSAGE);
  const owner = await currentUploadOwner(signal);
  if (owner !== options.expectedOwner) {
    throw new Error("Le compte a changé — ce fichier ne sera pas publié avec un autre compte");
  }
  const contentType = file.type || "application/octet-stream";
  const session = await postJson(`${import.meta.env.BASE_URL}api/clips/presign`, {
    filename: file.name, title: metadata.title, contentType, size: file.size,
    durationSec: metadata.durationSec, ownerId: owner,
  }, signal);
  if (typeof session?.uploadUrl !== "string" || typeof session?.key !== "string") {
    throw new Error("تعذر بدء الرفع — حاول مجدداً");
  }
  const signed = new URL(session.uploadUrl);
  if (signed.protocol !== "https:" || signed.username || signed.password) throw new Error("رابط الرفع غير صالح");
  onProgress(0, 0, file.size);
  await putOriginal(session.uploadUrl, file, signal, onProgress);
  signal.throwIfAborted();
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
}
