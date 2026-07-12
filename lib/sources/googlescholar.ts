import { paperId } from "@/lib/utils";
import type { Paper } from "@/lib/types";

/**
 * Google Scholar adapter — free scraping via the `scholarly` npm package.
 * No API key required. Retries up to 3 times with random delays to handle
 * Google's rate limiting / CAPTCHAs. Fails silently after exhausting retries.
 */

let scholarly: typeof import("scholarly") | null = null;

async function getScholarly() {
  if (!scholarly) {
    scholarly = await import("scholarly");
  }
  return scholarly;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function searchGoogleScholar(
  query: string,
  opts: { fromYear?: number; perSource?: number } = {}
): Promise<Paper[]> {
  const { fromYear, perSource = 15 } = opts;
  const MAX_RETRIES = 3;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const s = await getScholarly();
      const results = await s.search(query);

      const papers: Paper[] = [];
      for (const it of results.slice(0, perSource)) {
        const title = it.title || "Untitled";
        const year = it.year ? Number(it.year) : null;

        if (fromYear && year && year < fromYear) continue;

        const doi = it.url?.match(/doi\.org\/(.+)/)?.[1] || null;

        papers.push({
          id: paperId(doi, title),
          title,
          authors: it.authors || [],
          year,
          venue: it.publication || it.journal || null,
          doi,
          openAccessUrl: it.url || null,
          isOpenAccess: false,
          citedByCount: it.numCitations ?? 0,
          sources: ["google_scholar"],
        });
      }
      return papers;
    } catch {
      // Rate limited or blocked — wait before retrying
      if (attempt < MAX_RETRIES - 1) {
        await sleep(2000 + Math.random() * 3000);
      }
    }
  }

  // All retries exhausted — fail silently
  return [];
}
