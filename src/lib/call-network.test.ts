import { describe, expect, it } from "vitest";
import { readCallNetworkState } from "./call-network";

describe("readCallNetworkState", () => {
  it("treats online as a hint and exposes estimates separately", () => {
    const state = readCallNetworkState({
      onLine: true,
      connection: { effectiveType: "3g", type: "wifi" },
    } as Navigator & { connection: EventTarget });
    expect(state.browserOnline).toBe(true);
    expect(state.effectiveType).toBe("3g");
    expect(state.connectionType).toBe("wifi");
    expect(state.advisory).toBe("normal");
  });

  it("marks offline and weak estimates", () => {
    expect(readCallNetworkState({ onLine: false } as Navigator).advisory).toBe("offline");
    expect(readCallNetworkState({
      onLine: true,
      connection: { effectiveType: "2g" },
    } as Navigator & { connection: EventTarget }).advisory).toBe("weak");
  });
});
