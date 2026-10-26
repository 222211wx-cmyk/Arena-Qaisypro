/** Read local container metadata only; never transcode or buffer the whole file. */
export function readClipDuration(file: File, signal: AbortSignal): Promise<number> {
  return new Promise((resolve, reject) => {
    if (signal.aborted) {
      reject(signal.reason);
      return;
    }
    const media = document.createElement(file.type.startsWith("audio/") ? "audio" : "video");
    const url = URL.createObjectURL(file);
    let settled = false;
    const cleanup = () => {
      clearTimeout(timer);
      signal.removeEventListener("abort", aborted);
      media.onloadedmetadata = null;
      media.ondurationchange = null;
      media.ontimeupdate = null;
      media.onerror = null;
      media.removeAttribute("src");
      media.load();
      URL.revokeObjectURL(url);
    };
    const finish = (duration?: number, error?: Error) => {
      if (settled) return;
      settled = true;
      cleanup();
      if (error) reject(error);
      else resolve(duration!);
    };
    const inspect = () => {
      if (Number.isFinite(media.duration) && media.duration > 0) {
        finish(media.duration);
      }
    };
    const aborted = () => finish(undefined, new DOMException("Cancelled", "AbortError"));
    const timer = window.setTimeout(() => finish(undefined,
      new Error("تعذر قراءة مدة الملف — سيتحقق الخادم من المدة.")), 4_000);
    signal.addEventListener("abort", aborted, { once: true });
    media.preload = "metadata";
    media.onloadedmetadata = inspect;
    media.ondurationchange = inspect;
    media.ontimeupdate = inspect;
    media.onerror = () => finish(undefined, new Error("تعذر قراءة مدة هذا الملف في المتصفح."));
    media.src = url;
    media.load();
  });
}