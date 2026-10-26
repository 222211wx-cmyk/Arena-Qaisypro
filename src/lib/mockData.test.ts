import { beforeEach, describe, expect, it, vi } from "vitest";
import { demoApi, getDemoUser, resetDemoUser, saveDemoUser, playDemoTournament, playDemoPenalty } from "./mockData";
beforeEach(() => { localStorage.clear(); resetDemoUser(); });
describe("local demo data", () => {
  it("persists guest progress across reads", () => {
    const result = playDemoTournament();
    expect(result.newBalance).toBe(1100);
    expect(getDemoUser().xp).toBe(50);
    expect(getDemoUser().gamesPlayed).toBe(1);
  });
  it("plays a complete local five-shot penalty match with no backend", () => {
    playDemoPenalty("left", true);
    for (let i = 0; i < 3; i++) playDemoPenalty("left", false);
    const result = playDemoPenalty("right", false);
    expect(result.shots).toHaveLength(5);
    expect(result.complete).toBe(true);
    expect(getDemoUser().gamesPlayed).toBe(1);
  });
  it("refuses stored admin privileges", () => {
    saveDemoUser({ ...getDemoUser(), isAdmin: true });
    expect(getDemoUser().isAdmin).toBe(false);
  });
  it("works with unavailable or corrupt localStorage", () => {
    localStorage.setItem("arena:demo:session:v1", "<html>");
    expect(getDemoUser().username).toBe("Guest");
    const spy = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => { throw new Error("denied"); });
    expect(playDemoTournament().coinsEarned).toBe(100);
    spy.mockRestore();
  });
  it("returns sample leaderboard and tournaments", async () => {
    expect((await (await demoApi("/api/leaderboard")).json()).players.length).toBeGreaterThan(0);
    expect((await (await demoApi("/api/tournaments")).json()).tournaments.length).toBeGreaterThan(0);
  });
  it("claims daily demo coins once", async () => {
    const first = await (await demoApi("/api/rewards/daily", "POST")).json();
    const second = await (await demoApi("/api/rewards/daily", "POST")).json();
    expect(first.coinsEarned).toBe(100);
    expect(second.coinsEarned).toBe(0);
  });
  it("preserves the games age declaration without a server", async () => {
    await demoApi("/api/auth/birth-date", "POST", { birthDate: "2020-01-01" });
    expect(getDemoUser().isAdult).toBe(false);
    await demoApi("/api/auth/birth-date", "POST", { birthDate: "1990-01-01" });
    expect(getDemoUser().isAdult).toBe(true);
  });
});
