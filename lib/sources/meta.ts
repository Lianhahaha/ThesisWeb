/**
 * Display metadata for every search source. Pure data (no adapter imports), so
 * it is safe to use from client components. Add new sources here so the
 * search page, the Databases page and docs pick them up automatically; the
 * registry (lib/sources/registry.ts) must then give each one an adapter.
 */

/** Broad research areas, for grouping sources on the Databases page. */
export const FIELDS = {
  all: "Every field",
  medicine: "Medicine & health",
  engineering: "Engineering & technology",
  sciences: "Natural sciences",
  agriculture: "Agriculture, food & environment",
  social: "Social sciences & development",
  business: "Business & economics",
  education: "Education",
  humanities: "Humanities & arts",
  computing: "Computing & maths",
} as const;
export type Field = keyof typeof FIELDS;

/** What a source holds, which says a lot about how far to trust a record. */
export const KINDS = {
  index: "Research index",
  journals: "Peer-reviewed journals",
  repository: "Open repository",
  preprints: "Preprints (not peer-reviewed)",
  theses: "Theses & dissertations",
  reports: "Reports & official publications",
  books: "Books",
} as const;
export type Kind = keyof typeof KINDS;

export interface SourceMeta {
  /** Human-readable name. */
  label: string;
  /** What it is good for — shown as a tooltip. */
  blurb: string;
  /** Badge color (hex). */
  color: string;
  /** Who runs it and where its records mostly come from, e.g. "Global", "Japan". */
  region: string;
  fields: Field[];
  kind: Kind;
  /** The database's own site, for students who want to search it directly. */
  url: string;
  /** True if the adapter is skipped unless an API key is configured. */
  needsKey?: boolean;
}

const META = {
  openalex: {
    label: "OpenAlex", blurb: "250M+ works across every field; primary discovery source", color: "#388bfd",
    region: "Global", fields: ["all"], kind: "index", url: "https://openalex.org",
  },
  crossref: {
    label: "Crossref", blurb: "Publisher-deposited metadata and DOIs", color: "#3fb950",
    region: "Global", fields: ["all"], kind: "index", url: "https://search.crossref.org",
  },
  semanticscholar: {
    label: "Semantic Scholar", blurb: "AI-written TLDRs and citation graph", color: "#bc8cff",
    region: "Global", fields: ["all"], kind: "index", url: "https://www.semanticscholar.org",
  },
  doaj: {
    label: "DOAJ", blurb: "Fully open-access journals worldwide", color: "#d29922",
    region: "Global", fields: ["all"], kind: "journals", url: "https://doaj.org",
  },
  europepmc: {
    label: "Europe PMC", blurb: "Life sciences, biomedical and preprints", color: "#64c4c4",
    region: "Europe", fields: ["medicine", "sciences"], kind: "index", url: "https://europepmc.org",
  },
  pubmed: {
    label: "PubMed", blurb: "Biomedical and health literature", color: "#f8814a",
    region: "United States", fields: ["medicine"], kind: "index", url: "https://pubmed.ncbi.nlm.nih.gov",
  },
  arxiv: {
    label: "arXiv", blurb: "Preprints in physics, maths, CS, economics and more", color: "#e06060",
    region: "Global", fields: ["sciences", "computing", "engineering"], kind: "preprints", url: "https://arxiv.org",
  },
  eric: {
    label: "ERIC", blurb: "Education research: articles, theses and reports (U.S. Dept. of Education)", color: "#e3b341",
    region: "United States", fields: ["education"], kind: "index", url: "https://eric.ed.gov",
  },
  zenodo: {
    label: "Zenodo", blurb: "Open articles, theses, reports and preprints from every field (CERN)", color: "#58a6ff",
    region: "Global", fields: ["all"], kind: "repository", url: "https://zenodo.org",
  },
  hal: {
    label: "HAL", blurb: "French national open archive: articles, theses and reports (multilingual)", color: "#f778ba",
    region: "France", fields: ["all"], kind: "repository", url: "https://hal.science",
  },
  openaire: {
    label: "OpenAIRE", blurb: "European open-science graph: repositories, publishers and funder-linked research", color: "#ff7b72",
    region: "Europe", fields: ["all"], kind: "index", url: "https://explore.openaire.eu",
  },
  inspire: {
    label: "INSPIRE-HEP", blurb: "High-energy physics, astrophysics and cosmology (CERN, Fermilab, DESY)", color: "#a5d6ff",
    region: "Global", fields: ["sciences"], kind: "index", url: "https://inspirehep.net",
  },
  plos: {
    label: "PLOS", blurb: "PLOS ONE, Climate, Medicine, Biology and more — all open access", color: "#ff9bce",
    region: "Global", fields: ["medicine", "sciences"], kind: "journals", url: "https://plos.org",
  },
  datacite: {
    label: "DataCite Theses", blurb: "Theses and dissertations from university repositories worldwide", color: "#7ee787",
    region: "Global", fields: ["all"], kind: "theses", url: "https://commons.datacite.org",
  },
  osti: {
    label: "OSTI.GOV", blurb: "U.S. Dept. of Energy research: energy, engineering, physics and environment reports and articles", color: "#f0b72f",
    region: "United States", fields: ["engineering", "sciences"], kind: "reports", url: "https://www.osti.gov",
  },
  cinii: {
    label: "CiNii Research", blurb: "Japanese and Asian research: articles, theses and books, many in English (NII Japan)", color: "#79c0ff",
    region: "Japan", fields: ["all"], kind: "index", url: "https://cir.nii.ac.jp",
  },
  jstage: {
    label: "J-STAGE", blurb: "3,000+ journals published in Japan: engineering, medicine, agriculture, education (JST)", color: "#ffa198",
    region: "Japan", fields: ["all"], kind: "journals", url: "https://www.jstage.jst.go.jp",
  },
  figshare: {
    label: "Figshare", blurb: "University and publisher repository items: journal articles, theses and conference papers", color: "#556cd6",
    region: "Global", fields: ["all"], kind: "repository", url: "https://figshare.com",
  },
  worldbank: {
    label: "World Bank OKR", blurb: "World Bank research, working papers and country studies on development, poverty, health and education, all free", color: "#2f81f7",
    region: "Global (World Bank)", fields: ["social", "business", "education", "agriculture"], kind: "reports", url: "https://openknowledge.worldbank.org",
  },
  cgspace: {
    label: "CGSpace (CGIAR)", blurb: "Agricultural research from CGIAR centres incl. IRRI (Los Baños): crops, fisheries, livestock, nutrition, climate", color: "#56d364",
    region: "Global (CGIAR)", fields: ["agriculture", "sciences"], kind: "repository", url: "https://cgspace.cgiar.org",
  },
  idrc: {
    label: "IDRC Digital Library", blurb: "Development research funded by IDRC across Asia, Africa and Latin America, free to read", color: "#e8912d",
    region: "Global South (IDRC, Canada)", fields: ["social", "medicine", "agriculture", "education"], kind: "reports", url: "https://idl-bnc-idrc.dspacedirect.org",
  },
  pmc: {
    label: "PubMed Central", blurb: "10M+ full-text medical and life-science articles from the U.S. National Library of Medicine, all free", color: "#f2a65a",
    region: "United States", fields: ["medicine", "sciences"], kind: "journals", url: "https://pmc.ncbi.nlm.nih.gov",
  },
  ntrs: {
    label: "NASA NTRS", blurb: "NASA technical reports, conference papers and journal reprints: aerospace, Earth science, materials, engineering", color: "#0b3d91",
    region: "United States", fields: ["engineering", "sciences"], kind: "reports", url: "https://ntrs.nasa.gov",
  },
  econbiz: {
    label: "EconBiz", blurb: "Economics and business: articles, working papers and books from RePEc, EconStor and publishers (ZBW Germany)", color: "#d4a72c",
    region: "Global (ZBW, Germany)", fields: ["business", "social"], kind: "index", url: "https://www.econbiz.de",
  },
  usgs: {
    label: "USGS Publications", blurb: "U.S. Geological Survey reports and articles: earthquakes, volcanoes, water, minerals, ecosystems, climate", color: "#6e9a3c",
    region: "United States", fields: ["sciences", "agriculture", "engineering"], kind: "reports", url: "https://pubs.usgs.gov",
  },
} satisfies Record<string, SourceMeta>;

/** Every source id. lib/sources/registry.ts must have an adapter for each one. */
export type SourceId = keyof typeof META;

/** Metadata by id; indexable by any string, since ids arrive from the API. */
export const SOURCE_META: Record<string, SourceMeta> = META;

/** Number of sources that work out of the box, with no API key. */
export const KEYLESS_SOURCE_COUNT = Object.values(SOURCE_META).filter((s) => !s.needsKey).length;

/** Badge colors for a source, derived from its hex color. */
export function sourceStyle(id: string): { bg: string; color: string; border: string } {
  const hex = SOURCE_META[id]?.color;
  if (!hex) return { bg: "rgba(139,148,158,0.1)", color: "rgb(var(--muted))", border: "rgb(var(--border))" };
  return { bg: `${hex}1a`, color: hex, border: `${hex}4d` };
}

export function sourceLabel(id: string): string {
  return SOURCE_META[id]?.label ?? id;
}
