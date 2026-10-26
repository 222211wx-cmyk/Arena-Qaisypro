import { afterEach, describe, expect, it } from "vitest";
import {
  PUSH_INSTALLATION_STORAGE_KEY,
  pushInstallationId,
  shouldRevokePushRegistration,
} from "./call-firebase";

describe("FCM registration lifecycle", () => {
  afterEach(() => {
    window.localStorage.removeItem(PUSH_INSTALLATION_STORAGE_KEY);
  });

  it("keeps one installation id across hook remounts and reload-like calls", () => {
    const first = pushInstallationId();
    const second = pushInstallationId();

    expect(first).toMatch(/^[A-Za-z0-9_-]{16,128}$/);
    expect(second).toBe(first);
    expect(window.localStorage.getItem(PUSH_INSTALLATION_STORAGE_KEY)).toBe(first);
  });

  it("does not revoke on unmount, but does revoke on explicit logout", () => {
    expect(shouldRevokePushRegistration()).toBe(false);
    expect(shouldRevokePushRegistration(false)).toBe(false);
    expect(shouldRevokePushRegistration(true)).toBe(true);
  });
});