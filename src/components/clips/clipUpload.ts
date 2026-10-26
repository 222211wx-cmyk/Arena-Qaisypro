import { trackEvent } from "@/lib/analytics";

const CONTROL_API = () => `${import.meta.env.BASE_URL}api/upload/presign`;

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

async function retry<T>(operation: () => Promise<T>, signal: AbortSignal): Promise<T> {
  let delay = 1000;
  for (;;) {
    signal.throwIfAborted();
    try { return await operation(); }
    catch (error) {
      signal.throwIfAborted();
      const status = (error as { status?: number }).status;
      if (status && status < 500 && status !== 408 && status !== 429) throw error;
      await new Promise<void>((resolve, reject) => {
        const stop = () => { clearTimeout(timer); reject(abortReason(signal)); };
        const timer = setTimeout(() => { signal.removeEventListener("abort", stop); resolve(); }, delay);
        signal.addEventListener("abort", stop, { once: true });
      });
      delay = Math.min(delay * 2, 30_000);
    }
  }
}

// Bounded-memory content identity prevents resuming with different bytes after
// selecting a file again. Only the identity/request ID is persisted, never media.
async function fileIdentity(file: File, signal: AbortSignal) {
  let hash: Uint8Array<ArrayBuffer> = new Uint8Array(32);
  for (let offset = 0; offset < file.size; offset += 5 * 1024 * 1024) {
    signal.throwIfAborted();
    const chunk = await file.slice(offset, offset + 5 * 1024 * 1024).arrayBuffer();
    const next = new Uint8Array(hash.length + chunk.byteLength);
    next.set(hash); next.set(new Uint8Array(chunk), hash.length);
    hash = new Uint8Array(await crypto.subtle.digest("SHA-256", next));
  }
  return Array.from(hash, x => x.toString(16).padStart(2, "0")).join("");
}

/** browser chunks → authenticated server → storage; resume confirmed parts. */
export async function uploadClip(
  file: File,
  metadata: ClipUploadMetadata,
  signal: AbortSignal,
  onProgress: ClipUploadProgress,
  options: { expectedOwner: number },
): Promise<PublishedClip> {
  signal.throwIfAborted();
  const owner = await currentUploadOwner(signal);
  if (owner !== options.expectedOwner) {
    throw new Error("Le compte a changé — ce fichier ne sera pas publié avec un autre compte");
  }
  const contentType = file.type || "application/octet-stream";
  const identity = await fileIdentity(file, signal);
  const savedKey = `clips-server-upload:${owner}:${identity}:${encodeURIComponent(metadata.title)}:${encodeURIComponent(file.name)}`;
  let requestId = localStorage.getItem(savedKey);
  if (!requestId) { requestId = crypto.randomUUID(); localStorage.setItem(savedKey, requestId); }
  const control = (body: Record<string, unknown>) =>
    retry(() => postJson(CONTROL_API(), { ...body, expectedOwnerId: owner }, signal), signal);
  const session = await control({
    action: "initiate", requestId,
    filename: file.name,
    title: metadata.title,
    contentType,
    size: file.size,
    durationSec: metadata.durationSec,
    expectedOwnerId: owner,
  });
  if (typeof session?.sessionId !== "string" || !Number.isSafeInteger(session.partSize) || session.partSize <= 0) {
    throw new Error("تعذر بدء الرفع — حاول مجدداً");
  }
  onProgress(0, 0, file.size);
  const inspected = await control({ action: "inspect", sessionId: session.sessionId });
  const parts = new Map<number, { partNumber: number; etag: string; size: number }>(
    (inspected.parts ?? []).map((p: { partNumber: number; etag: string; size: number }) => [p.partNumber, p]),
  );
  let body = inspected.receipt;
  if (!body) {
    for (let partNumber = 1; inspected.state !== "completing" && partNumber <= session.partCount; partNumber++) {
      const start = (partNumber - 1) * session.partSize;
      const end = Math.min(file.size, start + session.partSize);
      if (!parts.has(partNumber)) {
        let attempted = false;
        const part = await retry(async () => {
          if (attempted) {
            const confirmed = await control({ action: "inspect", sessionId: session.sessionId });
            const stored = confirmed.parts?.find((p: { partNumber: number; size: number }) =>
              p.partNumber === partNumber && p.size === end - start);
            if (stored) return stored;
          }
          attempted = true;
          const response = await fetch(`${import.meta.env.BASE_URL}api/upload/chunk/${session.sessionId}/${partNumber}`, {
            method: "PUT", credentials: "include", signal,
            headers: { "Content-Type": "application/octet-stream" }, body: file.slice(start, end),
          });
          if (!response.ok) throw Object.assign(new Error(await errorMessage(response)), { status: response.status });
          return response.json();
        }, signal);
        parts.set(partNumber, part);
      }
      onProgress(end / file.size * 100, end, file.size);
    }
    body = await control({ action: "complete", sessionId: session.sessionId });
  }
  signal.throwIfAborted();
  const clip = body?.clip && typeof body.clip === "object" ? body.clip : null;
  const code = body?.code ?? clip?.code;
  if (body?.ok === false || !clip || typeof code !== "string" || !/^HELX-\d{6}$/.test(code)) {
    throw new Error("لم يؤكد الخادم نشر الكليب");
  }
  trackEvent("clip_upload_success", { outcome: "published" });
  localStorage.removeItem(savedKey);
  return { ...clip, code, name: clip.title ?? body.name ?? clip.name ?? metadata.title };
}
