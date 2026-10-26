import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import ClipsPage from "./clips";

// ClipsPage is a redirect shim: when the SPA router lands on /clips or /clip, it
// forces a full navigation to the isolated (React-free) clip boot so the heavy
// app bundle is never pulled into the Reels experience. It renders no feed,
// no <video>, and no upload form of its own.
describe("Clips SPA redirect shim", () => {
  let assign: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    assign = vi.fn();
    // Override only assign; keep the rest of location intact.
    Object.defineProperty(window, "location", {
      configurable: true,
      value: { ...window.location, assign },
    });
  });
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it("redirects to the isolated clip boot under BASE_URL on mount", () => {
    render(<ClipsPage />);
    expect(assign).toHaveBeenCalledTimes(1);
    expect(assign).toHaveBeenCalledWith(`${import.meta.env.BASE_URL}clips`);
  });

  it("shows only a transient opening notice — never an inline feed or player", () => {
    const { container } = render(<ClipsPage />);
    expect(screen.getByText("جارٍ فتح الكليبز…")).toBeTruthy();
    // The shim must not render its own media or upload surface; the real Reels
    // feed lives in the isolated clip-entry boot.
    expect(container.querySelector("video")).toBeNull();
    expect(container.querySelector("audio")).toBeNull();
    expect(container.querySelector("form")).toBeNull();
  });
});
