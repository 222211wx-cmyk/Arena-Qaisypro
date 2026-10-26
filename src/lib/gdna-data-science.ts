/**
 * Browser-safe MIRROR of the authoritative pure predictor at the workspace root
 * `lib/gdna-data-science.ts` (backend-owned, source of truth). The root module
 * cannot be imported here because it lives outside this artifact's `rootDir`, so
 * this file reproduces its exact math and keeps the two in lock-step. If the root
 * predictor changes, update this mirror to match.
 *
 * HONESTY (contract, artifacts/api-server/docs/operator-api.md):
 *  - `predictMediaSize` is a LOCAL heuristic (bitrate × duration with dimension
 *    scaling), NOT an encoder, AI service, or perceptual-quality guarantee. It
 *    returns real, input-dependent bounds — never a fixed 80% saving/quality.
 *  - `estimateAvoidedBytes` yields a nonzero avoided figure ONLY for a `success`
 *    outcome using STORED original + ready-derivative sizes. Cache/failure = 0.
 *  - `observedRequestSuccessScore` = (successes + offline-cache) / samples; null
 *    with no samples. It is not uptime or carrier reliability.
 */

export const SCIENCE_METHODOLOGY =
  "Payload bytes and request outcomes are client-reported, not independently verified. Avoided bytes require a matching one-use server receipt for a complete audio response and a successful client report; sizes come from stored original and ready audio metadata. Server completion does not prove reception or listening. Cache/failure reports earn no avoided-byte estimate. Estimates are not billed mobile data. Success score = (successful requests + offline-cache responses) / sampled requests, not uptime or carrier performance. No samples means null. No external-platform baseline.";

/**
 * Success score = (successes + offline-cache) / samples. Null with no samples.
 * Throws on invalid/inconsistent counts (mirror of the root guard).
 */
export function observedRequestSuccessScore(
  successes: number,
  cached: number,
  samples: number,
): number | null {
  if (
    ![successes, cached, samples].every((n) => Number.isSafeInteger(n) && n >= 0) ||
    successes + cached > samples
  ) {
    throw new Error("Invalid sample counts");
  }
  return samples ? (successes + cached) / samples : null;
}

/**
 * Avoided bytes from STORED sizes. Only a `success` outcome can produce a
 * nonzero figure; cache/failure always yield 0. Never client-selected baselines.
 */
export function estimateAvoidedBytes(
  originalBytes: number,
  alternativeBytes: number,
  outcome: "success" | "failure" | "cache",
): number {
  if (![originalBytes, alternativeBytes].every((n) => Number.isSafeInteger(n) && n >= 0)) {
    throw new Error("Invalid stored sizes");
  }
  return outcome !== "success" ? 0 : Math.max(0, originalBytes - alternativeBytes);
}

export interface MediaPrediction {
  estimatedBytes: number;
  estimatedAvoidedBytes: number;
  originalBitrateBps: number;
  targetBitrateBps: number;
  outputWidth: number;
  outputHeight: number;
  status: "local_estimate";
  qualityGuaranteed: false;
  methodology: string;
}

/**
 * Local heuristic predictor — bitrate × duration / 8, with video bitrate scaling
 * by target pixel area and a fixed audio floor. NOT an encoder or quality claim.
 * Mirrors the authoritative root predictor exactly, including its input bounds.
 */
export function predictMediaSize(input: {
  originalBytes: number;
  durationSec: number;
  width: number;
  height: number;
  targetWidth?: number;
  targetHeight?: number;
  audioBitrateKbps?: number;
}): MediaPrediction {
  const {
    originalBytes,
    durationSec,
    width,
    height,
    targetWidth = 640,
    targetHeight = 360,
    audioBitrateKbps = 48,
  } = input;
  if (
    ![originalBytes, durationSec, width, height, targetWidth, targetHeight, audioBitrateKbps].every(
      (n) => Number.isFinite(n) && n > 0,
    ) ||
    !Number.isSafeInteger(originalBytes) ||
    originalBytes > 10_737_418_240 ||
    durationSec > 86400 ||
    Math.max(width, height, targetWidth, targetHeight) > 16384 ||
    audioBitrateKbps > 512
  ) {
    throw new Error("Invalid media predictor input");
  }
  const originalBitrateBps = (originalBytes * 8) / durationSec;
  const scale = Math.min(1, targetWidth / width, targetHeight / height);
  const targetBitrateBps = Math.min(
    originalBitrateBps,
    Math.max(0, originalBitrateBps - audioBitrateKbps * 1000) * scale * scale +
      audioBitrateKbps * 1000,
  );
  const estimatedBytes = Math.min(originalBytes, Math.ceil((targetBitrateBps * durationSec) / 8));
  return {
    estimatedBytes,
    estimatedAvoidedBytes: originalBytes - estimatedBytes,
    originalBitrateBps,
    targetBitrateBps,
    outputWidth: Math.max(1, Math.round(width * scale)),
    outputHeight: Math.max(1, Math.round(height * scale)),
    status: "local_estimate",
    qualityGuaranteed: false,
    methodology:
      "Bitrate × duration / 8; video bitrate scales with target pixel area, audio bitrate remains fixed. Container overhead and encoder behavior may differ.",
  };
}

// ── Browser display helpers (frontend-only, not part of the pure contract) ────

function safeBytes(v: number): number {
  return Number.isFinite(v) && v > 0 ? Math.round(v) : 0;
}

/** Format a byte count for display (SI, base-1000). */
export function formatBytes(bytes: number): string {
  const n = safeBytes(bytes);
  if (n < 1000) return `${n} B`;
  const units = ["KB", "MB", "GB", "TB"];
  let value = n / 1000;
  let i = 0;
  while (value >= 1000 && i < units.length - 1) {
    value /= 1000;
    i++;
  }
  return `${value.toFixed(value < 10 ? 2 : 1)} ${units[i]}`;
}

/** Format a 0..1 fraction as a percent string, clamping non-positive to 0%. */
export function formatFraction(fraction: number | null | undefined): string {
  if (fraction == null || !Number.isFinite(fraction) || fraction <= 0) return "0%";
  return `${Math.round(fraction * 100)}%`;
}
