import { describe, expect, it } from "vitest";
import { getAutoLiteReferral, shouldAutoRedirectToLite } from "./network-detect";

describe("full messenger route preservation", () => {
  it.each(["/messagerie", "/messagerie/", "/messages", "/messages/", "/messages/123"])("never redirects %s on constrained networks or referrals", (route) => {
    expect(shouldAutoRedirectToLite(route, true, "inwi")).toBe(false);
    expect(shouldAutoRedirectToLite(route, true, null)).toBe(false);
    expect(shouldAutoRedirectToLite(route, false, "star6")).toBe(false);
  });
  it("preserves automatic Lite for other routes and clip isolation", () => {
    expect(shouldAutoRedirectToLite("/", true, null)).toBe(true);
    expect(shouldAutoRedirectToLite("/", false, "orange")).toBe(true);
    expect(shouldAutoRedirectToLite("/", false, null)).toBe(false);
    expect(shouldAutoRedirectToLite("/clips", true, "inwi")).toBe(false);
    expect(shouldAutoRedirectToLite("/clip/HELX-123456", true, null)).toBe(false);
  });
});

describe("operator referral Lite opt-in", () => {
  it.each(["inwi", "orange", "itissalat", "*6", "star6"])(
    "accepts the allow-listed %s referral",
    (ref) => expect(getAutoLiteReferral(`?ref=${encodeURIComponent(ref)}`)).toBe(ref),
  );

  it("accepts decoded star-six and normalizes harmless casing", () => {
    expect(getAutoLiteReferral("?ref=%2A6")).toBe("*6");
    expect(getAutoLiteReferral("?ref=Orange")).toBe("orange");
  });

  it.each([
    "?ref=labelpackverified",
    "?ref=unknown-network",
    "?ref=https%3A%2F%2Fevil.example",
    "?ref=%2F%2Fevil.example",
    "?other=inwi",
    "",
  ])("ignores unknown or absent referral input: %s", (search) => {
    expect(getAutoLiteReferral(search)).toBeNull();
  });
});