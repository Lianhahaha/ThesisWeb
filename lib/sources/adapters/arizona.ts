import { dspace7Adapter } from "@/lib/sources/platforms/dspace7";

/**
 * University of Arizona Campus Repository: theses, dissertations and reports,
 * including optical sciences, electrical and computer engineering, and AI.
 * https://repository.arizona.edu
 */
export const searchArizona = dspace7Adapter({
  id: "arizona",
  api: "https://repository.arizona.edu/server/api",
  publisher: "University of Arizona",
  allOpen: false,
  timeoutMs: 14000,
});
