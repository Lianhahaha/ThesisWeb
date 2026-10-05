import { dspace7Adapter } from "@/lib/sources/platforms/dspace7";

/**
 * Krishikosh, India's national agricultural repository (ICAR and the state
 * agricultural universities): 150k+ master's and doctoral theses in
 * agronomy, horticulture, fisheries, veterinary science, food technology
 * and agricultural economics, in English with abstracts. Close to
 * Philippine conditions for rice, crops and tropical farming topics.
 * https://krishikosh.egranth.ac.in
 */
export const searchKrishikosh = dspace7Adapter({
  id: "krishikosh",
  api: "https://krishikosh.egranth.ac.in/server/api",
  publisher: "Krishikosh (ICAR)",
  allOpen: false,
});
