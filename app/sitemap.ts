import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";
import { RRL_GUIDES } from "@/lib/rrl-guides";
import { GUIDES } from "@/lib/guides";

/**
 * /sitemap.xml: the public pages, for Google and Bing. Submit it once in
 * Google Search Console (README). Personal pages (library, settings, paper
 * pages, shared libraries) are left out on purpose.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const pages: { path: string; priority: number; changeFrequency: "weekly" | "monthly" | "yearly" }[] = [
    { path: "/", priority: 1, changeFrequency: "weekly" },
    { path: "/search", priority: 0.9, changeFrequency: "weekly" },
    { path: "/topic", priority: 0.7, changeFrequency: "monthly" },
    { path: "/rrl", priority: 0.9, changeFrequency: "weekly" },
    ...RRL_GUIDES.map((g) => ({
      path: `/rrl/${g.slug}`,
      priority: 0.85,
      changeFrequency: "weekly" as const,
    })),
    { path: "/guides", priority: 0.9, changeFrequency: "weekly" },
    ...GUIDES.map((g) => ({
      path: `/guides/${g.slug}`,
      priority: 0.8,
      changeFrequency: "monthly" as const,
    })),
    { path: "/cite", priority: 0.8, changeFrequency: "monthly" },
    { path: "/databases", priority: 0.7, changeFrequency: "monthly" },
    { path: "/about", priority: 0.6, changeFrequency: "monthly" },
    { path: "/privacy", priority: 0.2, changeFrequency: "yearly" },
    { path: "/terms", priority: 0.2, changeFrequency: "yearly" },
  ];
  return pages.map(({ path, priority, changeFrequency }) => ({
    url: `${SITE_URL}${path === "/" ? "" : path}`,
    lastModified: new Date(),
    changeFrequency,
    priority,
  }));
}
