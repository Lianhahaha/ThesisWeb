import { dspace7Adapter } from "@/lib/sources/platforms/dspace7";

/**
 * eCommons, Cornell University: theses, technical reports and papers in
 * computing, information science, engineering and the sciences.
 * https://ecommons.cornell.edu
 */
export const searchCornell = dspace7Adapter({
  id: "cornell",
  api: "https://ecommons.cornell.edu/server/api",
  publisher: "Cornell University",
  allOpen: false,
  timeoutMs: 14000,
});
