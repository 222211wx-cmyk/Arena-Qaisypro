import { describe, it, expect } from "vitest";
import { parseRoute, href, editionOf } from "./router";

// import.meta.env.BASE_URL defaults to "/" under vitest.

describe("parseRoute — editions and reserved names", () => {
  it("resolves /lite to the default home", () => {
    expect(parseRoute("/lite")).toEqual({ kind: "home", edition: "default" });
  });

  it("resolves region editions, not usernames", () => {
    expect(parseRoute("/lite/in")).toEqual({ kind: "home", edition: "in" });
    expect(parseRoute("/lite/africa")).toEqual({ kind: "home", edition: "africa" });
    expect(parseRoute("/lite/brasil")).toEqual({ kind: "home", edition: "brasil" });
  });

  it("reserves section names from the username alias", () => {
    expect(parseRoute("/lite/market")).toEqual({ kind: "market" });
    expect(parseRoute("/lite/clips")).toEqual({ kind: "clips" });
    expect(parseRoute("/lite/hisn")).toEqual({ kind: "hisn" });
    expect(parseRoute("/lite/settings")).toEqual({ kind: "settings" });
    expect(parseRoute("/lite/operators")).toEqual({ kind: "operators" });
    expect(parseRoute("/lite/data")).toEqual({ kind: "data" });
    expect(parseRoute("/lite/login")).toEqual({ kind: "login" });
  });

  it("resolves the /lite/u/:username canonical profile", () => {
    expect(parseRoute("/lite/u/qaisy")).toEqual({ kind: "profile", username: "qaisy" });
  });

  it("resolves the /lite/:username alias for non-reserved names", () => {
    expect(parseRoute("/lite/qaisy")).toEqual({ kind: "profile", username: "qaisy" });
  });

  it("does not treat a reserved name as a username via the alias", () => {
    // "in" is a region, not a citizen.
    expect(parseRoute("/lite/in")).not.toEqual({ kind: "profile", username: "in" });
  });

  it("does not let /lite/u/<reserved> become a reserved-name profile", () => {
    // A reserved name after /u falls through to default home rather than profile.
    expect(parseRoute("/lite/u/market")).toEqual({ kind: "home", edition: "default" });
  });

  it("parses a room id for messages", () => {
    expect(parseRoute("/lite/messages")).toEqual({ kind: "messages", roomId: undefined });
    expect(parseRoute("/lite/messages/42")).toEqual({ kind: "messages", roomId: 42 });
  });
});

describe("href / editionOf round-trip", () => {
  it("builds hrefs that parse back to the same route", () => {
    const routes = [
      { kind: "home", edition: "default" } as const,
      { kind: "home", edition: "in" } as const,
      { kind: "market" } as const,
      { kind: "clips" } as const,
      { kind: "hisn" } as const,
      { kind: "messages", roomId: 7 } as const,
      { kind: "settings" } as const,
      { kind: "operators" } as const,
      { kind: "data" } as const,
      { kind: "login" } as const,
      { kind: "profile", username: "qaisy" } as const,
    ];
    for (const r of routes) {
      expect(parseRoute(href(r))).toEqual(r);
    }
  });

  it("editionOf reports the edition for home and default elsewhere", () => {
    expect(editionOf({ kind: "home", edition: "africa" })).toBe("africa");
    expect(editionOf({ kind: "market" })).toBe("default");
  });
});
