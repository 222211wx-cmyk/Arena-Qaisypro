import { beforeEach, describe, expect, it } from "vitest";
import { isClipSaved, toggleClipSaved } from "./savedClips";
import { clipOverlayCss } from "./clipOverlayStyles";

describe("clip overlay geometry (RTL-safe, physical properties)", () => {
  const css = clipOverlayCss({ primary: "#d4af37", ring: "#d4af37", popover: "#0d0d0d", popoverForeground: "#fff", border: "#333", secondary: "#1a1a1a", mutedForeground: "#b3b3b3", foreground: "#fff" }, "0.25rem");
  it("uses physical right/bottom/gap and never logical inset props", () => {
    expect(css).toContain("right:16px");
    expect(css).toContain("bottom:80px");
    expect(css).toContain("gap:20px");
    expect(css).not.toMatch(/inset-inline|inset-block/);
  });
  it("anchors caption left:16px right:72px, left-aligned LTR", () => {
    expect(css).toContain("left:16px");
    expect(css).toContain("right:72px");
    expect(css).toContain("text-align:left");
  });
  it("opens the menu leftward from the right edge", () => {
    expect(css).toMatch(/\.clip-menu\{[^}]*right:0/);
  });
  it("keeps the exact 16/80/20 rail geometry on mobile", () => {
    const mobile = css.slice(css.indexOf("max-width:768px"));
    expect(mobile).toContain("right:16px");
    expect(mobile).toContain("bottom:80px");
    expect(mobile).toContain("gap:20px");
    expect(mobile).not.toContain("bottom:72px");
  });
  it("letterboxes video frames >=360px with object-fit contain", () => {
    expect(css).toContain("min-height:360px");
    expect(css).toContain("object-fit:contain");
  });
  it("keeps active rail icons white (no gold), filled glyph indicates state", () => {
    expect(css).toContain(".clip-rail-btn,.clip-rail-btn.active{color:#ffffff}");
    expect(css).not.toMatch(/\.clip-rail-btn\.active\{color:#d4af37/);
  });
  it("renders audio as a static horizontal layout (no overlay positioning)", () => {
    expect(css).toContain(".clip-overlay-static");
    const staticRail = css.slice(css.indexOf(".clip-overlay-static .clip-rail{"));
    expect(staticRail).toContain("position:static");
    expect(staticRail).toContain("flex-direction:row");
  });
});

beforeEach(() => {
  window.localStorage.clear();
});

describe("savedClips (device-only, per account)", () => {
  it("toggles and persists a save scoped to an account", () => {
    expect(isClipSaved(7, 42)).toBe(false);
    expect(toggleClipSaved(7, 42)).toBe(true);
    expect(isClipSaved(7, 42)).toBe(true);
    expect(toggleClipSaved(7, 42)).toBe(false);
    expect(isClipSaved(7, 42)).toBe(false);
  });

  it("keeps saves separate per account and clip", () => {
    toggleClipSaved(7, 42);
    expect(isClipSaved(7, 42)).toBe(true);
    expect(isClipSaved(8, 42)).toBe(false);
    expect(isClipSaved(7, 99)).toBe(false);
  });

  it("uses an anonymous bucket when no account id is present", () => {
    toggleClipSaved(null, 1);
    expect(isClipSaved(null, 1)).toBe(true);
    expect(isClipSaved(5, 1)).toBe(false);
  });
});
