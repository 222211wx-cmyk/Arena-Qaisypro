import { afterEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, render, screen, waitFor } from "@testing-library/react";
import { AuthProvider, useAuth } from "./AuthContext";
let state: ReturnType<typeof useAuth>;
function Reader() {
  state = useAuth();
  return <span>{state.user?.username ?? "Full Arena guest"}</span>;
}
afterEach(() => { cleanup(); vi.restoreAllMocks(); });
describe("verified identity without blocking the full shell", () => {
  it("renders the shell on backend failure without creating a fake Guest identity", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("offline"));
    render(<AuthProvider><Reader /></AuthProvider>);
    expect(screen.getByText("Full Arena guest")).toBeTruthy();
    await waitFor(() => expect(state.loading).toBe(false));
    expect(state.user).toBeNull();
    expect(state.authError).toBe("offline");
  });
  it("does not authenticate rejected credentials or persist them locally", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response('{"error":"unauthorized"}', { status: 401 }));
    render(<AuthProvider><Reader /></AuthProvider>);
    await waitFor(() => expect(state.loading).toBe(false));
    await act(async () => { await expect(state.login("Player", "never-store-me")).rejects.toThrow("HTTP 401"); });
    expect(state.user).toBeNull();
    expect(JSON.stringify(localStorage)).not.toContain("never-store-me");
  });
  it("uses only the identity returned by the backend", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation(async () => Response.json({ id: 7, username: "Citizen" }));
    render(<AuthProvider><Reader /></AuthProvider>);
    await waitFor(() => expect(state.user?.id).toBe(7));
    expect(screen.getByText("Citizen")).toBeTruthy();
  });
});
