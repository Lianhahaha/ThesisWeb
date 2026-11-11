import { dspace7Adapter } from "@/lib/sources/platforms/dspace7";

/**
 * MINDS@UW, the University of Wisconsin's institutional repository (United
 * States): theses and dissertations, plus technical reports and working papers
 * in computing, engineering, the sciences and education.
 * https://minds.wisconsin.edu
 */
export const searchWisconsin = dspace7Adapter({
  id: "wisc",
  api: "https://minds.wisconsin.edu/server/api",
  publisher: "University of Wisconsin",
  // A mixed collection: only records that state their access count as free.
  allOpen: false,
});
