/**
 * Canonical paper shape used across the app.
 * All data-source adapters normalize their results into this shape.
 */
export interface Paper {
  id: string;
  title: string;
  authors: string[];
  year: number | null;
  /** ISO date string if available */
  publishedDate?: string | null;
  venue?: string | null;
  doi?: string | null;
  abstract?: string | null;
  /** Short AI-generated TLDR (Semantic Scholar provides these) */
  tldr?: string | null;
  /** Free full-text URL if known to be open access */
  openAccessUrl?: string | null;
  /**
   * The record's page at its source, for papers with no DOI (theses,
   * reports, regional journals); the only way to reach some of them.
   */
  url?: string | null;
  isOpenAccess?: boolean;
  citedByCount?: number;
  keywords?: string[];
  /** Which source(s) returned this paper */
  sources: string[];
  /** Pre-computed relevance score for sorting (0-100) */
  relevance?: number;
  /** True if the work has been retracted (OpenAlex, or Crossref / Retraction Watch). */
  retracted?: boolean;
  /** True if the publisher issued an expression of concern about the work. */
  concern?: boolean;
  /**
   * Peer-review status as far as the sources know: true = preprint (not
   * peer-reviewed), false = published in a journal, undefined = unknown.
   */
  preprint?: boolean;
}

/** A user's saved copy of a paper, with their annotations. */
export interface SavedPaper extends Paper {
  savedAt: number;
  /** Collection/group name, e.g. "Chapter 2 — Foreign studies" */
  collection?: string;
  tags: string[];
  notes?: string;
  readingStatus: "to-read" | "reading" | "done";
  /** Entries for the synthesis matrix */
  matrix?: Partial<Record<MatrixKey, string>>;
}

/** The synthesis matrix columns, in display order. */
export const MATRIX_KEYS = ["method", "findings", "limitations", "relevanceToTopic"] as const;
export type MatrixKey = (typeof MATRIX_KEYS)[number];
/** Longest text kept in one matrix cell; a Firestore document is capped at 1 MiB. */
export const MATRIX_CELL_MAX = 5000;

export interface SearchResult {
  papers: Paper[];
  /** Per-source status for the UI. */
  sources: Record<string, "ok" | "error" | "empty">;
  /** Short reason for each source that failed, e.g. "rate limited (429)". */
  errors?: Record<string, string>;
  tookMs: number;
}
