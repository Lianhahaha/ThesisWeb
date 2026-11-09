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
import { searchNist } from "@/lib/sources/adapters/nist";
import { searchCinii } from "@/lib/sources/adapters/cinii";
import { searchJstage } from "@/lib/sources/adapters/jstage";
import { searchFigshare } from "@/lib/sources/adapters/figshare";
import { searchWorldBank } from "@/lib/sources/adapters/worldbank";
import { searchCgspace } from "@/lib/sources/adapters/cgspace";
import { searchFao } from "@/lib/sources/adapters/fao";
import { searchIdrc } from "@/lib/sources/adapters/idrc";
import { searchPmc } from "@/lib/sources/adapters/pmc";
import { searchNtrs } from "@/lib/sources/adapters/ntrs";
import { searchEconBiz } from "@/lib/sources/adapters/econbiz";
import { searchUsgs } from "@/lib/sources/adapters/usgs";
import { searchAgricola, searchPubag } from "@/lib/sources/adapters/nal";
import { searchIeee } from "@/lib/sources/adapters/ieee";
import { searchGbif } from "@/lib/sources/adapters/gbif";
import { searchAgris } from "@/lib/sources/adapters/agris";
import { searchLaReferencia } from "@/lib/sources/adapters/lareferencia";
import { searchBdtd } from "@/lib/sources/adapters/bdtd";
import { searchThesesFr } from "@/lib/sources/adapters/thesesfr";
import { searchEdArxiv, searchOsf } from "@/lib/sources/adapters/osf";
import { searchZbmath } from "@/lib/sources/adapters/zbmath";
import { searchHuggingFace } from "@/lib/sources/adapters/huggingface";
import { searchOpenReview } from "@/lib/sources/adapters/openreview";
import { searchSeafdec } from "@/lib/sources/adapters/seafdec";
import { searchBsu } from "@/lib/sources/adapters/bsu";
import { searchSsoar } from "@/lib/sources/adapters/ssoar";
import { searchWho } from "@/lib/sources/adapters/who";
import { searchPaho } from "@/lib/sources/adapters/paho";
import { searchNice } from "@/lib/sources/adapters/nice";
import { searchNber } from "@/lib/sources/adapters/nber";
import { searchOpenLibrary } from "@/lib/sources/adapters/openlibrary";
import { searchGoogleBooks } from "@/lib/sources/adapters/googlebooks";
import { searchOpenStax } from "@/lib/sources/adapters/openstax";
import { searchCore } from "@/lib/sources/adapters/core";
import { searchNtu } from "@/lib/sources/adapters/ntu";
import { searchUpspace } from "@/lib/sources/adapters/upspace";
import { searchUpou } from "@/lib/sources/adapters/upou";
import { searchElib } from "@/lib/sources/adapters/elib";
import { searchUpv } from "@/lib/sources/adapters/upv";
import { searchPhiljournals } from "@/lib/sources/adapters/philjournals";
import { searchPlaridel } from "@/lib/sources/adapters/plaridel";
import { searchPej } from "@/lib/sources/adapters/saliksik";
import { searchAjol } from "@/lib/sources/adapters/ajol";
import { searchNcjrs } from "@/lib/sources/adapters/ncjrs";
import { searchHerdin } from "@/lib/sources/adapters/herdin";
import { searchSerpp } from "@/lib/sources/adapters/serpp";
import { searchKrishikosh } from "@/lib/sources/adapters/krishikosh";
import { searchUpd } from "@/lib/sources/adapters/upd";
import { searchAiias } from "@/lib/sources/adapters/aiias";
import { searchActaMedica } from "@/lib/sources/adapters/actamedica";
import { searchPnu } from "@/lib/sources/adapters/pnu";
import { searchEjournalsPh } from "@/lib/sources/adapters/ejournalsph";
import { searchSaliksik } from "@/lib/sources/adapters/saliksik";
import { searchPcaarrd } from "@/lib/sources/adapters/pcaarrd";
import { searchSearca } from "@/lib/sources/adapters/searca";
import { searchScielo } from "@/lib/sources/adapters/scielo";
import { searchPersee } from "@/lib/sources/adapters/persee";
import { searchClinicalTrials } from "@/lib/sources/adapters/clinicaltrials";
import { searchIsrctn } from "@/lib/sources/adapters/isrctn";
import { searchCtis } from "@/lib/sources/adapters/ctis";
import { searchEuCtr } from "@/lib/sources/adapters/euctr";
import { searchFederalRegister } from "@/lib/sources/adapters/federalregister";
import { searchEurLex } from "@/lib/sources/adapters/eurlex";
import { searchInternetArchive } from "@/lib/sources/adapters/internetarchive";
import { searchPapersWithCode } from "@/lib/sources/adapters/paperswithcode";
import { searchMit } from "@/lib/sources/adapters/mit";
import { searchEpfl } from "@/lib/sources/adapters/epfl";
import { searchGatech } from "@/lib/sources/adapters/gatech";
import { searchToronto } from "@/lib/sources/adapters/toronto";
import { searchCornell } from "@/lib/sources/adapters/cornell";
import { searchDuke } from "@/lib/sources/adapters/duke";
import { searchVtech } from "@/lib/sources/adapters/vtech";
import { searchUminn } from "@/lib/sources/adapters/uminn";
import { searchArizona } from "@/lib/sources/adapters/arizona";
import { searchUnsw } from "@/lib/sources/adapters/unsw";
import { searchGooglePatents } from "@/lib/sources/adapters/googlepatents";
import { searchOapen } from "@/lib/sources/adapters/oapen";
import { searchDoab } from "@/lib/sources/adapters/doab";
import { searchHarvard } from "@/lib/sources/adapters/harvard";
import { searchMelbourne } from "@/lib/sources/adapters/melbourne";
import { searchAuckland } from "@/lib/sources/adapters/auckland";
import { searchDigitalNz } from "@/lib/sources/adapters/digitalnz";
import { searchCaltech } from "@/lib/sources/adapters/caltech";
import { searchPangaea } from "@/lib/sources/adapters/pangaea";
import { searchDryad } from "@/lib/sources/adapters/dryad";
import { searchSecEdgar } from "@/lib/sources/adapters/secedgar";
import { searchNvd } from "@/lib/sources/adapters/nvd";
import { searchCisaKev } from "@/lib/sources/adapters/cisa-kev";
import { searchPedro } from "@/lib/sources/adapters/pedro";
import { searchProspero } from "@/lib/sources/adapters/prospero";
import { searchPhilpolitics } from "@/lib/sources/adapters/philpolitics";
import { searchPhilagri } from "@/lib/sources/adapters/philagri";

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
  // Crossref and Semantic Scholar take free text, not AND/OR, so a country
  // clause would be searched as the words "AND", "OR" and the quotes.
  crossref:        { run: searchCrossref, boolean: false },
  // Retries through 429s from its shared public pool, so it needs extra room.
  semanticscholar: { run: searchSemanticScholar, boolean: false, deadlineMs: 16000 },
  doaj:            { run: searchDoaj, boolean: true },
  // The EBI endpoint can take 10-12 s on a cold query.
  europepmc:       { run: searchEuropePMC, boolean: true, deadlineMs: 18000 },
  pubmed:          { run: searchPubMed, boolean: true },
  arxiv:           { run: searchArxiv, boolean: true },
  eric:            { run: searchEric, boolean: false },
  edarxiv:         { run: searchEdArxiv, boolean: false },
  huggingface:     { run: searchHuggingFace, boolean: false },
  openreview:      { run: searchOpenReview, boolean: false, deadlineMs: 18000 },
  zbmath:          { run: searchZbmath, boolean: false, deadlineMs: 18000 },
  zenodo:          { run: searchZenodo, boolean: false },
  hal:             { run: searchHal, boolean: false },
  // The Graph API can take 8-12 s when its index is busy.
  openaire:        { run: searchOpenAire, boolean: false, deadlineMs: 18000 },
  inspire:         { run: searchInspire, boolean: false },
  plos:            { run: searchPlos, boolean: false },
  datacite:        { run: searchDataCite, boolean: false },
  nist:            { run: searchNist, boolean: false, deadlineMs: 15000 },
  osti:            { run: searchOsti, boolean: false },
  cinii:           { run: searchCinii, boolean: false, country: "Japan" },
  jstage:          { run: searchJstage, boolean: false, country: "Japan" },
  // Search + per-item detail fetches, so it needs more room than the default.
  figshare:        { run: searchFigshare, boolean: false, deadlineMs: 15000 },
  // Slow server (5-12 s), so it gets extra room.
  worldbank:       { run: searchWorldBank, boolean: false, deadlineMs: 14000 },
  fao:             { run: searchFao, boolean: false, deadlineMs: 20000 },
  cgspace:         { run: searchCgspace, boolean: false },
  idrc:            { run: searchIdrc, boolean: false },
  // The same NCBI E-utilities search as PubMed, which takes AND/OR.
  pmc:             { run: searchPmc, boolean: true },
  ntrs:            { run: searchNtrs, boolean: false },
  econbiz:         { run: searchEconBiz, boolean: false },
  pubag:           { run: searchPubag, boolean: false, deadlineMs: 18000 },
  agricola:        { run: searchAgricola, boolean: false, deadlineMs: 18000 },
  usgs:            { run: searchUsgs, boolean: false },
  ieee:            { run: searchIeee, boolean: true },
  agris:           { run: searchAgris, boolean: false, deadlineMs: 18000 },
  gbif:            { run: searchGbif, boolean: false },
  lareferencia:    { run: searchLaReferencia, boolean: false },
  bdtd:            { run: searchBdtd, boolean: false, country: "Brazil" },
  thesesfr:        { run: searchThesesFr, boolean: false, country: "France" },
  osf:             { run: searchOsf, boolean: false },
  bsu:             { run: searchBsu, boolean: false, country: "Philippines" },
  seafdec:         { run: searchSeafdec, boolean: false, country: "Philippines" },
  ssoar:           { run: searchSsoar, boolean: false },
  // Slow server (8-13 s), so it gets extra room.
  nice:            { run: searchNice, boolean: false, deadlineMs: 15000 },
  paho:            { run: searchPaho, boolean: false, deadlineMs: 16000 },
  who:             { run: searchWho, boolean: false, deadlineMs: 16000 },
  nber:            { run: searchNber, boolean: false },
  openlibrary:     { run: searchOpenLibrary, boolean: false },
  googlebooks:     { run: searchGoogleBooks, boolean: false },
  // Fetches the small catalogue once, then matches locally; cached for a day.
  openstax:        { run: searchOpenStax, boolean: false, deadlineMs: 16000 },
  core:            { run: searchCore, boolean: true },
  ntu:             { run: searchNtu, boolean: false, country: "Singapore" },
  upspace:         { run: searchUpspace, boolean: false, country: "South Africa" },
  elib:            { run: searchElib, boolean: false, country: "Philippines", deadlineMs: 22000 },
  upou:            { run: searchUpou, boolean: false, country: "Philippines" },
  upv:             { run: searchUpv, boolean: false, country: "Philippines" },
  // Crossref journal subsets: DOI-backed records, so the source is verifiable.
  plaridel:        { run: searchPlaridel, boolean: false, country: "Philippines", deadlineMs: 20000 },
  philjournals:    { run: searchPhiljournals, boolean: false, country: "Philippines" },
  // A single journal from the Saliksik portal; same API, local engineering focus.
  pej:             { run: searchPej, boolean: false, country: "Philippines", deadlineMs: 16000 },
  // Search page, then one small journal page per unique journal for its title.
  ajol:            { run: searchAjol, boolean: false, deadlineMs: 18000 },
  ncjrs:           { run: searchNcjrs, boolean: false, country: "United States" },
  // A scraped page that is sometimes slow (8-12 s).
  herdin:          { run: searchHerdin, boolean: false, country: "Philippines", deadlineMs: 22000 },
  serpp:           { run: searchSerpp, boolean: false, country: "Philippines" },
  krishikosh:      { run: searchKrishikosh, boolean: false, country: "India" },
  // A form POST, then up to three AJAX pages, so it needs extra room.
  upd:             { run: searchUpd, boolean: false, country: "Philippines", deadlineMs: 16000 },
  aiias:           { run: searchAiias, boolean: false, country: "Philippines" },
  // Slow OJS server; the adapter itself also allows 16 s.
  actamedica:      { run: searchActaMedica, boolean: false, country: "Philippines", deadlineMs: 18000 },
  pnu:             { run: searchPnu, boolean: false, country: "Philippines" },
  // A list page, then one article page per result, so it needs extra room.
  ejournalsph:     { run: searchEjournalsPh, boolean: false, country: "Philippines", deadlineMs: 16000 },
  // A search API, then an article page per result for authors and year.
  saliksik:        { run: searchSaliksik, boolean: false, country: "Philippines", deadlineMs: 16000 },
  // A results page, then one record page per result for abstract and authors.
  searca:          { run: searchSearca, boolean: false, deadlineMs: 22000 },
  pcaarrd:         { run: searchPcaarrd, boolean: false, country: "Philippines", deadlineMs: 16000 },
  scielo:          { run: searchScielo, boolean: false },
  persee:          { run: searchPersee, boolean: false },
  ctis:            { run: searchCtis, boolean: false, deadlineMs: 15000 },
  euctr:           { run: searchEuCtr, boolean: false, deadlineMs: 15000 },
  isrctn:          { run: searchIsrctn, boolean: false, deadlineMs: 12000 },
  clinicaltrials:  { run: searchClinicalTrials, boolean: false },
  eurlex:          { run: searchEurLex, boolean: false, deadlineMs: 18000 },
  federalregister: { run: searchFederalRegister, boolean: false },
  internetarchive: { run: searchInternetArchive, boolean: false },
  paperswithcode:  { run: searchPapersWithCode, boolean: false },
  mit:             { run: searchMit, boolean: false, country: "United States" },
  epfl:            { run: searchEpfl, boolean: false, country: "Switzerland" },
  gatech:          { run: searchGatech, boolean: false, country: "United States" },
  toronto:         { run: searchToronto, boolean: false, country: "Canada" },
  cornell:         { run: searchCornell, boolean: false, country: "United States" },
  duke:            { run: searchDuke, boolean: false, country: "United States" },
  vtech:           { run: searchVtech, boolean: false, country: "United States" },
  uminn:           { run: searchUminn, boolean: false, country: "United States" },
  arizona:         { run: searchArizona, boolean: false, country: "United States" },
  unsw:            { run: searchUnsw, boolean: false, country: "Australia" },
  googlepatents:   { run: searchGooglePatents, boolean: false },
  oapen:           { run: searchOapen, boolean: false },
  doab:            { run: searchDoab, boolean: false },
  harvard:         { run: searchHarvard, boolean: false, country: "United States" },
  melbourne:       { run: searchMelbourne, boolean: false, country: "Australia" },
  digitalnz:       { run: searchDigitalNz, boolean: false, country: "New Zealand" },
  auckland:        { run: searchAuckland, boolean: false, country: "New Zealand" },
  caltech:         { run: searchCaltech, boolean: false, country: "United States" },
  dryad:           { run: searchDryad, boolean: false, deadlineMs: 12000 },
  pangaea:         { run: searchPangaea, boolean: false },
  secedgar:        { run: searchSecEdgar, boolean: false, country: "United States" },
  nvd:             { run: searchNvd, boolean: false, deadlineMs: 20000 },
  cisakev:         { run: searchCisaKev, boolean: false, deadlineMs: 20000 },
  prospero:        { run: searchProspero, boolean: false, deadlineMs: 15000 },
  pedro:           { run: searchPedro, boolean: false, deadlineMs: 24000 },
  philpolitics:    { run: searchPhilpolitics, boolean: false, country: "Philippines" },
  philagri:        { run: searchPhilagri, boolean: false, country: "Philippines" },
};
