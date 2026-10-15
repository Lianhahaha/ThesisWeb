"use client";

import type { Paper } from "@/lib/types";
import { buildSearchParams, type SearchInput } from "@/lib/search/params";

/**
 * Reads a streamed search (/api/search?stream=1): one JSON line per database
 * as it answers, then a "done" line. The page shows and re-ranks results as
 * they arrive instead of waiting for the slowest database.
 */

export interface SourceUpdate {
  id: string;
  status: "ok" | "error" | "empty";
  papers: Paper[];
  error: string;
}

type Line =
  | ({ type: "source" } & SourceUpdate)
  | { type: "done"; tookMs: number }
  | { type: "error"; error: string };

/**
 * Run a search, calling `onSource` for each database as it answers. Resolves
 * with the total time when every database has answered; rejects on an HTTP
 * error (with the server's message, e.g. the rate limit) or a cut-off answer.
 */
export async function streamSearch(
  input: SearchInput,
  { signal, onSource }: { signal?: AbortSignal; onSource: (update: SourceUpdate) => void }
): Promise<{ tookMs: number }> {
  const res = await fetch(`/api/search?${buildSearchParams(input)}&stream=1`, { signal });
  if (!res.ok || !res.body) {
    const err = await res.json().catch(() => ({ error: "Search failed" }));
    throw new Error(err.error || "Search failed");
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let tookMs: number | null = null;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      buffer += decoder.decode(value, { stream: !done });
      // A line can arrive in pieces; only whole lines are read.
      let newline: number;
      while ((newline = buffer.indexOf("\n")) >= 0) {
        const text = buffer.slice(0, newline).trim();
        buffer = buffer.slice(newline + 1);
        if (!text) continue;
        const line = JSON.parse(text) as Line;
        if (line.type === "source") onSource(line);
        // The server closes right after; reading on to that end lets the request finish cleanly.
        else if (line.type === "done") tookMs = line.tookMs;
        else if (line.type === "error") throw new Error(line.error || "Search failed");
      }
      if (done) {
        if (tookMs === null) throw new Error("The search was cut off. Try again.");
        return { tookMs };
      }
    }
  } catch (e) {
    // Failed or stopped: let go of the connection.
    reader.cancel().catch(() => {});
    throw e;
  }
}
