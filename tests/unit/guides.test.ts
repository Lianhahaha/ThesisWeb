import { describe, expect, it } from "vitest";
import { GUIDE_BY_SLUG, GUIDES, GUIDE_CATEGORIES, guidesByCategory, relatedGuides } from "@/lib/guides";
import sitemap from "@/app/sitemap";

describe("SEO writing guides", () => {
  it("publishes at least 20 complete, unique guides", () => {
    expect(GUIDES.length).toBeGreaterThanOrEqual(20);
    expect(new Set(GUIDES.map((g) => g.slug)).size).toBe(GUIDES.length);

    for (const guide of GUIDES) {
      expect(GUIDE_BY_SLUG[guide.slug], guide.slug).toBe(guide);
      expect(guide.title.length, guide.slug).toBeGreaterThan(20);
      expect(guide.description.length, guide.slug).toBeGreaterThan(80);
      expect(guide.intro.length, guide.slug).toBeGreaterThan(0);
      expect(guide.sections.length, guide.slug).toBeGreaterThanOrEqual(4);
      expect(guide.faqs.length, guide.slug).toBeGreaterThanOrEqual(2);
      expect(guide.searches.length, guide.slug).toBeGreaterThanOrEqual(2);
      expect(guide.keywords.length, guide.slug).toBeGreaterThanOrEqual(4);
      expect(relatedGuides(guide).length, guide.slug).toBeGreaterThanOrEqual(2);
    }
  });

  it("gives every category at least one guide", () => {
    for (const category of GUIDE_CATEGORIES) {
      expect(guidesByCategory(category).length, category).toBeGreaterThan(0);
    }
  });

  it("includes /guides and every guide in /sitemap.xml", () => {
    const urls = sitemap().map((entry) => entry.url);
    expect(urls.some((u) => u.endsWith("/guides"))).toBe(true);
    for (const guide of GUIDES) {
      expect(urls.some((u) => u.endsWith(`/guides/${guide.slug}`)), guide.slug).toBe(true);
    }
  });
});
