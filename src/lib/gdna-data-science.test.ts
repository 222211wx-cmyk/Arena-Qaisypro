import { describe, it, expect } from "vitest";
import {
  estimateClipSaving,
  aggregateSavings,
  formatBytes,
  formatSavingPercent,
} from "./gdna-data-science";

describe("estimateClipSaving — actual metadata, no hallucination", () => {
  it("is MEASURED when a real derivative size exists", () => {
    const r = estimateClipSaving({ originalBytes: 1000, alternativeBytes: 250 });
    expect(r.basis).toBe("measured");
    expect(r.deliveredBytes).toBe(250);
    expect(r.bytesSaved).toBe(750);
    expect(r.savingFraction).toBeCloseTo(0.75);
  });

  it("never claims a saving larger than the original", () => {
    const r = estimateClipSaving({ originalBytes: 100, alternativeBytes: 250 });
    expect(r.deliveredBytes).toBe(100);
    expect(r.bytesSaved).toBe(0);
  });

  it("is EXPLICITLY estimated (not a fixed 80%) when no derivative exists", () => {
    const r = estimateClipSaving({ originalBytes: 1000, alternativeBytes: null });
    expect(r.basis).toBe("estimated");
    // conservative 50%, never a headline 80-90% claim
    expect(r.savingFraction).toBeCloseTo(0.5);
    expect(r.method.toLowerCase()).toContain("estimated");
  });

  it("handles zero/invalid original bytes without NaN", () => {
    const r = estimateClipSaving({ originalBytes: 0, alternativeBytes: null });
    expect(r.savingFraction).toBe(0);
    expect(Number.isFinite(r.savingFraction)).toBe(true);
  });
});

describe("aggregateSavings", () => {
  it("is measured only when every input is measured", () => {
    const measured = aggregateSavings([
      estimateClipSaving({ originalBytes: 100, alternativeBytes: 40 }),
      estimateClipSaving({ originalBytes: 200, alternativeBytes: 80 }),
    ]);
    expect(measured.basis).toBe("measured");
    expect(measured.bytesSaved).toBe(180);

    const mixed = aggregateSavings([
      estimateClipSaving({ originalBytes: 100, alternativeBytes: 40 }),
      estimateClipSaving({ originalBytes: 200, alternativeBytes: null }),
    ]);
    expect(mixed.basis).toBe("estimated");
  });

  it("empty aggregate is estimated (no fabricated saving)", () => {
    const r = aggregateSavings([]);
    expect(r.basis).toBe("estimated");
    expect(r.bytesSaved).toBe(0);
  });
});

describe("formatters", () => {
  it("formats bytes in SI units", () => {
    expect(formatBytes(500)).toBe("500 B");
    expect(formatBytes(1500)).toBe("1.50 KB");
    expect(formatBytes(2_500_000)).toBe("2.50 MB");
  });

  it("formats saving percent, clamping non-positive to 0%", () => {
    expect(formatSavingPercent(0.75)).toBe("75%");
    expect(formatSavingPercent(0)).toBe("0%");
    expect(formatSavingPercent(-1)).toBe("0%");
  });
});
