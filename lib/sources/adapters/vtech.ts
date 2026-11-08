import { dspace7Adapter } from "@/lib/sources/platforms/dspace7";

/**
 * VTechWorks, Virginia Tech: theses, dissertations, reports and papers in
 * engineering, computing and the sciences.
 * https://vtechworks.lib.vt.edu
 */
export const searchVtech = dspace7Adapter({
  id: "vtech",
  api: "https://vtechworks.lib.vt.edu/server/api",
  publisher: "Virginia Tech",
  allOpen: false,
  timeoutMs: 14000,
});
