import { searchOpenAlexJournals } from "@/lib/sources/adapters/openalex";
import type { AdapterOptions } from "@/lib/sources/types";

/**
 * Major Philippine journals that deposit Crossref metadata, searched through
 * OpenAlex's ISSN filter in one request: engineering and applied science,
 * teacher education, agriculture and fisheries, psychology, and the
 * Philippine Journal of Science. Every record is DOI-backed and verifiable.
 */
export const searchPhiljournals = (query: string, opts: AdapterOptions = {}) =>
  searchOpenAlexJournals(
    query,
    [
      // Philippine Journal of Science
      "0031-7683",
      // Engineering and applied science
      "0119-7312", "3082-3056", "0115-463X", "2449-3767",
      // Teacher education
      "1656-4413", "2467-6802", "2467-7825", "2984-8180", "2651-7000",
      // Agriculture and fisheries
      "0048-377X",
      // Psychology
      "0115-3153",
    ],
    "philjournals",
    opts
  );
