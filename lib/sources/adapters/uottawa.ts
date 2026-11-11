import { dspace7Adapter } from "@/lib/sources/platforms/dspace7";

/**
 * uOttawa Repository (Canada): the University of Ottawa's theses and research
 * output, bilingual French and English — health sciences, law, education,
 * engineering and social sciences.
 * https://ruor.uottawa.ca
 */
export const searchUottawa = dspace7Adapter({
  id: "uottawa",
  api: "https://ruor.uottawa.ca/server/api",
  publisher: "University of Ottawa",
  // The repository publishes openly and states no per-record rights field.
  allOpen: true,
});
