import { dspace7Adapter } from "@/lib/sources/platforms/dspace7";

/**
 * FAO OpenKnowledge, the Food and Agriculture Organization's document
 * repository: food security, fisheries and aquaculture, agriculture,
 * forestry, climate, rural development and statistics, all free to read.
 * https://openknowledge.fao.org
 */
export const searchFao = dspace7Adapter({
  id: "fao",
  api: "https://openknowledge.fao.org/server/api",
  publisher: "Food and Agriculture Organization of the United Nations",
  allOpen: true,
  // FAO's WAF refuses requests without a Referer, even with a normal UA.
  headers: { Referer: "https://openknowledge.fao.org/" },
  timeoutMs: 18000,
});
