import { searchCrossrefJournals } from "@/lib/sources/adapters/crossref";
import type { AdapterOptions } from "@/lib/sources/types";

/**
 * One Crossref request across the major Philippine journals that deposit
 * publisher metadata: engineering and applied science, teacher education,
 * agriculture and fisheries, and psychology. Keeping these in one source
 * avoids firing several parallel Crossref requests and getting a 429.
 * Every record is DOI-backed and can be checked at the publisher.
 */
export const searchPhiljournals = (query: string, opts: AdapterOptions = {}) =>
  searchCrossrefJournals(
    query,
    [
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
