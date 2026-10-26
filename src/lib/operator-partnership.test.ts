import { describe, it, expect, afterEach, vi } from "vitest";
import {
  fetchOperatorPacks,
  recordReferral,
  submitContact,
  fetchPartnerStats,
  fetchPartnerDashboard,
  parseReferral,
  basisLabel,
  OperatorApiError,
} from "./operator-partnership";

afterEach(() => vi.restoreAllMocks());

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("parseReferral", () => {
  it("accepts the three known sources, case-insensitively", () => {
    expect(parseReferral("inwi")).toBe("inwi");
    expect(parseReferral("ORANGE")).toBe("orange");
    expect(parseReferral(" itissalat ")).toBe("itissalat");
  });
  it("rejects unknown sources", () => {
    expect(parseReferral("verizon")).toBeNull();
    expect(parseReferral(null)).toBeNull();
    expect(parseReferral("")).toBeNull();
  });
});

describe("basisLabel", () => {
  it("labels every basis honestly", () => {
    expect(basisLabel("measured")).toBe("Measured");
    expect(basisLabel("estimated")).toBe("Estimated");
    expect(basisLabel("unproven")).toBe("Unproven");
  });
});

describe("API client — contract shapes", () => {
  it("GET packs reads the contract shape (unverified/indicative honoured)", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        jsonResponse({
          updatedAt: null,
          packs: [
            {
              id: "inwi-20",
              operator: "Inwi",
              userPrice: "20 DH",
              priceBasis: "indicative",
              verified: false,
              proofUrl: null,
              ussd: "*6#",
              ussdVerified: false,
              dataAllowance: null,
              notes: "User-reported, indicative.",
            },
          ],
        }),
      ),
    );
    const res = await fetchOperatorPacks();
    expect(res.packs[0].verified).toBe(false);
    expect(res.packs[0].priceBasis).toBe("indicative");
    expect(res.packs[0].ussd).toBe("*6#");
  });

  it("referral records attribution only (commission 0, no provisioning)", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse({ recorded: true, ref: "inwi", commission: 0, provisionsPack: false }, 201),
    );
    vi.stubGlobal("fetch", fetchMock);
    const res = await recordReferral("inwi");
    expect(res.commission).toBe(0);
    expect(res.provisionsPack).toBe(false);
    const body = JSON.parse(fetchMock.mock.calls[0][1].body as string);
    expect(body.ref).toBe("inwi");
  });

  it("submitContact posts the required fields and returns saved:true", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ saved: true, id: 7 }, 201));
    vi.stubGlobal("fetch", fetchMock);
    const res = await submitContact({
      name: "Amina",
      org: "Telco",
      email: "a@t.co",
      operator: "Inwi",
      message: "We would like to discuss a partnership.",
    });
    expect(res.saved).toBe(true);
    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toContain("/api/partners/contact");
    const body = JSON.parse(init.body as string);
    expect(body).toMatchObject({ name: "Amina", org: "Telco", email: "a@t.co", operator: "Inwi" });
  });

  it("surfaces 400 field errors from contact", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(jsonResponse({ error: "invalid", fields: { email: "invalid" } }, 400)),
    );
    await expect(
      submitContact({ name: "x", org: "y", email: "bad", operator: "Other", message: "zzzzzzzzzz" }),
    ).rejects.toMatchObject({ status: 400, fields: { email: "invalid" } });
  });

  it("partner stats keep every metric labelled with basis + method", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        jsonResponse({
          period: null,
          metrics: [
            { key: "uptime", label: "Uptime", value: null, unit: "percent", basis: "measured", sampleSize: 0, method: "probes" },
          ],
          referrals: { inwi: 0, orange: 0, itissalat: 0 },
          empty: true,
        }),
      ),
    );
    const s = await fetchPartnerStats();
    expect(s.empty).toBe(true);
    expect(s.metrics[0].value).toBeNull();
    expect(s.metrics[0].basis).toBe("measured");
    expect(s.metrics[0].method).toBeTruthy();
  });

  it("dashboard raises a typed 403 for non-admins", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse({ error: "forbidden" }, 403)));
    await expect(fetchPartnerDashboard()).rejects.toBeInstanceOf(OperatorApiError);
    await expect(fetchPartnerDashboard()).rejects.toMatchObject({ status: 403 });
  });
});
