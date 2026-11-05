import { searchCrossrefJournals } from "@/lib/sources/adapters/crossref";
import type { AdapterOptions } from "@/lib/sources/types";

/**
 * Philippine education journals with publisher-deposited Crossref metadata:
 * The Normal Lights, APHERJ, AsTEN Journal of Teacher Education, Philippine
 * Journal of Education Studies (UP College of Education), and the Philippine
 * Innovative Education Journal. These are DOI-backed records, not scraped.
 */
export const searchPhiledu = (query: string, opts: AdapterOptions = {}) =>
  searchCrossrefJournals(
    query,
    ["1656-4413", "2467-6802", "2467-7825", "2984-8180", "2651-7000"],
    "philedu",
    opts
  );
