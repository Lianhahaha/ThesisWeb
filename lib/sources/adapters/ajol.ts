import { fetchWithTimeout } from "@/lib/server/http";
import { USER_AGENT } from "@/lib/server/config";
import { stripHtml } from "@/lib/text";
import type { Paper } from "@/lib/types";
import type { AdapterOptions } from "@/lib/sources/types";
import { ojsAdapter } from "@/lib/sources/platforms/ojs";

/**
 * African Journals Online: 1,000+ peer-reviewed African journals across
 * health, agriculture, engineering, education and the social sciences.
 * The OJS search results carry the journal code in the article URL, not its
 * title, so the title is read from the journal's landing page and cached.
 * https://www.ajol.info
 */

const BASE = "https://www.ajol.info";
const TITLE_TTL_MS = 30 * 24 * 60 * 60 * 1000;
const titles = new Map<string, { at: number; title: string }>();

async function journalTitle(code: string): Promise<string | null> {
  const hit = titles.get(code);
  if (hit && Date.now() - hit.at < TITLE_TTL_MS) return hit.title;
  try {
    const res = await fetchWithTimeout(`${BASE}/index.php/${encodeURIComponent(code)}`, { headers: { "User-Agent": USER_AGENT } }, 5000);
    if (!res.ok) return null;
    const html = await res.text();
    const meta = html.match(/<meta name="citation_journal_title" content="([^"]*)"/i)?.[1];
    const titleTag = html.match(/<title>([\s\S]*?)<\/title>/i)?.[1];
    const title = stripHtml(meta ?? titleTag ?? "").replace(/^archives?\s*\|\s*/i, "").trim();
    if (title) titles.set(code, { at: Date.now(), title });
    return title || null;
  } catch {
    return null;
  }
}

const run = ojsAdapter({
  id: "ajol",
  searchUrl: `${BASE}/index.php/index/search/search`,
  publisher: "African Journals Online",
});

export async function searchAjol(query: string, opts: AdapterOptions = {}): Promise<Paper[]> {
  const papers = await run(query, opts);
  const codes = new Set<string>();
  for (const p of papers) {
    const code = p.url?.match(/\/index\.php\/([^/]+)\/article\//)?.[1];
    if (code) codes.add(code);
  }
  await Promise.all(
    [...codes].map(async (code) => {
      const title = await journalTitle(code);
      if (!title) return;
      for (const p of papers) {
        if (p.url?.includes(`/index.php/${code}/article/`)) p.venue = title;
      }
    })
  );
  return papers;
}
