import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const source = (path: string) => readFileSync(resolve("src", path), "utf8");

describe("messenger citizen profile drawer wiring", () => {
  it("opens the shared right drawer from both room list and active conversation", () => {
    const messenger = source("components/messenger/Messenger.tsx");
    expect(messenger).toContain("<MessengerCitizenDrawer");
    expect(messenger).toContain("setDrawerUsername(peerName)");
    expect(messenger).toContain('data-testid={activeRoom.type === "direct" ? "open-active-citizen-card"');
    expect(messenger).toContain("setDrawerUsername(getPeerName(activeRoom))");
    expect(messenger).not.toContain("window.open");
  });

  it("keeps matchmaking distinct from follow and labels city location approximate", () => {
    const drawer = source("components/citizen/CitizenProfileDrawer.tsx");
    expect(drawer).toContain('section="matchmaking"');
    expect(drawer).toContain('triggerLabel="تعارف"');
    expect(drawer).toContain("إحداثيات تقريبية");
    expect(drawer).not.toMatch(/data-testid="button-dating"[\s\S]{0,240}toggleFollow/);
  });

  it("persists owner privacy from the messenger drawer only for the owner", () => {
    const bridge = source("components/citizen/MessengerCitizenDrawer.tsx");
    expect(bridge).toContain("useUpdateMyProfile()");
    expect(bridge).toContain("update.mutate(");
    expect(bridge).toContain("query.data?.isSelf ? changeVisibility : undefined");
  });
});