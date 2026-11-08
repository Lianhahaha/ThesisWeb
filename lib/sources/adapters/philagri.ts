import { searchOpenAlexJournals } from "@/lib/sources/adapters/openalex";
import type { AdapterOptions } from "@/lib/sources/types";

/**
 * Philippine agriculture and veterinary journals that deposit Crossref
 * metadata: The Philippine Agricultural Scientist, the Philippine Journal of
 * Veterinary Medicine, and the Philippine Journal of Agricultural Economics.
 * Searched through OpenAlex's ISSN filter; every record is DOI-backed.
 */
export const searchPhilagri = (query: string, opts: AdapterOptions = {}) =>
  searchOpenAlexJournals(
    query,
    ["0031-7454", "0031-7705", "2508-0318"],
    "philagri",
    opts
  );
