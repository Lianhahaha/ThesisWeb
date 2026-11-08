import { dspace6Adapter } from "@/lib/sources/platforms/dspace6";

/**
 * OAPEN Library: open-access academic books from publishers and university
 * presses worldwide, across the humanities, social sciences, science and
 * technology. Books are the literature journal indexes leave out.
 * https://library.oapen.org
 */
export const searchOapen = dspace6Adapter({
  id: "oapen",
  base: "https://library.oapen.org",
  publisher: "OAPEN Library",
  allOpen: true,
  timeoutMs: 14000,
});
