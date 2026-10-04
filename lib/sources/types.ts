import type { Paper } from "@/lib/types";

/** Options every database adapter receives. */
export interface AdapterOptions {
  /** Earliest publication year to include; 0 or undefined = any year. */
  fromYear?: number;
  /** How many results to ask the database for. */
  perSource?: number;
  /** Only papers with free full text, where the database can tell. */
  openAccessOnly?: boolean;
}

/**
 * A database adapter: runs one search and returns papers in the app's shape.
 * Throw on HTTP or parse failures (the search shows the source as failed
 * with the error message); return [] when the database simply has no match.
 */
export type Adapter = (query: string, opts: AdapterOptions) => Promise<Paper[]>;

/** How the search engine calls an adapter. */
export interface AdapterEntry {
  run: Adapter;
  /**
   * True if the API understands `AND ("a" OR "b")`, used for country
   * scoping. Others get the country name appended as a plain extra word.
   */
  boolean: boolean;
  /** Per-source time limit; defaults to DEFAULT_DEADLINE_MS in lib/search.ts. */
  deadlineMs?: number;
}
