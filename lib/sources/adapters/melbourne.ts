import { dspace7Adapter } from "@/lib/sources/platforms/dspace7";

/**
 * Minerva Access, University of Melbourne: theses, reports and papers across
 * engineering, computing, medicine, the sciences, social sciences and the
 * humanities.
 * https://minerva-access.unimelb.edu.au
 */
export const searchMelbourne = dspace7Adapter({
  id: "melbourne",
  api: "https://minerva-access.unimelb.edu.au/server/api",
  publisher: "University of Melbourne",
  allOpen: false,
  timeoutMs: 14000,
});
