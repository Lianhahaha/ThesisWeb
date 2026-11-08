import { dspace7Adapter } from "@/lib/sources/platforms/dspace7";

/**
 * UNSWorks, UNSW Sydney: theses, reports and papers in engineering,
 * computing, AI and the sciences.
 * https://unsworks.unsw.edu.au
 */
export const searchUnsw = dspace7Adapter({
  id: "unsw",
  api: "https://unsworks.unsw.edu.au/server/api",
  publisher: "UNSW Sydney",
  allOpen: false,
  timeoutMs: 14000,
});
