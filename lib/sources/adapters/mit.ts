import { dspace7Adapter } from "@/lib/sources/platforms/dspace7";

/**
 * MIT DSpace: theses, technical reports, conference and journal papers from
 * MIT's departments, including EECS and CSAIL. Strong on AI, robotics,
 * computer systems and electrical engineering.
 * https://dspace.mit.edu
 */
export const searchMit = dspace7Adapter({
  id: "mit",
  api: "https://dspace.mit.edu/server/api",
  publisher: "Massachusetts Institute of Technology",
  allOpen: false,
  timeoutMs: 14000,
});
