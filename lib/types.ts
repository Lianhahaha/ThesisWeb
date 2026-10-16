/** Kinds of work, each cited differently (lib/citations.ts). */
export const WORK_TYPES = ["article", "preprint", "thesis", "report", "book", "chapter", "conference", "other"] as const;
export type WorkType = (typeof WORK_TYPES)[number];

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
  /**
   * What kind of work this is, when the source says. Unset means unknown;
   * citations then guess from the source and venue (workType in lib/citations.ts).
   */
  type?: WorkType;
  /** Journal volume, issue and page range ("45-67"), when the source gives them. */
  volume?: string | null;
  issue?: string | null;
  pages?: string | null;
  /** Publisher of a book or report, or the university that awarded a thesis. */
  publisher?: string | null;
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

/** A publisher notice on a paper, from the retraction check (lib/server/retractions.ts). */
export type IntegrityStatus = "retracted" | "concern";

/** How far the student has got with a saved paper. */
export type ReadingStatus = "to-read" | "reading" | "done";
export const READING_STATUSES: { key: ReadingStatus; label: string }[] = [
  { key: "to-read", label: "To read" },
  { key: "reading", label: "Reading" },
  { key: "done", label: "Done" },
];

/** A user's saved copy of a paper, with their annotations. */
export interface SavedPaper extends Paper {
  savedAt: number;
  /** Collection/group name, e.g. "Chapter 2 — Foreign studies" */
  collection?: string;
  tags: string[];
  notes?: string;
  readingStatus: ReadingStatus;
  /** Local or foreign, when the student set it; otherwise guessed (lib/library/scope.ts). */
  scope?: "local" | "foreign";
  /** Entries for the synthesis matrix */
  matrix?: Partial<Record<MatrixKey, string>>;
}

/** The synthesis matrix columns, in display order. */
export const MATRIX_KEYS = ["method", "findings", "limitations", "relevanceToTopic"] as const;
export type MatrixKey = (typeof MATRIX_KEYS)[number];
/** The columns' names, wherever the matrix is shown, shared or downloaded. */
export const MATRIX_LABELS: Record<MatrixKey, string> = {
  method: "Method",
  findings: "Findings",
  limitations: "Limitations",
  relevanceToTopic: "Relevance to my topic",
};
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
