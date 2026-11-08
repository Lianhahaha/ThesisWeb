import { dspace7Adapter } from "@/lib/sources/platforms/dspace7";

/**
 * DASH, Harvard University's open-access repository: theses, articles,
 * working papers and reports across law, medicine, the sciences, social
 * sciences and the humanities.
 * https://dash.harvard.edu
 */
export const searchHarvard = dspace7Adapter({
  id: "harvard",
  api: "https://dash.harvard.edu/server/api",
  publisher: "Harvard University",
  allOpen: false,
  timeoutMs: 14000,
});
