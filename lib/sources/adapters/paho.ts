import { dspace7Adapter } from "@/lib/sources/platforms/dspace7";

/**
 * PAHO IRIS, the Pan American Health Organization's institutional repository:
 * guidelines, technical reports, country health profiles, health technology
 * assessments and journal articles from the Americas, all free to read.
 * https://iris.paho.org
 */
export const searchPaho = dspace7Adapter({
  id: "paho",
  api: "https://iris.paho.org/server/api",
  publisher: "Pan American Health Organization",
  allOpen: true,
  timeoutMs: 14000,
});
