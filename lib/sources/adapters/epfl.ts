import { dspace7Adapter } from "@/lib/sources/platforms/dspace7";

/**
 * EPFL Infoscience: papers, theses and reports from EPFL's schools,
 * including computer and communication sciences, robotics and micro-engineering.
 * https://infoscience.epfl.ch
 */
export const searchEpfl = dspace7Adapter({
  id: "epfl",
  api: "https://infoscience.epfl.ch/server/api",
  publisher: "EPFL",
  allOpen: false,
  timeoutMs: 14000,
});
