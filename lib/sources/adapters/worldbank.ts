import { dspace7Adapter } from "@/lib/sources/platforms/dspace7";

/**
 * World Bank Open Knowledge Repository: research reports, policy research
 * working papers, country studies (many on the Philippines and Southeast
 * Asia) and books, all free under Creative Commons. Answers in 5-12 s.
 * https://openknowledge.worldbank.org
 */
export const searchWorldBank = dspace7Adapter({
  id: "worldbank",
  api: "https://openknowledge.worldbank.org/server/api",
  publisher: "World Bank",
  allOpen: true,
  timeoutMs: 13000,
});
