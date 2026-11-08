import { dspace6Adapter } from "@/lib/sources/platforms/dspace6";

/**
 * Directory of Open Access Books (DOAB): peer-reviewed open-access books from
 * many publishers, across every field. Complements OAPEN's library catalogue.
 * https://directory.doabooks.org
 */
export const searchDoab = dspace6Adapter({
  id: "doab",
  base: "https://directory.doabooks.org",
  publisher: "DOAB",
  allOpen: true,
  timeoutMs: 14000,
});
