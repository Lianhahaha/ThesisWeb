import type { SourceId } from "@/lib/sources/meta";
import type { AdapterEntry } from "@/lib/sources/types";
import { searchOpenAlex } from "@/lib/sources/adapters/openalex";
import { searchCrossref } from "@/lib/sources/adapters/crossref";
import { searchSemanticScholar } from "@/lib/sources/adapters/semanticscholar";
import { searchDoaj } from "@/lib/sources/adapters/doaj";
import { searchEuropePMC } from "@/lib/sources/adapters/europepmc";
import { searchPubMed } from "@/lib/sources/adapters/pubmed";
import { searchArxiv } from "@/lib/sources/adapters/arxiv";
import { searchEric } from "@/lib/sources/adapters/eric";
import { searchZenodo } from "@/lib/sources/adapters/zenodo";
import { searchHal } from "@/lib/sources/adapters/hal";
import { searchOpenAire } from "@/lib/sources/adapters/openaire";
import { searchInspire } from "@/lib/sources/adapters/inspire";
import { searchPlos } from "@/lib/sources/adapters/plos";
import { searchDataCite } from "@/lib/sources/adapters/datacite";
import { searchOsti } from "@/lib/sources/adapters/osti";
import { searchCinii } from "@/lib/sources/adapters/cinii";
import { searchJstage } from "@/lib/sources/adapters/jstage";
import { searchFigshare } from "@/lib/sources/adapters/figshare";
import { searchWorldBank } from "@/lib/sources/adapters/worldbank";
import { searchCgspace } from "@/lib/sources/adapters/cgspace";

/**
 * The adapter for every source in lib/sources/meta.ts. Typed as a Record over
 * SourceId, so adding a source to the metadata without an adapter here (or
 * the other way round) fails the type check instead of failing silently.
 *
 * To add a database: write lib/sources/adapters/<id>.ts, add its metadata to
 * meta.ts, and register it here. Server-only: adapters may read API keys.
 */
export const ADAPTERS: Record<SourceId, AdapterEntry> = {
  openalex:        { run: searchOpenAlex, boolean: true },
  crossref:        { run: searchCrossref, boolean: true },
  // Retries through 429s from its shared public pool, so it needs extra room.
  semanticscholar: { run: searchSemanticScholar, boolean: true, deadlineMs: 16000 },
  doaj:            { run: searchDoaj, boolean: true },
  europepmc:       { run: searchEuropePMC, boolean: true },
  pubmed:          { run: searchPubMed, boolean: true },
  arxiv:           { run: searchArxiv, boolean: true },
  eric:            { run: searchEric, boolean: false },
  zenodo:          { run: searchZenodo, boolean: false },
  hal:             { run: searchHal, boolean: false },
  openaire:        { run: searchOpenAire, boolean: false },
  inspire:         { run: searchInspire, boolean: false },
  plos:            { run: searchPlos, boolean: false },
  datacite:        { run: searchDataCite, boolean: false },
  osti:            { run: searchOsti, boolean: false },
  cinii:           { run: searchCinii, boolean: false },
  jstage:          { run: searchJstage, boolean: false },
  // Search + per-item detail fetches, so it needs more room than the default.
  figshare:        { run: searchFigshare, boolean: false, deadlineMs: 15000 },
  // Slow server (5-12 s), so it gets extra room.
  worldbank:       { run: searchWorldBank, boolean: false, deadlineMs: 14000 },
  cgspace:         { run: searchCgspace, boolean: false },
};
