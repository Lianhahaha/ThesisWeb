import { dspace7Adapter } from "@/lib/sources/platforms/dspace7";

/**
 * HARVEST, the University of Saskatchewan's repository (Canada): theses and
 * dissertations, plus research in agriculture, health, engineering, education
 * and Indigenous studies.
 * https://harvest.usask.ca
 */
export const searchUsask = dspace7Adapter({
  id: "usask",
  api: "https://harvest.usask.ca/server/api",
  publisher: "University of Saskatchewan",
  // Open by policy; records carry no rights field.
  allOpen: true,
});
