import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, render, screen, waitFor } from "@testing-library/react";
import { type ReactNode, useEffect } from "react";
import { AuthProvider, useAuth } from "./AuthContext";

vi.mock("@/lib/call-firebase", () => ({ PUSH_LOGOUT_EVENT: "gdna:logout" }));
vi.mock("@/lib/network", () => ({ apiPath: (path: string) => path }));

const citizen = { id: 42, username: "Citizen Name", balance: 0, xp: 0, gamesPlayed: 0, wins: 0, canClaimDaily: true, isAdult: true };
let state: ReturnType<typeof useAuth>;
function Reader() {
  state = useAuth();
  return <span data-testid="identity">{state.user?.username ?? "guest"}</span>;
}
function mount(children: ReactNode = <Reader />) {
  return render(<AuthProvider>{children}</AuthProvider>);
}

beforeEach(() => {
  vi.restoreAllMocks();
});
afterEach(() => {
  delete window.umami;
});

describe("authoritative web session", () => {
  it.each(["login", "register"] as const)("tracks successful %s without credentials or profile data", async (action) => {
    const track = vi.fn();
    window.umami = { track };
    vi.stubGlobal("fetch", vi.fn()
      .mockResolvedValueOnce(Response.json(citizen))
      .mockResolvedValueOnce(Response.json(citizen)));
    mount();
    await screen.findByTestId("identity");
    expect(track).not.toHaveBeenCalled();
    await act(async () => {
      if (action === "login") await state.login("Citizen Name", "secret");
      else await state.register("Citizen Name", "secret", "2000-01-01");
    });
    expect(track).toHaveBeenCalledExactlyOnceWith(`auth_${action}_success`, { method: "password" });
  });

  it("waits for /me before rendering any account-dependent section", async () => {
    let finish!: (value: Response) => void;
    vi.stubGlobal("fetch", vi.fn(() => new Promise<Response>(resolve => { finish = resolve; })));
    mount();
    expect(screen.queryByTestId("identity")).toBeNull();
    await act(async () => finish(Response.json(citizen)));
    expect(screen.getByTestId("identity").textContent).toBe(citizen.username);
  });

  it("distinguishes a temporary outage from a revoked session and allows retry", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(Response.json({ error: "unavailable" }, { status: 503 }))
      .mockResolvedValueOnce(Response.json(citizen))
      .mockResolvedValueOnce(Response.json({ error: "unavailable" }, { status: 503 }))
      .mockResolvedValueOnce(Response.json({ error: "Not authenticated" }, { status: 401 }));
    vi.stubGlobal("fetch", fetchMock);
    mount();
    await screen.findByRole("alert");
    expect(screen.queryByTestId("identity")).toBeNull();
    await act(async () => { await screen.getByRole("button", { name: "إعادة المحاولة" }).click(); });
    await waitFor(() => expect(screen.getByTestId("identity").textContent).toBe(citizen.username));
    await act(async () => { await state.refreshUser(); });
    expect(state.user?.username).toBe(citizen.username);
    expect(screen.getByTestId("identity").textContent).toBe(citizen.username);
    await act(async () => { await state.refreshUser(); });
    expect(screen.getByTestId("identity").textContent).toBe("guest");
  });

  it("never strips internal username whitespace and does not clear identity on failed login", async () => {
    const track = vi.fn();
    window.umami = { track };
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(Response.json(citizen))
      .mockResolvedValueOnce(Response.json({ error: "Incorrect credentials" }, { status: 401 }));
    vi.stubGlobal("fetch", fetchMock);
    mount();
    await screen.findByTestId("identity");
    await act(async () => {
      await expect(state.login(" Citizen Name ", "wrong")).rejects.toThrow("Incorrect credentials");
    });
    expect(state.user?.id).toBe(citizen.id);
    expect(JSON.parse(fetchMock.mock.calls[1][1].body).username).toBe("Citizen Name");
    expect(track).not.toHaveBeenCalled();
  });

  it("does not unmount active sections during routine session refresh", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(Response.json(citizen))
      .mockResolvedValueOnce(Response.json({ error: "unavailable" }, { status: 503 }))
      .mockResolvedValueOnce(Response.json(citizen));
    vi.stubGlobal("fetch", fetchMock);
    const unmounted = vi.fn();
    function LiveSection() {
      useEffect(() => () => unmounted(), []);
      return <Reader />;
    }
    mount(<LiveSection />);
    await screen.findByTestId("identity");
    await act(async () => { await state.refreshUser(); });
    expect(unmounted).not.toHaveBeenCalled();
    expect(screen.getByTestId("identity").textContent).toBe(citizen.username);
    await act(async () => { await state.refreshUser(); });
    expect(unmounted).not.toHaveBeenCalled();
  });
});