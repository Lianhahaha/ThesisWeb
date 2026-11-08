import { dspace7Adapter } from "@/lib/sources/platforms/dspace7";

/**
 * University Digital Conservancy, University of Minnesota: theses, technical
 * reports and papers in computing, engineering and the sciences.
 * https://conservancy.umn.edu
 */
export const searchUminn = dspace7Adapter({
  id: "uminn",
  api: "https://conservancy.umn.edu/server/api",
  publisher: "University of Minnesota",
  allOpen: false,
  timeoutMs: 14000,
});
