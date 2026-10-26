import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
vi.mock("@/contexts/LangContext", () => ({ useLang: () => ({ lang: "en" }) }));
import { ErrorBoundary } from "./ErrorBoundary";
describe("section error recovery", () => {
  it("shows the actual error and sends retry home without an API call", () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    function Section(): React.ReactNode {
      throw new Error("API returned HTML instead of JSON");
    }
    render(<ErrorBoundary><Section /></ErrorBoundary>);
    expect(screen.getByRole("alert").textContent).toBe("API returned HTML instead of JSON");
    expect(screen.getByRole("button", { name: /retry|try again/i }).getAttribute("href")).toBe("/");
    consoleError.mockRestore();
  });
});
