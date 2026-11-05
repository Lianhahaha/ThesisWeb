import { searchCrossrefJournals } from "@/lib/sources/adapters/crossref";
import type { AdapterOptions } from "@/lib/sources/types";

/**
 * Philippine agriculture and fisheries journals deposited with Crossref:
 * Philippine Journal of Fisheries, Philippine Journal of Crop Science, and
 * Philippine Journal of Agricultural and Biosystems Engineering.
 */
export const searchPhilagri = (query: string, opts: AdapterOptions = {}) =>
  searchCrossrefJournals(
    query,
    ["0048-377X", "0115-463X", "0119-7312"],
    "philagri",
    opts
  );
