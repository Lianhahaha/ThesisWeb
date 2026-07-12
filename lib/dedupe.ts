import type { Paper } from "@/lib/types";
import { normalizeTitle } from "@/lib/utils";

/**
 * Merge papers from multiple sources.
 * - Match by DOI first (exact), then by normalized-title + year similarity.
 * - When two records describe the same work, union their fields — prefer the
 *   source that has a non-empty value, and prefer S2 TLDRs and OA URLs.
 */
export function dedupePapers(papers: Paper[]): Paper[] {
  const byDoi = new Map<string, Paper>();
  const byTitleYear = new Map<string, Paper>();
  const out: Paper[] = [];

  for (const p of papers) {
    // 1) DOI match
    if (p.doi) {
      const key = p.doi.toLowerCase();
      const existing = byDoi.get(key);
      if (existing) {
        mergeInto(existing, p);
        continue;
      }
      byDoi.set(key, p);
      out.push(p);
      continue;
    }

    // 2) Title + year match (no DOI available)
    const titleKey = normalizeTitle(p.title).slice(0, 80);
    const tyKey = `${titleKey}|${p.year ?? ""}`;
    const existingTy = byTitleYear.get(tyKey);
    if (existingTy) {
      mergeInto(existingTy, p);
      continue;
    }
    byTitleYear.set(tyKey, p);
    out.push(p);
  }

  return out;
}

/** Merge `src` into `dest` in place, preferring the richer field. */
function mergeInto(dest: Paper, src: Paper): void {
  dest.sources = Array.from(new Set([...dest.sources, ...src.sources]));
  if (!dest.abstract && src.abstract) dest.abstract = src.abstract;
  if (!dest.tldr && src.tldr) dest.tldr = src.tldr;
  if (!dest.openAccessUrl && src.openAccessUrl) dest.openAccessUrl = src.openAccessUrl;
  if (src.isOpenAccess) dest.isOpenAccess = true;
  if ((src.citedByCount ?? 0) > (dest.citedByCount ?? 0)) dest.citedByCount = src.citedByCount;
  if (!dest.venue && src.venue) dest.venue = src.venue;
  if (!dest.doi && src.doi) dest.doi = src.doi;
  if (dest.authors.length === 0 && src.authors.length) dest.authors = src.authors;
  if ((dest.keywords?.length ?? 0) < (src.keywords?.length ?? 0)) dest.keywords = src.keywords;
}

/**
 * Assign a 0-100 relevance score to each paper for ranking.
 * Combines: title/abstract term overlap with the query + citation signal.
 * This is a heuristic stand-in for true semantic relevance (which would need an LLM).
 */
export function scoreRelevance(papers: Paper[], query: string): Paper[] {
  const queryLower = query.toLowerCase();
  const qTerms = new Set(
    queryLower
      .split(/\s+/)
      .filter((t) => t.length > 2)
      .map((t) => t.replace(/[^a-z0-9]/g, ""))
  );
  if (qTerms.size === 0) return papers;

  const maxCites = Math.max(1, ...papers.map((p) => p.citedByCount ?? 0));

  return papers
    .map((p) => {
      const titleLower = (p.title || "").toLowerCase();
      const absLower = (p.abstract || "").toLowerCase();
      const hay = normalizeTitle(titleLower + " " + absLower);
      const hayTerms = hay.split(" ");
      
      let hits = 0;
      for (const t of hayTerms) {
        if (qTerms.has(t)) hits++;
      }
      
      // Exact phrase match bonus
      const exactPhraseBonus = (titleLower.includes(queryLower) ? 30 : 0) + (absLower.includes(queryLower) ? 15 : 0);

      const termScore = Math.min(60, (hits / qTerms.size) * 40) + exactPhraseBonus;
      const citeScore = Math.log10(((p.citedByCount ?? 0) + 1) / (maxCites + 1)) * 10 + 10;
      
      // If there are zero matching terms and no exact phrase, this paper is completely irrelevant
      // We set relevance to -1 so it gets aggressively filtered out.
      if (hits === 0 && exactPhraseBonus === 0) {
        p.relevance = -1;
      } else {
        p.relevance = Math.round(Math.max(0, Math.min(100, termScore + citeScore)));
      }
      return p;
    })
    // Filter out completely irrelevant results (0 term hits and no exact phrase)
    .filter((p) => (p.relevance ?? 0) > 0)
    .sort((a, b) => (b.relevance ?? 0) - (a.relevance ?? 0));
}
