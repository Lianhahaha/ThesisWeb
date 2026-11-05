import { searchCrossrefJournals } from "@/lib/sources/adapters/crossref";
import type { AdapterOptions } from "@/lib/sources/types";

/**
 * Philippine Journal of Psychology (Psychological Association of the
 * Philippines), with publisher-deposited Crossref metadata.
 */
export const searchPhilpsy = (query: string, opts: AdapterOptions = {}) =>
  searchCrossrefJournals(query, ["0115-3153"], "philpsy", opts);
