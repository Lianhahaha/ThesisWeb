/**
 * Turn a paragraph describing a topic into something the databases can answer.
 * This is the "understand the question" half of topic search, and it is
 * deliberately deterministic: no model, no key, no per-request cost. What the
 * description adds over a keyword box is the *intent* — "I am writing about how
 * small shops in the province track their stock" becomes the words that
 * actually appear in titles and abstracts, plus the filters the sentence
 * implies (Philippines, open access).
 */

import type { Paper } from "@/lib/types";

/** Words that carry no topic, including the filler people type in a sentence. */
const FILLER = new Set([
  "i", "im", "i'm", "we", "my", "our", "you", "your", "he", "she", "it", "they",
  "the", "a", "an", "and", "or", "but", "of", "in", "on", "at", "to", "for", "with",
  "by", "from", "about", "into", "over", "under", "between", "among", "as", "than",
  "is", "are", "was", "were", "be", "been", "being", "am", "do", "does", "did",
  "have", "has", "had", "will", "would", "can", "could", "should", "may", "might",
  "this", "that", "these", "those", "there", "here", "what", "which", "who", "whom",
  "when", "where", "why", "how", "write", "writing", "written", "thesis", "theses",
  "keep", "keeps", "kept", "track", "tracks", "tracking", "their", "them", "they",
  "research", "study", "studies", "paper", "papers", "literature", "review", "rrl",
  "related", "topic", "topics", "want", "wants", "wanted", "need", "needs", "like",
  "looking", "look", "find", "finding", "help", "helping", "using", "use", "used",
  "effect", "effects", "impact", "impacts", "role", "relationship", "between",
  "among", "based", "focus", "focusing", "focused", "specifically", "especially",
  "also", "very", "really", "just", "some", "any", "all", "more", "most", "other",
  "such", "so", "because", "while", "during", "within", "without", "through",
]);

/** Up to this many describing words are sent to the databases. */
const MAX_TERMS = 6;

export interface TopicPlan {
  /** The query the databases receive. */
  query: string;
  /** The words that carried the topic, in the order they were written. */
  terms: string[];
  /** Adjacent pairs of those words, e.g. "sari-sari owners". */
  phrases: string[];
  /** Country filter the description asked for, if any. */
  country: string | null;
  /** True when the description asked for free full text. */
  openAccessOnly: boolean;
}

const COUNTRY_PATTERNS: [RegExp, string][] = [
  [/\bphilippines?\b|\bfilipino\b|\bpinoy\b/i, "Philippines"],
  [/\bindonesia\b|\bindonesian\b/i, "Indonesia"],
  [/\bmalaysia\b|\bmalaysian\b/i, "Malaysia"],
  [/\bvietnam\b|\bvietnamese\b/i, "Vietnam"],
  [/\bthailand\b|\bthai\b/i, "Thailand"],
];

/** The plan for a description, or null when it holds nothing searchable. */
export function planTopic(description: string): TopicPlan | null {
  const text = description.replace(/\s+/g, " ").trim().slice(0, 500);
  if (!text) return null;

  const words = text
    .split(/[\s,;:.!?()"'“”‘’]+/)
    .map((w) => w.replace(/^[^\p{L}\p{N}-]+|[^\p{L}\p{N}-]+$/gu, ""))
    .filter(Boolean);

  const terms: string[] = [];
  for (const word of words) {
    const key = word.toLowerCase();
    if (key.length < 3 && !/[^\x00-\x7F]/.test(key)) continue;
    if (FILLER.has(key)) continue;
    if (/^\d{4}$/.test(key)) continue;
    if (!terms.some((t) => t.toLowerCase() === key)) {
      // Lowercase keeps queries consistent; an acronym written in capitals stays.
      terms.push(word === word.toUpperCase() && word.length <= 5 ? word : key);
    }
    if (terms.length === MAX_TERMS) break;
  }
  if (terms.length === 0) return null;

  const country = COUNTRY_PATTERNS.find(([pattern]) => pattern.test(text))?.[1] ?? null;
  const openAccessOnly = /\bopen access\b|\bfree full text\b|\bfull text\b|\bpdf\b/i.test(text);

  const phrases: string[] = [];
  for (let i = 0; i < terms.length - 1; i++) {
    phrases.push(`${terms[i].toLowerCase()} ${terms[i + 1].toLowerCase()}`);
  }

  return { query: terms.join(" "), terms, phrases, country, openAccessOnly };
}

/**
 * Re-order what came back so the papers that actually answer the description
 * sit on top. Retrieval was done with the six topic words (the databases AND
 * them); this second pass weighs how much of the *description* a record
 * covers, with a phrase in the title worth the most.
 *
 * It only reorders — nothing is dropped here, so a thin description can never
 * empty the result set.
 */
export function rankTopicPapers(papers: Paper[], plan: TopicPlan): Paper[] {
  const terms = plan.terms.map((t) => t.toLowerCase());
  const score = (p: Paper): number => {
    const title = (p.title || "").toLowerCase();
    const body = `${p.abstract ?? ""} ${(p.keywords ?? []).join(" ")}`.toLowerCase();
    let total = 0;
    for (const term of terms) {
      if (title.includes(term)) total += 3;
      else if (body.includes(term)) total += 1;
    }
    for (const phrase of plan.phrases) {
      if (title.includes(phrase)) total += 4;
      else if (body.includes(phrase)) total += 2;
    }
    return total;
  };

  return papers
    .map((paper, index) => ({ paper, index, score: score(paper) }))
    .sort(
      (a, b) =>
        b.score - a.score ||
        (b.paper.citedByCount ?? 0) - (a.paper.citedByCount ?? 0) ||
        a.index - b.index
    )
    .map((entry) => entry.paper);
}
