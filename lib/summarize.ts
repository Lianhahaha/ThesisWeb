/**
 * Extractive summarization — TextRank-style sentence scoring.
 *
 * Why extractive (not abstractive)? We run "free/heuristic only" — no LLM API.
 * Extractive summarization picks the most central sentences from the text
 * itself, so the output is guaranteed to be the author's own words. That's
 * actually a FEATURE for a thesis tool: no risk of hallucinated claims, and
 * no risk of introducing AI-generated phrasing the detection tool will flag.
 *
 * Algorithm:
 * 1. Sentence tokenize (handles common abbreviations).
 * 2. Build a word-frequency map (lowercased, stopwords removed).
 * 3. Score each sentence = sum of its word frequencies, normalized by length.
 * 4. Penalize sentence position 0 slightly less (often the thesis statement).
 * 5. Return the top-N highest-scoring sentences in original order.
 */

const STOPWORDS = new Set([
  "a", "an", "the", "and", "or", "but", "if", "then", "else", "when", "at", "by",
  "for", "with", "about", "against", "between", "into", "through", "during",
  "before", "after", "above", "below", "to", "from", "up", "down", "in", "out",
  "on", "off", "over", "under", "again", "further", "is", "are", "was", "were",
  "be", "been", "being", "have", "has", "had", "do", "does", "did", "will",
  "would", "should", "could", "may", "might", "must", "shall", "can", "need",
  "of", "as", "this", "that", "these", "those", "it", "its", "they", "them",
  "their", "there", "here", "which", "who", "whom", "whose", "what", "we",
  "us", "our", "you", "your", "he", "she", "him", "her", "his", "i",
  "more", "most", "some", "such", "no", "nor", "not", "only", "own", "same",
  "so", "than", "too", "very", "just", "also", "because", "while", "where",
  "how", "all", "any", "both", "each", "few", "other", "s", "t",
]);

/** Split text into sentences, respecting common abbreviations. */
export function splitSentences(text: string): string[] {
  // Protect common abbreviations from being split on.
  const protected_ = text
    .replace(/\b(e\.g|i\.e|etc|vs|fig|eq|al|no|vol|pp|dr|prof|ph\.d)\./gi, (m) =>
      m.replace(".", "§")
    )
    .replace(/\b([A-Z])\./g, "$1§"); // initials like J. K.

  return protected_
    .split(/(?<=[.!?])\s+(?=[A-Z(])/)
    .map((s) => s.replace(/§/g, ".").trim())
    .filter((s) => s.length > 30 && s.split(/\s+/).length >= 5);
}

export interface SummaryResult {
  /** The summary text, top sentences in original order. */
  text: string;
  /** The sentences in the order they were selected (best first). */
  ranked: string[];
  /** Total sentences considered. */
  totalSentences: number;
  /** Compression ratio (summary length / source length). */
  compression: number;
}

/**
 * Produce an extractive summary of `text` containing approximately
 * `sentenceCount` sentences (or ~`ratio` of the source, whichever applies).
 */
export function summarize(text: string, opts?: { sentences?: number; ratio?: number }): SummaryResult {
  const cleaned = text.replace(/\s+/g, " ").trim();
  if (!cleaned) return { text: "", ranked: [], totalSentences: 0, compression: 0 };

  const sentences = splitSentences(cleaned);
  if (sentences.length === 0) {
    return { text: cleaned, ranked: [cleaned], totalSentences: 1, compression: 1 };
  }

  // Word frequency map
  const freq = new Map<string, number>();
  for (const s of sentences) {
    for (const w of s.toLowerCase().match(/[a-z][a-z-]+/g) || []) {
      if (STOPWORDS.has(w) || w.length < 3) continue;
      freq.set(w, (freq.get(w) || 0) + 1);
    }
  }
  // Normalize frequencies by the max
  const maxFreq = Math.max(1, ...freq.values());
  for (const [k, v] of freq) freq.set(k, v / maxFreq);

  // Score each sentence
  const scored = sentences.map((s, idx) => {
    const words = (s.toLowerCase().match(/[a-z][a-z-]+/g) || []).filter(
      (w) => !STOPWORDS.has(w) && w.length >= 3
    );
    if (words.length === 0) return { s, idx, score: 0 };
    const sum = words.reduce((acc, w) => acc + (freq.get(w) || 0), 0);
    const lengthPenalty = 1 + 0.3 * Math.abs(words.length - 18) / 18; // ideal ~18 words
    const positionBonus = idx === 0 ? 1.15 : idx === 1 ? 1.05 : 1; // lead sentences
    return { s, idx, score: (sum / words.length) * positionBonus / lengthPenalty };
  });

  const n =
    opts?.sentences ??
    Math.max(3, Math.min(8, Math.round(sentences.length * (opts?.ratio ?? 0.25))));

  const top = [...scored].sort((a, b) => b.score - a.score).slice(0, n);
  const ranked = top.map((t) => t.s);

  // Restore original order for readability
  const ordered = [...top].sort((a, b) => a.idx - b.idx).map((t) => t.s);
  const text2 = ordered.join(" ");

  return {
    text: text2,
    ranked,
    totalSentences: sentences.length,
    compression: text2.length / cleaned.length,
  };
}
