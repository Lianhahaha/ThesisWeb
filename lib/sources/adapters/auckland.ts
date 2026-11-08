import { dspace7Adapter } from "@/lib/sources/platforms/dspace7";

/**
 * ResearchSpace, University of Auckland: theses, reports and papers across
 * engineering, computing, medicine, the sciences, social sciences and the
 * humanities.
 * https://researchspace.auckland.ac.nz
 */
export const searchAuckland = dspace7Adapter({
  id: "auckland",
  api: "https://researchspace.auckland.ac.nz/server/api",
  publisher: "University of Auckland",
  allOpen: false,
  timeoutMs: 14000,
});
