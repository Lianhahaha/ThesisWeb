/**
 * AI-text heuristic detector — a "submission pre-flight self-check".
 *
 * Updated for Intermediate Strictness & QuillBot-like precision via advanced footprinting.
 */

import { splitSentences } from "@/lib/summarize";

// Transition / connective phrases that LLMs overuse.
const TRANSITIONS = [
  "moreover", "furthermore", "additionally", "however", "nevertheless",
  "nonetheless", "in conclusion", "in summary", "to summarize", "it is important",
  "it is worth noting", "as a result", "consequently", "thus", "therefore",
  "subsequently", "in addition", "on the other hand", "notably", "interestingly",
  "indeed", "specifically", "essentially", "ultimately", "overall", "in essence",
];

// Sentence openers that LLMs reach for when structuring paragraphs.
const FORMULAIC_OPENERS = [
  "this shows that", "this demonstrates", "this highlights", "this indicates",
  "the results show", "the findings indicate", "the study reveals", "this suggests",
  "it can be seen", "as mentioned", "as discussed", "in this section",
  "this paper aims", "this study aims", "this research aims",
];

// LLM Vocabulary Footprint: Words statistically overrepresented in ChatGPT outputs compared to human academic writing.
const AI_VOCABULARY = [
  "delve", "tapestry", "multifaceted", "testament", "underscore", "pivotal",
  "seamless", "crucial", "imperative", "robust", "intricate", "navigate",
  "nuanced", "paradigm", "realm", "synergy", "comprehensive", "foster",
  "harness", "myriad", "plethora", "embark", "unleash", "elevate",
  "spearhead", "catalyst", "tailored", "leverage",
];

const COMMON_BIGRAMS = new Set([
  "of the", "in the", "to the", "on the", "for the", "with the", "by the",
  "at the", "from the", "as a", "is a", "is the", "was a", "in a", "to a",
  "that the", "it is", "this is", "there is", "are the", "was the", "of a",
  "this study", "the study", "the results", "the present", "the data",
  "the research", "the analysis", "these results", "our results", "our study",
]);

export interface AiCheckIssue {
  type: string;
  severity: "info" | "warn" | "high";
  excerpt?: string;
  message: string;
  suggestion?: string;
}

export interface FlaggedWord {
  word: string;
  type: "transition" | "ai-vocab" | "opener";
}

export interface AiCheckResult {
  aiLikelihood: number;
  band: "low" | "moderate" | "high";
  signals: {
    burstiness: number;
    lexicalRichness: number;
    transitionDensity: number;
    formulaicDensity: number;
    predictability: number;
    aiVocab: number;
  };
  issues: AiCheckIssue[];
  flaggedWords: FlaggedWord[];
  stats: {
    words: number;
    sentences: number;
    avgSentenceLen: number;
    sentenceLenStd: number;
    uniqueWordsRatio: number;
    transitionCount: number;
    aiVocabCount: number;
  };
}

export function checkAi(text: string): AiCheckResult {
  const cleaned = text.replace(/\s+/g, " ").trim();
  const words = cleaned.match(/[A-Za-z][A-Za-z'-]+/g) || [];
  const lower = cleaned.toLowerCase();
  const sentences = splitSentences(cleaned);

  const wordCount = words.length;
  const sentenceCount = Math.max(1, sentences.length);
  const flaggedWords: FlaggedWord[] = [];

  // --- Signal 1: Burstiness ---
  const sentenceWordCounts = sentences.map((s) => (s.match(/\S+/g) || []).length);
  const avgLen = sentenceWordCounts.reduce((a, b) => a + b, 0) / sentenceCount;
  const variance = sentenceWordCounts.reduce((a, b) => a + (b - avgLen) ** 2, 0) / sentenceCount;
  const std = Math.sqrt(variance);
  const burstinessScore = clamp(Math.round((5 - std) * 20), 0, 100);

  // --- Signal 2: Lexical richness ---
  const unique = new Set(words.map((w) => w.toLowerCase()));
  const ttr = unique.size / Math.max(1, wordCount);
  const richnessScore = clamp(Math.round((0.55 - ttr) * 200), 0, 100);

  // --- Signal 3: Transition-word density ---
  let transitionHits = 0;
  const flaggedTransitions: string[] = [];
  for (const t of TRANSITIONS) {
    const re = new RegExp(`\\b${t}\\b`, "gi");
    const matches = lower.match(re);
    if (matches) {
      transitionHits += matches.length;
      flaggedWords.push({ word: t, type: "transition" });
      if (matches.length >= 2) flaggedTransitions.push(t);
    }
  }
  const transitionDensity = transitionHits / sentenceCount;
  const transitionScore = clamp(Math.round(transitionDensity * 150), 0, 100);

  // --- Signal 4: Formulaic openers ---
  let openerHits = 0;
  const sentencesLower = sentences.map((s) => s.toLowerCase());
  for (const opener of FORMULAIC_OPENERS) {
    for (const s of sentencesLower) {
      if (s.startsWith(opener)) {
        openerHits++;
        flaggedWords.push({ word: opener, type: "opener" });
      }
    }
  }
  const formulaicDensity = openerHits / sentenceCount;
  const formulaicScore = clamp(Math.round(formulaicDensity * 200), 0, 100);

  // --- Signal 5: AI Vocabulary Footprint ---
  let aiVocabHits = 0;
  const flaggedVocab: string[] = [];
  for (const v of AI_VOCABULARY) {
    const re = new RegExp(`\\b${v}\\b`, "gi");
    const matches = lower.match(re);
    if (matches) {
      aiVocabHits += matches.length;
      flaggedVocab.push(v);
      flaggedWords.push({ word: v, type: "ai-vocab" });
    }
  }
  const aiVocabDensity = aiVocabHits / Math.max(1, wordCount);
  const aiVocabScore = clamp(Math.round(aiVocabDensity * 2500), 0, 100);

  // --- Signal 6: Predictability ---
  const bigrams: string[] = [];
  for (let i = 0; i < words.length - 1; i++) {
    bigrams.push(`${words[i].toLowerCase()} ${words[i + 1].toLowerCase()}`);
  }
  const commonBigramCount = bigrams.filter((b) => COMMON_BIGRAMS.has(b)).length;
  const predictabilityScore = clamp(
    Math.round((commonBigramCount / Math.max(1, bigrams.length)) * 300), 0, 100
  );

  // --- Weighted overall score (Intermediate Strictness) ---
  // If multiple AI traits overlap strongly, penalize logarithmically
  let rawScore = 
    burstinessScore * 0.15 +
    richnessScore * 0.15 +
    transitionScore * 0.20 +
    formulaicScore * 0.15 +
    aiVocabScore * 0.25 +
    predictabilityScore * 0.10;

  // Intermediate strictness curve
  if (rawScore > 40) {
    rawScore = rawScore + (rawScore - 40) * 0.4;
  }
  
  const aiLikelihood = clamp(Math.round(rawScore), 0, 100);

  // --- Build actionable issues ---
  const issues: AiCheckIssue[] = [];

  if (burstinessScore >= 55) {
    issues.push({
      type: "sentence-length-uniformity",
      severity: burstinessScore >= 75 ? "high" : "warn",
      message: `Sentence length uniformity — your sentences are nearly the same length (avg ${avgLen.toFixed(0)} words).`,
      suggestion: "Vary sentence length deliberately. Mix short punchy sentences with longer ones.",
    });
  }

  if (flaggedVocab.length > 0) {
    issues.push({
      type: "ai-vocab",
      severity: flaggedVocab.length >= 3 ? "high" : "warn",
      message: `AI-like vocabulary detected: ${flaggedVocab.join(", ")}.`,
      suggestion: "These words are heavily overused by ChatGPT. Replace them with simpler, more direct terms.",
    });
  }

  for (const t of flaggedTransitions) {
    issues.push({
      type: "transition-overuse",
      severity: "warn",
      message: `The transition "${t}" appears multiple times.`,
      suggestion: `Human writers link ideas organically. Delete it or replace it.`,
    });
  }

  if (richnessScore >= 60) {
    issues.push({
      type: "low-richness",
      severity: "warn",
      message: `Low vocabulary variety (type-token ratio ${ttr.toFixed(2)}).`,
      suggestion: "Swap some repeats for synonyms.",
    });
  }

  // Order by severity
  const sevRank = { high: 0, warn: 1, info: 2 };
  issues.sort((a, b) => sevRank[a.severity] - sevRank[b.severity]);

  const band: AiCheckResult["band"] =
    aiLikelihood >= 65 ? "high" : aiLikelihood >= 35 ? "moderate" : "low";

  return {
    aiLikelihood,
    band,
    signals: {
      burstiness: burstinessScore,
      lexicalRichness: richnessScore,
      transitionDensity: transitionScore,
      formulaicDensity: formulaicScore,
      predictability: predictabilityScore,
      aiVocab: aiVocabScore,
    },
    issues,
    flaggedWords,
    stats: {
      words: wordCount,
      sentences: sentenceCount,
      avgSentenceLen: avgLen,
      sentenceLenStd: std,
      uniqueWordsRatio: ttr,
      transitionCount: transitionHits,
      aiVocabCount: aiVocabHits,
    },
  };
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n));
}
