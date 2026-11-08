import { dspace7Adapter } from "@/lib/sources/platforms/dspace7";

/**
 * TSpace, University of Toronto: theses, articles and reports, including
 * computer science, machine learning and engineering.
 * https://tspace.library.utoronto.ca
 */
export const searchToronto = dspace7Adapter({
  id: "toronto",
  api: "https://tspace.library.utoronto.ca/server/api",
  publisher: "University of Toronto",
  allOpen: false,
  timeoutMs: 14000,
});
