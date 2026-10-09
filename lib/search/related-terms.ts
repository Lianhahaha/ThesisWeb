import type { Paper } from "@/lib/types";
import { normalizeTitle } from "@/lib/utils";

/**
 * Suggest terms to narrow a search, taken from the keywords of the results
 * themselves. Students often don't know the vocabulary of a field yet; the
 * terms that recur across relevant papers are usually the ones to search next.
 */

/** Broad labels that appear on nearly everything and never narrow a search. */
const GENERIC = new Set([
  "foreign countries", "research", "study", "studies", "education", "science", "humans", "human",
  "male", "female", "adult", "article", "review", "psychology", "medicine", "biology", "chemistry",
  "physics", "mathematics", "computer science", "engineering", "business", "economics", "geography",
  "environmental science", "political science", "sociology", "philosophy", "history", "art",
  "materials science", "geology", "medicine (miscellaneous)", "open access",
]);

const MAX_LENGTH = 40;

export interface TermSuggestion {
  term: string;
  /** Number of results that carry this keyword. */
  count: number;
}

export function suggestTerms(papers: Paper[], query: string, max = 8): TermSuggestion[] {
  const queryWords = new Set(normalizeTitle(query).split(" ").filter(Boolean));
  const tally = new Map<string, { term: string; count: number }>();

  for (const p of papers) {
    // A paper lists a keyword once, even if two sources reported it differently.
    const seen = new Set<string>();
    for (const raw of p.keywords ?? []) {
      const term = raw.trim();
      // "Inclusion (mineral)" / "Education (General)" are concept-taxonomy
      // disambiguation labels, not phrases a student would search for.
      if (term.includes("(")) continue;
      const key = normalizeTitle(term);
      if (!key || key.length > MAX_LENGTH || seen.has(key) || GENERIC.has(key)) continue;
      seen.add(key);
      const entry = tally.get(key);
      if (entry) entry.count++;
      else tally.set(key, { term, count: 1 });
    }
  }

  return Array.from(tally.entries())
    // Drop terms already covered by the query (all their words are in it).
    .filter(([key]) => !key.split(" ").every((w) => queryWords.has(w)))
    .map(([, v]) => v)
    .filter((v) => v.count >= 2)
    .sort((a, b) => b.count - a.count || a.term.localeCompare(b.term))
    .slice(0, max);
}
