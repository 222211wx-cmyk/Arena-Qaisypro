import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, render, screen } from "@testing-library/react";
import { AuthProvider, useAuth } from "./AuthContext";
import { resetDemoUser } from "@/lib/mockData";
let state: ReturnType<typeof useAuth>;
function Reader() {
  state = useAuth();
  return <span>{state.user?.username}</span>;
}
beforeEach(() => { localStorage.clear(); resetDemoUser(); });
describe("standalone local identity", () => {
  it("renders immediately as Guest even when every network call would fail", () => {
    const fetch = vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("offline"));
    render(<AuthProvider><Reader /></AuthProvider>);
    expect(screen.getByText("Guest")).toBeTruthy();
    expect(state.loading).toBe(false);
    expect(state.authError).toBeNull();
    expect(state.user?.isAdmin).toBe(false);
    expect(fetch).not.toHaveBeenCalled();
    fetch.mockRestore();
  });
  it("persists demo names, never passwords, and resets to Guest on logout", async () => {
    const view = render(<AuthProvider><Reader /></AuthProvider>);
    await act(() => state.login("Demo Player", "never-store-me"));
    expect(screen.getByText("Demo Player")).toBeTruthy();
    expect(JSON.stringify(localStorage)).not.toContain("never-store-me");
    view.unmount();
    render(<AuthProvider><Reader /></AuthProvider>);
    expect(screen.getByText("Demo Player")).toBeTruthy();
    await act(() => state.logout());
    expect(screen.getByText("Guest")).toBeTruthy();
  });
  it("does not pretend to change real passwords or recover accounts", async () => {
    render(<AuthProvider><Reader /></AuthProvider>);
    await expect(state.changePassword("old", "new")).rejects.toThrow("no passwords");
    await expect(state.recoverAccess("token", "/")).rejects.toThrow("unavailable");
  });
});
