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
  isOpenAccess?: boolean;
  citedByCount?: number;
  keywords?: string[];
  /** Which source(s) returned this paper */
  sources: string[];
  /** Pre-computed relevance score for sorting (0-100) */
  relevance?: number;
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
  matrix?: {
    method?: string;
    findings?: string;
    limitations?: string;
    relevanceToTopic?: string;
  };
}

export interface SearchFilters {
  query: string;
  /** Only papers from this year onward. Default: current year - 5. */
  fromYear?: number;
  /** Cap results per source. */
  perSource?: number;
  /** Optional field filter — title/abstract vs. full text. */
  openAccessOnly?: boolean;
}

export interface SearchResult {
  papers: Paper[];
  /** Per-source status for the UI. */
  sources: Record<string, "ok" | "error" | "empty">;
  tookMs: number;
}
