import { dspace7Adapter } from "@/lib/sources/platforms/dspace7";

/**
 * Adelaide Research Repository (Australia): theses and research from the
 * University of Adelaide — agriculture and wine science, engineering,
 * health sciences and the natural sciences.
 * https://digital.library.adelaide.edu.au
 */
export const searchAdelaide = dspace7Adapter({
  id: "adelaide",
  api: "https://digital.library.adelaide.edu.au/server/api",
  publisher: "University of Adelaide",
  // A mixed collection with no per-record rights field: only records that say
  // they are open are counted as free.
  allOpen: false,
});
