import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

/**
 * /robots.txt: crawl everything but the API. Personal pages (library,
 * settings, paper pages, shared libraries) stay out of results through their
 * own "noindex" tag, which a crawler can only read if it may fetch the page;
 * blocking them here could get a shared link listed as a bare address.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/api/"] }],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
