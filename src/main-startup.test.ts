import { afterEach, expect, it, vi } from "vitest";

afterEach(() => {
  vi.doUnmock("./app-entry");
  vi.restoreAllMocks();
  localStorage.removeItem("gdna.limitedData");
  window.history.replaceState(null, "", "/");
});

it("keeps full messages under Lite conditions and exposes recovery if its module fails", async () => {
  vi.resetModules();
  vi.spyOn(console, "error").mockImplementation(() => {});
  localStorage.setItem("gdna.limitedData", "true");
  window.history.replaceState(null, "", "/messages?ref=inwi");
  document.body.innerHTML = '<div id="root"></div>';
  vi.doMock("./app-entry", () => { throw new Error("Simulated interrupted module download"); });
  await import("./main");
  await vi.waitFor(() => {
    expect(document.querySelector('[data-testid="app-startup-error"] [role="alert"]')).not.toBeNull();
  });
  expect(document.querySelector('[data-testid="app-startup-retry"]')?.textContent).toBe("إعادة المحاولة");
  expect(window.location.pathname).toBe("/messages");
  expect(localStorage.getItem("gdna.limitedData")).toBe("true");
});