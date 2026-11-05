import { searchCrossrefJournals } from "@/lib/sources/adapters/crossref";
import type { AdapterOptions } from "@/lib/sources/types";

/**
 * Philippine engineering and applied-science journals with DOI-deposited
 * Crossref metadata:
 * - Philippine Journal of Agricultural and Biosystems Engineering (UPLB)
 * - Philippine Journal of Science, Engineering and Technology (CHMSU)
 * - Philippine Journal of Crop Science (Crop Science Society of the Philippines)
 * - International Journal of Philippine Science and Technology
 *
 * These are journal subsets, not scraped pages: every record comes from the
 * publisher's Crossref deposit and can be checked by DOI.
 */
export const searchPhileng = (query: string, opts: AdapterOptions = {}) =>
  searchCrossrefJournals(
    query,
    ["0119-7312", "3082-3056", "0115-463X", "2449-3767"],
    "phileng",
    opts
  );
