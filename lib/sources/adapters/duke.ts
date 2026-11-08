import { dspace7Adapter } from "@/lib/sources/platforms/dspace7";

/**
 * DukeSpace, Duke University: theses, dissertations and reports in computing,
 * engineering, medicine and the sciences.
 * https://dukespace.lib.duke.edu
 */
export const searchDuke = dspace7Adapter({
  id: "duke",
  api: "https://dukespace.lib.duke.edu/server/api",
  publisher: "Duke University",
  allOpen: false,
  timeoutMs: 14000,
});
