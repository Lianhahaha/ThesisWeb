import { dspace7Adapter } from "@/lib/sources/platforms/dspace7";

/**
 * IDRC Digital Library (International Development Research Centre,
 * Canada): research it funded across Asia, Africa and Latin America on
 * health, agriculture, education, governance and the economy, free to read.
 * https://idl-bnc-idrc.dspacedirect.org
 */
export const searchIdrc = dspace7Adapter({
  id: "idrc",
  api: "https://idl-bnc-idrc.dspacedirect.org/server/api",
  publisher: "International Development Research Centre",
  allOpen: true,
});
