import { afterEach, describe, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { createRef } from "react";
import { tokens } from "@workspace/gdna-ds/tokens";
import { Button } from "@workspace/gdna-ds/components/ui/button";
import { Checkbox } from "@workspace/gdna-ds/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "@workspace/gdna-ds/components/ui/dialog";
import { PortalContainerProvider } from "@workspace/gdna-ds/lib/portal-container";
import { clipOverlayCss } from "../../components/clips/clipOverlayStyles";
afterEach(cleanup);
const uiModules = import.meta.glob("./components/ui/*.tsx", { eager: true });
describe("standalone design system", () => {
  it("loads every compatibility UI module", () => {
    expect(Object.keys(uiModules).length).toBe(24);
    for (const module of Object.values(uiModules))
      expect(Object.keys(module as object).length).toBeGreaterThan(0);
  });
  it("provides CSS-ready palettes for isolated clip routes", () => {
    for (const palette of [tokens.color.dark, tokens.color.light]) {
      expect(Object.keys(palette)).toEqual(Object.keys(tokens.color.dark));
      for (const value of Object.values(palette))
        expect(value).toMatch(/^#[a-f\d]{3,8}$/i);
      const css = clipOverlayCss(palette, tokens.spacing);
      expect(css).not.toContain("undefined");
      expect(css).not.toContain("[object Object]");
    }
    expect(tokens.spacing).toMatch(/^\d*\.?\d+rem$/);
    expect(tokens.radius).toMatch(/^\d*\.?\d+rem$/);
    expect(tokens.fontFamily.sans.join(",")).toContain("sans-serif");
  });
  it("supports asChild navigation and forwarded button refs", () => {
    const ref = createRef<HTMLButtonElement>();
    render(
      <>
        <Button asChild>
          <a href="/elite">Elite</a>
        </Button>
        <Button ref={ref}>Action</Button>
      </>,
    );
    expect(screen.getByRole("link").getAttribute("href")).toBe("/elite");
    expect(ref.current).toBe(screen.getByRole("button"));
  });
  it("keeps checkbox state interactive", () => {
    render(<Checkbox aria-label="Consent" />);
    const checkbox = screen.getByRole("checkbox");
    expect(checkbox.getAttribute("aria-checked")).toBe("false");
    fireEvent.click(checkbox);
    expect(checkbox.getAttribute("aria-checked")).toBe("true");
  });
  it("portals dialogs inside the supplied fullscreen host", () => {
    const host = document.createElement("div");
    document.body.appendChild(host);
    render(
      <PortalContainerProvider container={host}>
        <Dialog>
          <DialogTrigger>Open details</DialogTrigger>
          <DialogContent>
            <DialogTitle>Details</DialogTitle>
            <DialogDescription>More information</DialogDescription>
          </DialogContent>
        </Dialog>
      </PortalContainerProvider>,
    );
    fireEvent.click(screen.getByText("Open details"));
    expect(host.contains(screen.getByRole("dialog"))).toBe(true);
    fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" });
    expect(screen.queryByRole("dialog")).toBeNull();
    cleanup();
    host.remove();
  });
});
