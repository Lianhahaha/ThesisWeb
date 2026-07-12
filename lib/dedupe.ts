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

// ─── Stop words ─────────────────────────────────────────────────────────────

const STOP_WORDS = new Set([
  "the", "a", "an", "and", "or", "but", "in", "on", "at", "to", "for",
  "of", "with", "by", "from", "as", "is", "was", "are", "were", "be",
  "been", "being", "have", "has", "had", "do", "does", "did", "will",
  "would", "could", "should", "may", "might", "shall", "can", "need",
  "dare", "ought", "used", "this", "that", "these", "those", "i", "me",
  "my", "myself", "we", "our", "ours", "ourselves", "you", "your",
  "yours", "yourself", "yourselves", "he", "him", "his", "himself",
  "she", "her", "hers", "herself", "it", "its", "itself", "they",
  "them", "their", "theirs", "themselves", "what", "which", "who",
  "whom", "when", "where", "why", "how", "all", "each", "every",
  "both", "few", "more", "most", "other", "some", "such", "no", "nor",
  "not", "only", "own", "same", "so", "than", "too", "very", "s", "t",
  "just", "don", "now",
]);

// ─── Simple stemmer ─────────────────────────────────────────────────────────

/**
 * Basic English stemmer for matching word variations.
 * Handles: plurals (-s, -es), past tense (-ed), -ing, -tion/-sion, -ment/-ness, -er/-or
 */
function stem(word: string): string {
  if (word.length <= 4) return word;

  // -ing: teaching → teach, running → run
  if (word.endsWith("ing") && word.length > 5) {
    const base = word.slice(0, -3);
    // Double consonant: running → runn → run
    if (base.length > 2 && base[base.length - 1] === base[base.length - 2]) {
      return base.slice(0, -1);
    }
    // teaching → teach (keep the 'h')
    if (base.endsWith("t")) return base;
    // If removing -ing leaves nothing, just return original
    return base.length > 2 ? base : word;
  }

  // -ed: perceptions → percept (handled below), taught → taught
  if (word.endsWith("ed") && word.length > 5) {
    return word.slice(0, -2);
  }

  // -tion/-sion: perception → percept, education → educat
  if (word.endsWith("tion") && word.length > 6) return word.slice(0, -4);
  if (word.endsWith("sion") && word.length > 6) return word.slice(0, -4);

  // -ment: assessment → assess
  if (word.endsWith("ment") && word.length > 6) return word.slice(0, -4);

  // -ness: awareness → aware
  if (word.endsWith("ness") && word.length > 6) return word.slice(0, -4);

  // -er/-or: teacher → teach, instructor → instruct
  if (word.endsWith("er") && word.length > 5) return word.slice(0, -2);
  if (word.endsWith("or") && word.length > 5) return word.slice(0, -2);

  // -al: educational → educat (already handled by -tion)
  if (word.endsWith("al") && word.length > 5) return word.slice(0, -2);

  // -s/-es: perceptions → percept, teachers → teacher → teach
  if (word.endsWith("es") && word.length > 5) return word.slice(0, -2);
  if (word.endsWith("s") && word.length > 4) return word.slice(0, -1);

  return word;
}

// ─── Tokenization helpers ───────────────────────────────────────────────────

function tokenizeQuery(query: string): string[] {
  return query
    .toLowerCase()
    .split(/\s+/)
    .map((t) => t.replace(/[^a-z0-9]/g, ""))
    .filter((t) => t.length > 2 && !STOP_WORDS.has(t));
}

function stemTokenize(text: string): Set<string> {
  const words = normalizeTitle(text)
    .split(/\s+/)
    .filter((t) => t.length > 2);
  // Return both original and stemmed forms for matching
  const result = new Set<string>();
  for (const w of words) {
    result.add(w);
    result.add(stem(w));
  }
  return result;
}

function bigrams(text: string): string[] {
  const words = normalizeTitle(text)
    .split(/\s+/)
    .filter((t) => t.length > 2);
  const pairs: string[] = [];
  for (let i = 0; i < words.length - 1; i++) {
    pairs.push(`${words[i]} ${words[i + 1]}`);
  }
  return pairs;
}

// ─── Relevance scoring ──────────────────────────────────────────────────────

/**
 * Google-like relevance scoring with stemming.
 *
 * Key improvements:
 * 1. Stemming: "perception" matches "perceptions", "teacher" matches "teachers"
 * 2. Balanced filtering: requires some title OR abstract match, but not too strict
 * 3. Minimum score of 25 (not too high, not too low)
 */
export function scoreRelevance(papers: Paper[], query: string): Paper[] {
  const qTerms = tokenizeQuery(query);
  const qLower = query.toLowerCase().trim();
  const qTermCount = qTerms.length;
  if (qTermCount === 0) return papers;

  // Stem query terms for matching
  const qStems = new Set(qTerms.map(stem));
  const qBigrams = bigrams(query);
  const qBigramSet = new Set(qBigrams);

  const maxCites = Math.max(1, ...papers.map((p) => p.citedByCount ?? 0));
  const currentYear = new Date().getFullYear();

  return papers
    .map((p) => {
      const titleLower = (p.title || "").toLowerCase();
      const absLower = (p.abstract || "").toLowerCase();

      // ── 1. Title term coverage with stemming (0-40 points) ──
      const titleTokens = stemTokenize(titleLower);
      let titleHits = 0;
      for (const t of qTerms) {
        // Match exact or stemmed form
        if (titleTokens.has(t) || titleTokens.has(stem(t))) {
          titleHits++;
        }
      }
      const titleCoverage = titleHits / qTermCount;
      const titleScore = titleCoverage * 40;

      // ── 2. Abstract term coverage with stemming (0-15 points) ──
      const absTokens = stemTokenize(absLower);
      let absHits = 0;
      for (const t of qTerms) {
        if (absTokens.has(t) || absTokens.has(stem(t))) {
          absHits++;
        }
      }
      const absCoverage = absHits / qTermCount;
      const absScore = absCoverage * 15;

      // ── 3. Exact phrase match bonus (0-30 points) ──
      let phraseScore = 0;
      // Check if all query terms appear in order (with stemming)
      const phraseRegex = new RegExp(
        qTerms.map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("\\s+"),
        "i"
      );
      if (phraseRegex.test(titleLower)) {
        phraseScore = 30; // All terms in order in title
      } else if (phraseRegex.test(absLower)) {
        phraseScore = 15; // All terms in order in abstract
      } else if (titleLower.includes(qLower)) {
        phraseScore = 25; // Exact phrase substring in title
      } else if (absLower.includes(qLower)) {
        phraseScore = 10; // Exact phrase substring in abstract
      }

      // ── 4. Bigram overlap bonus (0-10 points) ──
      const titleBigrams = bigrams(titleLower);
      const absBigrams = bigrams(absLower);
      const allBigrams = new Set([...titleBigrams, ...absBigrams]);
      let bigramHits = 0;
      for (const bg of qBigramSet) {
        if (allBigrams.has(bg)) bigramHits++;
      }
      const bigramScore = qBigrams.length > 0
        ? (bigramHits / qBigrams.length) * 10
        : 0;

      // ── 5. Title position bonus (0-5 points) ──
      const titleWords = titleLower.split(/\s+/).filter(w => w.length > 2);
      const firstN = titleWords.slice(0, Math.min(6, titleWords.length));
      let positionHits = 0;
      for (const t of qTerms) {
        if (firstN.some(w => w === t || stem(w) === stem(t))) positionHits++;
      }
      const positionScore = qTermCount > 0
        ? (positionHits / qTermCount) * 5
        : 0;

      // ── 6. Recency bonus (0-3 points) ──
      let recencyScore = 0;
      if (p.year) {
        const age = currentYear - p.year;
        if (age <= 1) recencyScore = 3;
        else if (age <= 3) recencyScore = 2;
        else if (age <= 5) recencyScore = 1;
      }

      // ── 7. Citation authority signal (0-5 points) ──
      const citeScore = Math.log10(((p.citedByCount ?? 0) + 1) / (maxCites + 1)) * 3 + 5;

      // ── Total raw score ──
      const raw = titleScore + absScore + phraseScore + bigramScore + positionScore + recencyScore + citeScore;

      // ── FILTERING (balanced) ──
      // Must have at least 25% coverage in title OR 30% coverage in abstract
      const passes = titleCoverage >= 0.25 || absCoverage >= 0.3;

      if (!passes || raw < 25) {
        p.relevance = -1; // Remove
      } else {
        p.relevance = Math.round(Math.max(0, Math.min(100, raw)));
      }

      return p;
    })
    .filter((p) => (p.relevance ?? 0) > 0)
    .sort((a, b) => (b.relevance ?? 0) - (a.relevance ?? 0));
}
