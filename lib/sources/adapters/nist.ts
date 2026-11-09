import { paperId } from "@/lib/utils";
import { fetchWithTimeout, readText } from "@/lib/server/http";
import { USER_AGENT } from "@/lib/server/config";
import { stripHtml } from "@/lib/text";
import type { Paper } from "@/lib/types";
import type { AdapterOptions } from "@/lib/sources/types";

/**
 * NIST Publications: the National Institute of Standards and Technology's
 * papers, technical notes and reports on physics, chemistry, materials,
 * metrology, engineering, computing and cybersecurity, all free.
 * https://www.nist.gov/publications
 */

const BASE = "https://www.nist.gov";
const SEARCH = `${BASE}/publications/search`;

/** Parse the server-rendered NIST teaser list. Exported for tests. */
export function parseNist(html: string): Paper[] {
  const papers: Paper[] = [];
  const maxYear = new Date().getFullYear() + 1;

  for (const part of html.split(/<article\s+class="nist-teaser"/i).slice(1)) {
    const link = part.match(
      /<h3 class="nist-teaser__title"><a href="(\/publications\/[^"]+)">([\s\S]*?)<\/a><\/h3>/i
    );
    if (!link) continue;
    const title = stripHtml(link[2]);
    if (!title) continue;

    const date = part.match(/<div class="nist-teaser__date">\s*([\s\S]*?)<\/div>/i)?.[1];
    const rawYear = date ? Number(stripHtml(date).match(/\d{4}/)?.[0]) : null;
    const year = rawYear && rawYear >= 1000 && rawYear <= maxYear ? rawYear : null;

    const authorsBlock = part.match(/<div class="nist-field__item">([\s\S]*?)<\/div>/i)?.[1];
    const authors = authorsBlock
      ? stripHtml(authorsBlock)
          .split(/\s*,\s*/)
          .map((n) => n.trim())
          .filter(Boolean)
          .slice(0, 10)
      : [];

    const abstractBlock = part.match(/<div class="nist-teaser__content">([\s\S]*?)<\/div>/i)?.[1];
    const url = `${BASE}${link[1]}`;

    papers.push({
      id: paperId(null, title),
      title,
      authors,
      year,
      venue: "NIST",
      type: "report",
      doi: null,
      abstract: abstractBlock ? stripHtml(abstractBlock) : null,
      openAccessUrl: url,
      isOpenAccess: true,
      keywords: [],
      url,
      sources: ["nist"],
    });
  }
  return papers;
}

export async function searchNist(query: string, opts: AdapterOptions = {}): Promise<Paper[]> {
  const { fromYear, perSource = 15 } = opts;
  const params = new URLSearchParams({ keys: query });

  const res = await fetchWithTimeout(
    `${SEARCH}?${params}`,
    { headers: { "User-Agent": USER_AGENT, Accept: "text/html" } },
    15000
  );
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return parseNist(await readText(res))
    .filter((p) => !(fromYear && fromYear > 0 && p.year != null && p.year < fromYear))
    .slice(0, Math.max(1, perSource));
}
