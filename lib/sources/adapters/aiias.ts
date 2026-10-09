import { dspace7Adapter } from "@/lib/sources/platforms/dspace7";

/**
 * The repository of the Adventist International Institute of Advanced
 * Studies (Silang, Cavite): graduate theses and dissertations in
 * education, business, public health, theology and nursing, with
 * abstracts. Its DSpace API lives under /endpoint/api, not /server/api.
 * https://dspace.aiias.edu
 */
export const searchAiias = dspace7Adapter({
  id: "aiias",
  api: "https://dspace.aiias.edu/endpoint/api",
  publisher: "Adventist International Institute of Advanced Studies",
  allOpen: false,
});
