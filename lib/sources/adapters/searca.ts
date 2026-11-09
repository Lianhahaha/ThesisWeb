import { paperId } from "@/lib/utils";
import { fetchWithTimeout, readText } from "@/lib/server/http";
import { USER_AGENT } from "@/lib/server/config";
import { stripHtml } from "@/lib/text";
import type { Paper } from "@/lib/types";
import type { AdapterOptions } from "@/lib/sources/types";

/**
 * SEARCA Library System, the Southeast Asian Regional Center for Graduate
 * Study and Research in Agriculture: 1,600+ theses and a wider catalogue of
 * agriculture, fisheries, environment and rural-development material from
 * Southeast Asia. The list page is server-rendered; each record's year,
 * publisher and summary live on its detail page.
 * https://lis.searcaapps.org
 */

const BASE = "https://lis.searcaapps.org";
const SEARCH = `${BASE}/lis/theses/precollection`;

interface SearcaRow {
  id: string;
  title: string;
  subject: string;
  author: string;
  tags: string;
}

/** Parse the theses table. Exported for tests. */
export function parseSearcaList(html: string): SearcaRow[] {
  const rows: SearcaRow[] = [];
  for (const [, row] of html.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)) {
    const cells = [...row.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)].map((m) => stripHtml(m[1]));
    if (cells.length < 5 || !/^\d+$/.test(cells[0])) continue;
    const title = cells[1];
    if (!title) continue;
    rows.push({
      id: cells[0],
      title,
      subject: cells[3] ?? "",
      author: cells[4] ?? "",
      tags: cells[5] ?? "",
    });
  }
  return rows;
}

/** Pull the fields the list page omits from a record page. Exported for tests. */
export function parseSearcaDetail(html: string): {
  abstract: string | null;
  author: string | null;
  publisher: string | null;
  year: number | null;
  type: "thesis" | "book" | "report" | undefined;
} {
  const text = (label: string) =>
    stripHtml(html.match(new RegExp(`<b>${label}\\s*:</b>([\\s\\S]*?)</p>`, "i"))?.[1] ?? "") || null;
  const summary = stripHtml(html.match(/<label>Summary\s*:<\/label>([\s\S]*?)<\/p>/i)?.[1] ?? "") || null;
  const date = text("Publication Date");
  const rawYear = date ? Number(date.match(/\d{4}/)?.[0]) : null;
  const year = rawYear && rawYear >= 1000 && rawYear <= new Date().getFullYear() + 1 ? rawYear : null;
  const material = text("Material")?.toLowerCase() ?? "";
  const type = /thesis|theses|dissertation/.test(material)
    ? "thesis"
    : /book/.test(material)
      ? "book"
      : /report/.test(material)
        ? "report"
        : undefined;
  return { abstract: summary, author: text("Author"), publisher: text("Publisher"), year, type };
}

export async function searchSearca(query: string, opts: AdapterOptions = {}): Promise<Paper[]> {
  const { fromYear, perSource = 15 } = opts;
  const path = query.trim().replace(/\s+/g, "-");
  const res = await fetchWithTimeout(
    `${SEARCH}/${encodeURIComponent(path)}`,
    { headers: { "User-Agent": USER_AGENT, Accept: "text/html" } },
    12000
  );
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const rows = parseSearcaList(await readText(res)).slice(0, Math.max(1, perSource));

  const papers = await Promise.all(
    rows.map(async (row): Promise<Paper> => {
      let detail: Awaited<ReturnType<typeof parseSearcaDetail>> = {
        abstract: null,
        author: null,
        publisher: null,
        year: null,
        type: undefined,
      };
      try {
        const r = await fetchWithTimeout(
          `${BASE}/lis/book/${row.id}`,
          { headers: { "User-Agent": USER_AGENT, Accept: "text/html" } },
          7000
        );
        if (r.ok) detail = parseSearcaDetail(await readText(r));
      } catch {
        // The list row is still usable if the detail page is slow or down.
      }

      const authors = (detail.author || row.author)
        .split(/\s*[;|]\s*/)
        .map((a) => a.trim())
        .filter(Boolean)
        .slice(0, 10);
      const keywords = row.subject.split(/\s{2,}|,\s*/).filter(Boolean).slice(0, 5);

      return {
        id: paperId(null, row.title),
        title: row.title,
        authors,
        year: detail.year,
        venue: detail.publisher ?? "SEARCA Library",
        type: detail.type,
        doi: null,
        abstract: detail.abstract,
        openAccessUrl: null,
        isOpenAccess: false,
        keywords,
        url: `${BASE}/lis/book/${row.id}`,
        sources: ["searca"],
      };
    })
  );

  return papers.filter((p) => !(fromYear && fromYear > 0 && p.year != null && p.year < fromYear));
}
