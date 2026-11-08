import { searchOpenAlexJournals } from "@/lib/sources/adapters/openalex";
import type { AdapterOptions } from "@/lib/sources/types";

/**
 * Philippine politics and society journals that deposit Crossref metadata,
 * searched through OpenAlex's ISSN filter: Philippine Political Science
 * Journal, Philippine Journal of Public Administration, Kasarinlan, and the
 * Philippine Sociological Review. Every record is DOI-backed.
 */
export const searchPhilpolitics = (query: string, opts: AdapterOptions = {}) =>
  searchOpenAlexJournals(
    query,
    ["0115-4451", "0031-7675", "0116-0923", "0031-7810"],
    "philpolitics",
    opts
  );
