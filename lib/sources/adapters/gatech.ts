import { dspace7Adapter } from "@/lib/sources/platforms/dspace7";

/**
 * SMARTech, Georgia Institute of Technology: theses, dissertations, technical
 * reports and faculty papers in computing, machine learning and engineering.
 * https://repository.gatech.edu
 */
export const searchGatech = dspace7Adapter({
  id: "gatech",
  api: "https://repository.gatech.edu/server/api",
  publisher: "Georgia Institute of Technology",
  allOpen: false,
  timeoutMs: 14000,
});
