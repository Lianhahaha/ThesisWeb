import type { Metadata } from "next";
import { SOURCE_COUNT } from "@/lib/sources/meta";

/**
 * The site's public address and the words search engines and link previews
 * show. NEXT_PUBLIC_SITE_URL overrides the address (a custom domain later).
 */
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "https://thesiswebph.vercel.app").replace(/\/$/, "");
export const SITE_NAME = "Thesisweb";
export const SITE_TAGLINE = "Free RRL finder for thesis students";
export const SITE_DESCRIPTION =
  `Find related literature (RRL) for your thesis in one search across ${SOURCE_COUNT} free academic databases, ` +
  "including Philippine theses and journals. Save papers, fill a synthesis matrix, and cite in APA, MLA, IEEE or Chicago. Free, no sign-up needed.";

/** The share card that app/opengraph-image.tsx draws. */
export const SITE_IMAGE = { url: "/opengraph-image", width: 1200, height: 630, alt: `${SITE_NAME}: ${SITE_TAGLINE}` };

/** Link-preview fields every page shares. */
export const SITE_OPEN_GRAPH = { type: "website" as const, siteName: SITE_NAME, locale: "en_PH", images: [SITE_IMAGE] };

/**
 * Title, description, canonical address and link preview for a public page.
 * A page that sets its own openGraph replaces the parent's whole block, so
 * the shared fields (site name, card image) are filled in here every time.
 */
export function pageMetadata({ title, description, path }: { title: string; description: string; path: string }): Metadata {
  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: { ...SITE_OPEN_GRAPH, title, description, url: path },
    twitter: { card: "summary_large_image", title, description, images: [SITE_IMAGE] },
  };
}

/**
 * Structured data for search engines: the site, with a search box Google may
 * show under the result, and the app itself as a free educational tool.
 */
export const SITE_JSON_LD = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebSite",
      "@id": `${SITE_URL}/#website`,
      url: SITE_URL,
      name: SITE_NAME,
      description: SITE_DESCRIPTION,
      inLanguage: "en",
      potentialAction: {
        "@type": "SearchAction",
        target: { "@type": "EntryPoint", urlTemplate: `${SITE_URL}/search?q={search_term_string}` },
        "query-input": "required name=search_term_string",
      },
    },
    {
      "@type": "WebApplication",
      "@id": `${SITE_URL}/#app`,
      name: SITE_NAME,
      url: SITE_URL,
      description: SITE_DESCRIPTION,
      applicationCategory: "EducationalApplication",
      operatingSystem: "Any",
      browserRequirements: "Requires JavaScript",
      isAccessibleForFree: true,
      offers: { "@type": "Offer", price: "0", priceCurrency: "PHP" },
      audience: { "@type": "EducationalAudience", educationalRole: "student" },
    },
  ],
};
