/**
 * Display metadata for every search source. Pure data (no adapter imports), so
 * it is safe to use from client components. Add new sources here so the
 * search page, dashboard and docs pick them up automatically.
 */

export interface SourceMeta {
  /** Human-readable name. */
  label: string;
  /** What it is good for — shown as a tooltip. */
  blurb: string;
  /** Badge color (hex). */
  color: string;
  /** True if the adapter is skipped unless an API key is configured. */
  needsKey?: boolean;
}

export const SOURCE_META: Record<string, SourceMeta> = {
  openalex:        { label: "OpenAlex",         blurb: "250M+ works across every field; primary discovery source", color: "#388bfd" },
  crossref:        { label: "Crossref",         blurb: "Publisher-deposited metadata and DOIs",                    color: "#3fb950" },
  semanticscholar: { label: "Semantic Scholar", blurb: "AI-written TLDRs and citation graph",                      color: "#bc8cff" },
  doaj:            { label: "DOAJ",             blurb: "Fully open-access journals worldwide",                     color: "#d29922" },
  europepmc:       { label: "Europe PMC",       blurb: "Life sciences, biomedical and preprints",                  color: "#64c4c4" },
  pubmed:          { label: "PubMed",           blurb: "Biomedical and health literature",                         color: "#f8814a" },
  arxiv:           { label: "arXiv",            blurb: "Preprints in physics, maths, CS, economics and more",      color: "#e06060" },
  core:            { label: "CORE",             blurb: "Open-access repositories and theses",                      color: "#a078ff", needsKey: true },
  base:            { label: "BASE",             blurb: "Institutional repositories and theses",                    color: "#ffa64d", needsKey: true },
  google_scholar:  { label: "Google Scholar",   blurb: "Broad coverage (best-effort scraping)",                    color: "#4285f4" },
  eric: { label: "ERIC", blurb: "Education research: articles, theses and reports (U.S. Dept. of Education)", color: "#e3b341" },
  zenodo: { label: "Zenodo", blurb: "Open articles, theses, reports and preprints from every field (CERN)", color: "#58a6ff" },
  hal: { label: "HAL", blurb: "French national open archive: articles, theses and reports (multilingual)", color: "#f778ba" },
  openaire: { label: "OpenAIRE", blurb: "European open-science graph: repositories, publishers and funder-linked research", color: "#ff7b72" },
  inspire: { label: "INSPIRE-HEP", blurb: "High-energy physics, astrophysics and cosmology (CERN, Fermilab, DESY)", color: "#a5d6ff" },
};

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
