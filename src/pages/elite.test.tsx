import { describe, it, expect } from "vitest";
import {
  ELITE_PROFILES,
  ELITE_CAROUSEL_ORDER,
  getEliteCarousel,
  getEliteProfile,
} from "@/lib/elite-profiles";

describe("Elite profiles data integrity", () => {
  it("defines exactly 11 profiles", () => {
    expect(ELITE_PROFILES).toHaveLength(11);
    expect(ELITE_CAROUSEL_ORDER).toHaveLength(11);
  });

  it("has 11 unique slugs", () => {
    const slugs = ELITE_PROFILES.map((p) => p.slug);
    expect(new Set(slugs).size).toBe(11);
  });

  it("has 11 unique names", () => {
    const names = ELITE_PROFILES.map((p) => p.name);
    expect(new Set(names).size).toBe(11);
  });

  it("orders the carousel with Adele first, then the fixed order", () => {
    expect(getEliteCarousel().map((p) => p.slug)).toEqual([
      "adele",
      "lamine-yamal",
      "badr-hari",
      "shahrukh-khan",
      "cristiano-ronaldo",
      "yassine-bounou",
      "hakim-ziyech",
      "brad-pitt",
      "majid-al-mohandis",
      "sarah-burton",
      "yannick-alleno",
    ]);
  });

  it("includes the three required new slugs", () => {
    for (const slug of ["lamine-yamal", "sarah-burton", "yannick-alleno"]) {
      expect(getEliteProfile(slug)).toBeDefined();
    }
  });

  it("marks only Adele as the highlighted Guest of Honor", () => {
    const featured = ELITE_PROFILES.filter((p) => p.isFeatured);
    expect(featured).toHaveLength(1);
    expect(featured[0]).toMatchObject({
      slug: "adele", rating: 10, status: "GuestOfHonor",
      isFeatured: true, highlight: true,
    });
    expect(ELITE_PROFILES.some((p) => p.featured)).toBe(false);
  });

  it("every carousel slug resolves to a profile (routes are reachable)", () => {
    for (const slug of ELITE_CAROUSEL_ORDER) {
      expect(getEliteProfile(slug)).toBeDefined();
    }
  });

  it("never claims a factual 2026 award — uses Trending 2026 editorial framing", () => {
    for (const p of ELITE_PROFILES) {
      const text = p.trending2026.toLowerCase();
      expect(text).toContain("trending 2026");
      expect(text).toContain("editorial");
      // no factual award-winning claim wording
      expect(/won the 2026|2026 award winner/i.test(p.trending2026)).toBe(false);
      // no invented popularity / community-vote / follower claims
      expect(/most-followed|community|vote|fan selection|fan pick|followers/i.test(p.trending2026)).toBe(false);
    }
  });

  it("does not state Lamine's current age or claim age 17", () => {
    const lamine = getEliteProfile("lamine-yamal")!;
    const text = (lamine.bio.join(" ") + JSON.stringify(lamine.stats)).toLowerCase();
    expect(text).not.toContain("17");
    expect(text).toContain("2007");
  });

  it("does not make an unverified Michelin star-count claim for Yannick", () => {
    const chef = getEliteProfile("yannick-alleno")!;
    const text = (chef.bio.join(" ") + JSON.stringify(chef.stats)).toLowerCase();
    expect(/\b18\s*michelin/.test(text)).toBe(false);
    expect(text).toContain("pavyllon");
    expect(text).toContain("monsieur dior");
  });

  it("describes Sarah Burton as formerly McQueen, now Givenchy", () => {
    const sarah = getEliteProfile("sarah-burton")!;
    const text = (sarah.bio.join(" ") + JSON.stringify(sarah.stats)).toLowerCase();
    expect(text).toContain("mcqueen");
    expect(text).toContain("givenchy");
  });

  it("gives every profile a functional shop link (official external or GDNA shop)", () => {
    for (const p of ELITE_PROFILES) {
      expect(p.shop.href.length).toBeGreaterThan(0);
      if (p.shop.internal) {
        expect(p.shop.href.startsWith("/")).toBe(true);
        expect(p.shop.label).toContain("GDNA");
      } else {
        expect(p.shop.href.startsWith("http")).toBe(true);
      }
    }
  });

  it("uses real Wikimedia portraits (Special:FilePath), with only the documented Sarah Burton fallback empty", () => {
    for (const p of ELITE_PROFILES) {
      if (p.slug === "sarah-burton") {
        // Documented: no free-licensed portrait exists, deliberate initials fallback.
        expect(p.portrait).toBe("");
        continue;
      }
      expect(p.portrait).toContain("commons.wikimedia.org/wiki/Special:FilePath/");
      expect(p.portrait.length).toBeGreaterThan(50);
    }
  });

  it("provides accessible social links with labels for every profile", () => {
    for (const p of ELITE_PROFILES) {
      expect(p.social.length).toBeGreaterThan(0);
      for (const s of p.social) {
        expect(s.label.length).toBeGreaterThan(0);
        expect(s.href.startsWith("http")).toBe(true);
      }
    }
  });
});
