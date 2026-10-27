import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { DIRECTORY, HOME_DIRECTORY } from "./config/platform-directory";
const source = (path: string) => readFileSync(path, "utf8");
describe("full Arena preservation", () => {
  it("keeps every public section with requested directory endpoints", () => {
    expect(HOME_DIRECTORY[0].id).toBe("leaderboard");
    expect(HOME_DIRECTORY.at(-1)?.id).toBe("messages");
    expect(new Set(HOME_DIRECTORY.map(section => section.id))).toEqual(new Set(DIRECTORY.map(section => section.id)));
    const remaining = DIRECTORY.filter(s => !["leaderboard", "messages"].includes(s.id));
    expect(HOME_DIRECTORY.slice(1, -1)).toEqual([...remaining].reverse());
  });
  it("restores stats, bots, elite, gates, directory and citizenship sections", () => {
    const home = source("src/pages/home.tsx");
    for (const component of ["<StatsBar />", "<EliteCarousel />", "<PlatformLauncher />", "<HomeCitizenSection />"]) expect(home).toContain(component);
    expect(home).toContain("[...HOME_BOTS].reverse().map");
    expect(home).toContain("[...PORTALS].reverse().map");
    expect(source("src/App.tsx")).toContain("!isChoiceEntry && !isMessagesEntry && <Footer />");
  });
  it("orders both live and upcoming events newest first", () => {
    const events = source("src/pages/events.tsx");
    expect(events).toContain("new Date(b.eventDate).getTime() - new Date(a.eventDate).getTime()");
    expect(events.match(/sort\(newestFirst\)/g)).toHaveLength(2);
  });
});
