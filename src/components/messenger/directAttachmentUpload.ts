export type AttachmentUploadStage = "start" | "put" | "complete";

/** Only fixed stage/reason codes and HTTP status may leave this transport. */
export class AttachmentUploadError extends Error {
  constructor(
    readonly stage: AttachmentUploadStage,
    readonly reason: "network" | "timeout" | "response" | "http",
    readonly status = 0,
  ) {
    super(`${stage}/${reason}${status ? `/${status}` : ""}`);
    this.name = "AttachmentUploadError";
  }
}

export async function directAttachmentUpload(
  endpoint: string, blob: Blob, signal: AbortSignal, progress: (value: number) => void,
): Promise<{ url: string }> {
  async function metadata(stage: "start" | "complete", body: unknown): Promise<Record<string, unknown>> {
    const controller = new AbortController();
    const abort = () => controller.abort();
    let timedOut = false;
    signal.addEventListener("abort", abort, { once: true });
    if (signal.aborted) controller.abort();
    const timer = setTimeout(() => { timedOut = true; controller.abort(); }, 30_000);
    try {
      const response = await fetch(endpoint, { method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" }, body: JSON.stringify(body), signal: controller.signal });
      if (!response.ok) throw new AttachmentUploadError(stage, "http", response.status);
      const data: unknown = await response.json().catch(() => null);
      if (!data || typeof data !== "object" || Array.isArray(data)) throw new AttachmentUploadError(stage, "response");
      return data as Record<string, unknown>;
    } catch (error) {
      if (signal.aborted) throw new DOMException("Cancelled", "AbortError");
      if (timedOut) throw new AttachmentUploadError(stage, "timeout");
      if (error instanceof AttachmentUploadError) throw error;
      throw new AttachmentUploadError(stage, "network");
    } finally {
      clearTimeout(timer);
      signal.removeEventListener("abort", abort);
    }
  }
  const upload = await metadata("start", { action: "start", size: blob.size });
  if (typeof upload.url !== "string" || !upload.url.startsWith("https://") ||
      typeof upload.ticket !== "string" || !upload.ticket) throw new AttachmentUploadError("start", "response");
  const uploadUrl = upload.url;
  await new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const abort = () => xhr.abort();
    const finish = (error?: Error) => {
      signal.removeEventListener("abort", abort);
      error ? reject(error) : resolve();
    };
    try {
      xhr.open("PUT", uploadUrl);
      xhr.timeout = 120_000;
      xhr.setRequestHeader("Content-Type", "application/octet-stream");
      xhr.setRequestHeader("If-None-Match", "*");
      xhr.upload.onprogress = event => { if (event.lengthComputable) progress(Math.floor(event.loaded / event.total * 100)); };
      xhr.onload = () => finish(xhr.status >= 200 && xhr.status < 300 ? undefined : new AttachmentUploadError("put", "http", xhr.status));
      xhr.onerror = () => finish(new AttachmentUploadError("put", "network"));
      xhr.ontimeout = () => finish(new AttachmentUploadError("put", "timeout"));
      xhr.onabort = () => finish(new DOMException("Cancelled", "AbortError"));
      if (signal.aborted) { finish(new DOMException("Cancelled", "AbortError")); return; }
      signal.addEventListener("abort", abort, { once: true });
      xhr.send(blob);
    } catch {
      finish(new AttachmentUploadError("put", "network"));
    }
  });
  const completed = await metadata("complete", { action: "complete", ticket: upload.ticket });
  if (typeof completed.url !== "string" || !/^\/api\/messages\/files\/[A-Za-z0-9._-]+$/.test(completed.url)) {
    throw new AttachmentUploadError("complete", "response");
  }
  return { url: completed.url };
}