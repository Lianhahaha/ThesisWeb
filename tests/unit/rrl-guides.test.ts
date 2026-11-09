import { describe, expect, it } from "vitest";
import { RRL_GUIDES, RRL_GUIDE_BY_SLUG, sourcesForGuide } from "@/lib/rrl-guides";
import sitemap from "@/app/sitemap";

describe("RRL field guides & SEO sitemap", () => {
  it("provides starter queries, tips and matching databases for every field guide", () => {
    expect(RRL_GUIDES.length).toBeGreaterThanOrEqual(8);
    for (const guide of RRL_GUIDES) {
      expect(RRL_GUIDE_BY_SLUG[guide.slug]).toBe(guide);
      expect(guide.sampleQueries.length).toBeGreaterThanOrEqual(4);
      expect(guide.tips.length).toBeGreaterThanOrEqual(2);
      expect(sourcesForGuide(guide).length).toBeGreaterThan(5);
    }
  });

  it("includes /rrl and every field guide in /sitemap.xml", () => {
    const urls = sitemap().map((entry) => entry.url);
    expect(urls.some((u) => u.endsWith("/rrl"))).toBe(true);
    for (const guide of RRL_GUIDES) {
      expect(urls.some((u) => u.endsWith(`/rrl/${guide.slug}`))).toBe(true);
    }
  });
});
