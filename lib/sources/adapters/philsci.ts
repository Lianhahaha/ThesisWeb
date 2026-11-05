import { searchCrossrefJournals } from "@/lib/sources/adapters/crossref";
import type { AdapterOptions } from "@/lib/sources/types";

/**
 * The Philippine Journal of Science, the country's oldest science journal
 * (DOST-Science and Technology Information Institute). Crossref holds its
 * publisher-deposited metadata, so records are real, DOI-backed and
 * independently verifiable.
 * https://philjournalsci.dost.gov.ph
 */
export const searchPhilsci = (query: string, opts: AdapterOptions = {}) =>
  searchCrossrefJournals(query, ["0031-7683"], "philsci", opts);
