import { dspace7Adapter } from "@/lib/sources/platforms/dspace7";

/**
 * Aaltodoc, the repository of Aalto University (Finland): master's theses,
 * doctoral dissertations and technical reports in computing, software
 * engineering, electrical engineering, design and business.
 * https://aaltodoc.aalto.fi
 */
export const searchAalto = dspace7Adapter({
  id: "aalto",
  api: "https://aaltodoc.aalto.fi/server/api",
  publisher: "Aalto University",
  // Theses are published openly, but some records carry an embargo.
  allOpen: false,
});
