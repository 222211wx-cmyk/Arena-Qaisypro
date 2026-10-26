import { describe, expect, it } from "vitest";
import { decryptMessagePayload, isE2EMessage } from "./amis-e2ee";

describe("AMIS E2EE message marker", () => {
  it("recognises only the current compact envelope prefix", () => {
    expect(isE2EMessage("e2e:v1:abc")).toBe(true);
    expect(isE2EMessage("e2e:v2:abc")).toBe(false);
    expect(isE2EMessage("plain text")).toBe(false);
  });

  it("leaves plaintext messages untouched without needing crypto storage", async () => {
    await expect(decryptMessagePayload("hello, citizen", 42)).resolves.toBeNull();
  });
});