import { paperId } from "@/lib/utils";
import { fetchWithTimeout, readText } from "@/lib/server/http";
import { USER_AGENT } from "@/lib/server/config";
import { extractDoi, stripHtml } from "@/lib/text";
import type { Paper, WorkType } from "@/lib/types";
import type { AdapterOptions } from "@/lib/sources/types";

/**
 * PEDro (Physiotherapy Evidence Database): trials, systematic reviews and
 * practice guidelines with a methodological quality score. Useful for sports
 * science, rehabilitation and performance research.
 *
 * The results page gives titles and method; each detail page adds authors,
 * journal, year and DOI, so the adapter fetches a bounded number of details.
 * Free, no API key. https://search.pedro.org.au
 */

const BASE = "https://search.pedro.org.au";
const HEADERS = { "User-Agent": USER_AGENT, Accept: "text/html" };

interface Row {
  url: string;
  title: string;
  method: string;
}

function yearOf(text: string): number | null {
  const m = text.match(/\b(19|20)\d{2}\b/);
  return m ? Number(m[0]) : null;
}

function workType(method: string): WorkType {
  const m = method.toLowerCase();
  if (/guideline|policy/.test(m)) return "report";
  return "article";
}

/** "Prabhakaran S" -> "S Prabhakaran" so citations find the family name last. */
function pedroAuthor(name: string): string {
  const s = name.trim();
  const parts = s.split(/\s+/);
  if (parts.length === 2 && /^[A-Z]{1,3}$/.test(parts[1])) return `${parts[1]} ${parts[0]}`;
  return s;
}

async function mapLimit<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<(R | null)[]> {
  const out: (R | null)[] = new Array(items.length).fill(null);
  let next = 0;
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, async () => {
      for (;;) {
        const i = next++;
        if (i >= items.length) return;
        try {
          out[i] = await fn(items[i]);
        } catch {
          // One slow detail page is a missing record, not a failed source.
        }
      }
    })
  );
  return out;
}

export async function searchPedro(query: string, opts: AdapterOptions = {}): Promise<Paper[]> {
  const { fromYear, perSource = 15 } = opts;
  const res = await fetchWithTimeout(
    `${BASE}/search-results?calc_text=${encodeURIComponent(query)}`,
    { headers: HEADERS },
    14000
  );
  if (!res.ok) throw new Error(`PEDro ${res.status}`);
  const html = await readText(res);
  if (/No records found/i.test(html)) return [];
  if (!/search-results/i.test(html)) throw new Error("unexpected page");

  const rows: Row[] = [];
  for (const m of html.matchAll(/<tr>\s*<td><a href="([^"]+)"\s*class="left">([\s\S]*?)<\/a><\/td>\s*<td>([\s\S]*?)<\/td>/g)) {
    const title = stripHtml(m[2]);
    if (title) rows.push({ url: m[1], title, method: stripHtml(m[3]) });
    // Each detail page is a separate request; keep the fan-out bounded.
    if (rows.length >= Math.min(perSource, 6)) break;
  }

  const details = await mapLimit<Row, Paper | null>(rows, 4, async (row): Promise<Paper | null> => {
    const page = await fetchWithTimeout(row.url, { headers: HEADERS }, 9000);
    if (!page.ok) return null;
    const detail = await readText(page);
    const cells = [...detail.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/g)].map((m) => stripHtml(m[1]));
    const citation = cells[2] ?? "";
    const year = yearOf(citation);
    if (fromYear && year && year < fromYear) return null;
    const doi = extractDoi(detail.match(/https?:\/\/(?:dx\.)?doi\.org\/[^"'\s<>]+/i)?.[0] ?? null);
    const authors = (cells[1] ?? "")
      .split(",")
      .map(pedroAuthor)
      .filter(Boolean)
      .slice(0, 10);
    const venue = citation.replace(/\s+\b(19|20)\d{2}\b[\s\S]*$/, "").trim() || "PEDro";

    return {
      id: paperId(doi, row.title),
      title: row.title,
      authors,
      year,
      publishedDate: null,
      venue,
      type: workType(cells[3] || row.method),
      doi,
      abstract: null,
      openAccessUrl: null,
      isOpenAccess: false,
      url: row.url,
      keywords: [row.method].filter(Boolean).slice(0, 5),
      sources: ["pedro"],
    };
  });

  return details.filter((p): p is Paper => p !== null).slice(0, perSource);
}
