import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
vi.mock("@/contexts/LangContext", () => ({ useLang: () => ({ lang: "en" }) }));
import { ErrorBoundary } from "./ErrorBoundary";
describe("section error recovery", () => {
  it("shows the actual error and remounts children on retry", () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    let failing = true;
    function Section() {
      if (failing) throw new Error("API returned HTML instead of JSON");
      return <p>Section recovered</p>;
    }
    render(<ErrorBoundary><Section /></ErrorBoundary>);
    expect(screen.getByRole("alert").textContent).toBe("API returned HTML instead of JSON");
    failing = false;
    fireEvent.click(screen.getByRole("button", { name: /retry|try again/i }));
    expect(screen.getByText("Section recovered")).toBeTruthy();
    consoleError.mockRestore();
  });
});
