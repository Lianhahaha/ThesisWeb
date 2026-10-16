import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

/**
 * /sitemap.xml: the public pages, for Google and Bing. Submit it once in
 * Google Search Console (README). Personal pages (library, settings, paper
 * pages, shared libraries) are left out on purpose.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const pages: { path: string; priority: number; changeFrequency: "weekly" | "monthly" | "yearly" }[] = [
    { path: "/", priority: 1, changeFrequency: "weekly" },
    { path: "/search", priority: 0.9, changeFrequency: "weekly" },
    { path: "/cite", priority: 0.8, changeFrequency: "monthly" },
    { path: "/databases", priority: 0.7, changeFrequency: "monthly" },
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
