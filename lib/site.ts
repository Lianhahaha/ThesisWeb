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
