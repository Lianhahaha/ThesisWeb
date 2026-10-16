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
