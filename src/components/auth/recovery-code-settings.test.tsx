import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { isRecoveryCodeExpiringSoon, recoveryReminderCopy, recoveryReminderPreferenceKey } from "../../../../../lib/recovery-code-reminder";
import { RecoveryCodeSettings } from "./recovery-code-settings";

const state = vi.hoisted(() => ({
  user: { id: 100 },
  lang: "en",
  data: { active: true, expiresAt: "" } as { active: boolean; expiresAt: string | null },
  isSuccess: true, isFetching: false, isError: false, isLoading: false,
  generate: vi.fn(), remove: vi.fn(), refetch: vi.fn(),
}));
vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => ({ user: state.user }) }));
vi.mock("@/contexts/LangContext", () => ({ useLang: () => ({ lang: state.lang }) }));
vi.mock("@workspace/api-client-react", () => ({
  getGetRecoveryCodeStatusQueryKey: () => ["/auth/recovery-code/status"],
  useGetRecoveryCodeStatus: () => ({ ...state, refetch: state.refetch }),
  generateRecoveryCode: state.generate,
  removeRecoveryCode: state.remove,
}));

const day = 86_400_000;
const expiresIn = (days: number) => new Date(Date.now() + day * days).toISOString();
function mount() {
  return render(<QueryClientProvider client={new QueryClient()}>
    <RecoveryCodeSettings key={state.user.id} />
  </QueryClientProvider>);
}

beforeEach(() => {
  vi.stubGlobal("ResizeObserver", class { observe() {} unobserve() {} disconnect() {} });
  vi.clearAllMocks();
  localStorage.clear();
  state.user = { id: 100 };
  state.lang = "en";
  state.data = { active: true, expiresAt: expiresIn(10) };
  state.isSuccess = true; state.isFetching = false; state.isError = false; state.isLoading = false;
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });

describe("recovery expiry policy", () => {
  it("includes exactly 30 days but never invalid, missing, inactive or expired codes", () => {
    const now = Date.now();
    const status = (ms: number) => ({ active: true, expiresAt: new Date(now + ms).toISOString() });
    expect(isRecoveryCodeExpiringSoon(status(30 * day), now)).toBe(true);
    expect(isRecoveryCodeExpiringSoon(status(30 * day + 1), now)).toBe(false);
    expect(isRecoveryCodeExpiringSoon(status(1), now)).toBe(true);
    expect(isRecoveryCodeExpiringSoon(status(0), now)).toBe(false);
    expect(isRecoveryCodeExpiringSoon(status(-1), now)).toBe(false);
    expect(isRecoveryCodeExpiringSoon(undefined, now)).toBe(false);
    expect(isRecoveryCodeExpiringSoon({ active: true, expiresAt: null }, now)).toBe(false);
    expect(isRecoveryCodeExpiringSoon({ active: true, expiresAt: "invalid" }, now)).toBe(false);
    expect(isRecoveryCodeExpiringSoon({ ...status(day), active: false }, now)).toBe(false);
  });
});

describe("settings-only opt-in reminder", () => {
  it("defaults off, persists explicit opt-in, and supports opting out", () => {
    let view = mount();
    expect(screen.queryByTestId("alert-recovery-code-expiry")).toBeNull();
    fireEvent.click(screen.getByTestId("checkbox-recovery-expiry-reminder"));
    expect(screen.getByTestId("alert-recovery-code-expiry")).toBeTruthy();
    expect(localStorage.getItem(recoveryReminderPreferenceKey(100))).toBe("true");
    view.unmount();
    view = mount();
    expect(screen.getByTestId("alert-recovery-code-expiry")).toBeTruthy();
    fireEvent.click(screen.getByTestId("checkbox-recovery-expiry-reminder"));
    expect(screen.queryByTestId("alert-recovery-code-expiry")).toBeNull();
    expect(localStorage.getItem(recoveryReminderPreferenceKey(100))).toBe("false");
    expect(state.generate).not.toHaveBeenCalled();
    expect(state.remove).not.toHaveBeenCalled();
  });

  it("only opens password confirmation; no mutation before explicit valid submission", async () => {
    localStorage.setItem(recoveryReminderPreferenceKey(100), "true");
    state.generate.mockResolvedValue({ code: "ONE-TIME-TEST-CODE", expiresAt: expiresIn(365) });
    mount();
    fireEvent.click(screen.getByTestId("button-recovery-code-expiry-replace"));
    expect(document.activeElement).toBe(screen.getByTestId("input-recovery-code-password"));
    expect(state.generate).not.toHaveBeenCalled();
    expect(screen.queryByTestId("alert-recovery-code-expiry")).toBeNull();
    fireEvent.submit(screen.getByTestId("form-recovery-code-generate"));
    expect(state.generate).not.toHaveBeenCalled();
    fireEvent.change(screen.getByTestId("input-recovery-code-password"), { target: { value: "test-password" } });
    fireEvent.submit(screen.getByTestId("form-recovery-code-generate"));
    expect(state.generate).not.toHaveBeenCalled(); // acknowledgement still required
    fireEvent.click(screen.getByTestId("checkbox-recovery-code-ack"));
    await act(async () => fireEvent.submit(screen.getByTestId("form-recovery-code-generate")));
    expect(state.generate).toHaveBeenCalledOnce();
    expect(state.generate.mock.calls[0][0]).toEqual({ currentPassword: "test-password" });
    expect(localStorage.getItem(recoveryReminderPreferenceKey(100))).toBe("true");
    expect(JSON.stringify(localStorage)).not.toContain("ONE-TIME-TEST-CODE");
    expect(screen.queryByTestId("alert-recovery-code-expiry")).toBeNull();
  });

  it.each(["ar", "en", "fr", "es", "de"])("provides reminder and replacement text in %s", lang => {
    state.lang = lang;
    localStorage.setItem(recoveryReminderPreferenceKey(100), "true");
    mount();
    const copy = recoveryReminderCopy(lang);
    expect(screen.getByTestId("alert-recovery-code-expiry").textContent).toContain(copy.warning.split("{date}")[0]);
    expect(screen.getByTestId("button-recovery-code-expiry-replace").textContent).toBe(copy.replace);
    expect(screen.getByTestId("card-recovery-code-settings").getAttribute("dir")).toBe(lang === "ar" ? "rtl" : "ltr");
  });

  it.each(["far-future", "expired", "inactive", "missing", "invalid", "loading", "error", "refreshing"])("hides reminder for %s status", kind => {
    localStorage.setItem(recoveryReminderPreferenceKey(100), "true");
    if (kind === "far-future") state.data.expiresAt = expiresIn(365);
    if (kind === "expired") state.data.expiresAt = expiresIn(-1);
    if (kind === "inactive") state.data.active = false;
    if (kind === "missing") state.data.expiresAt = null;
    if (kind === "invalid") state.data.expiresAt = "bad-date";
    if (kind === "loading") { state.isSuccess = false; state.isLoading = true; }
    if (kind === "error") { state.isSuccess = false; state.isError = true; }
    if (kind === "refreshing") state.isFetching = true;
    mount();
    expect(screen.queryByTestId("alert-recovery-code-expiry")).toBeNull();
  });

  it("does not transfer opt-in between accounts", () => {
    localStorage.setItem(recoveryReminderPreferenceKey(100), "true");
    mount().unmount();
    state.user = { id: 101 };
    mount();
    expect(screen.queryByTestId("alert-recovery-code-expiry")).toBeNull();
  });

  it("honors opt-out from another tab", () => {
    localStorage.setItem(recoveryReminderPreferenceKey(100), "true");
    mount();
    localStorage.setItem(recoveryReminderPreferenceKey(100), "false");
    act(() => window.dispatchEvent(new StorageEvent("storage", { key: recoveryReminderPreferenceKey(100) })));
    expect(screen.queryByTestId("alert-recovery-code-expiry")).toBeNull();
  });

  it("reports storage failures without pretending the preference was saved", () => {
    mount();
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => { throw new Error("blocked"); });
    fireEvent.click(screen.getByTestId("checkbox-recovery-expiry-reminder"));
    expect(screen.getByText(recoveryReminderCopy("en").storageError)).toBeTruthy();
    expect(screen.queryByTestId("alert-recovery-code-expiry")).toBeNull();
  });
});