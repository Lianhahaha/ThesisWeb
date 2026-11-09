import { paperId } from "@/lib/utils";
import { fetchWithTimeout, readText } from "@/lib/server/http";
import { USER_AGENT } from "@/lib/server/config";
import { stripHtml } from "@/lib/text";
import type { Paper } from "@/lib/types";
import type { AdapterOptions } from "@/lib/sources/types";

/**
 * Philippine eLib, the union catalogue run by the National Library of the
 * Philippines with UP, DOST, DA and CHED: books, theses, government documents
 * and Filipiniana from partner libraries. Metadata is free; full text is
 * available only to member libraries. The result list is server-rendered.
 * https://www.elib.gov.ph
 */

const BASE = "https://www.elib.gov.ph";

interface ElibRow {
  uid: string;
  title: string;
  imprint: string;
  subjects: string[];
}

/** Parse the brief-record list. Exported for tests. */
export function parseElibList(html: string): ElibRow[] {
  const rows: ElibRow[] = [];

  for (const part of html.split(/<td[^>]*class="sectiondata"[^>]*>/i).slice(1)) {
    const link = part.match(/^<a[^>]*href="(details\.php\?uid=[^"]+)"[^>]*>([\s\S]*?)<\/a>/i);
    if (!link) continue;
    const title = stripHtml(link[2]).replace(/\.$/, "").trim();
    if (!title) continue;

    const segments = part
      .slice(link[0].length)
      .split(/<br\s*\/?>/i)
      .map((s) => stripHtml(s))
      .filter(Boolean);

    const imprint = segments.find((s) => s !== "." && !/^Subject\s*:/i.test(s)) ?? "";
    const subjectLine = segments.find((s) => /^Subject\s*:/i.test(s)) ?? "";
    const subjects = subjectLine
      .replace(/^Subject\s*:/i, "")
      .split(";")
      .map((s) => s.replace(/[.;,\s]+$/, "").trim())
      .filter(Boolean);

    rows.push({
      uid: link[1].replace(/&amp;/g, "&"),
      title,
      imprint,
      subjects,
    });
  }
  return rows;
}

/** Pull authors, type and abstract from a MARC detail page. Exported for tests. */
export function parseElibDetail(html: string): {
  authors: string[];
  type: "book" | "thesis" | undefined;
  abstract: string | null;
  year: number | null;
} {
  const rows = [...html.matchAll(/<span title="[^"]*">([^<]+)<\/span><\/td><td colspan="2" class="tddata">([\s\S]*?)<\/td>/g)];

  const values = (label: string) =>
    rows
      .filter(([, name]) => name.trim() === label)
      .map(([, , value]) => value);

  const names = values("Main Entry - Personal Name")
    .concat(values("Added Entry - Personal Name"))
    .flatMap((value) => {
      const anchors = [...value.matchAll(/>([^<]+)<\/a>/g)].map((m) => m[1]);
      return anchors.length ? anchors : [stripHtml(value)];
    })
    .map((name) => name.replace(/,\s*(ed|editor|comp|compiler)\.?$/i, "").trim())
    .filter(Boolean);

  const form = stripHtml(values("Textual Physical Form Designator")[0] ?? "").toLowerCase();
  const type = /thes|dissert/.test(form) ? "thesis" : /book/.test(form) ? "book" : undefined;

  const summary = values("Summary, Etc.")
    .map((v) => stripHtml(v))
    .find(Boolean) ?? null;

  const general = stripHtml(values("General Information")[0] ?? "");
  const yearMatch = general.match(/(19|20)\d{2}/);
  const year = yearMatch ? Number(yearMatch[0]) : null;

  return { authors: [...new Set(names)].slice(0, 10), type, abstract: summary, year };
}

function normalizeName(name: string): string {
  const parts = name.split(",").map((p) => p.trim()).filter(Boolean);
  if (parts.length >= 2) return `${parts.slice(1).join(" ")} ${parts[0]}`.replace(/\s+/g, " ");
  return name;
}

export async function searchElib(query: string, opts: AdapterOptions = {}): Promise<Paper[]> {
  const { fromYear, perSource = 15 } = opts;
  const params = new URLSearchParams({ f: "any", q: query });

  const res = await fetchWithTimeout(
    `${BASE}/results.php?${params}`,
    { headers: { "User-Agent": USER_AGENT, Accept: "text/html" } },
    15000
  );
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const rows = parseElibList(await readText(res)).slice(0, Math.max(1, perSource));

  const papers = await Promise.all(
    rows.map(async (row): Promise<Paper> => {
      let detail: Awaited<ReturnType<typeof parseElibDetail>> = { authors: [], type: undefined, abstract: null, year: null };
      try {
        const r = await fetchWithTimeout(
          `${BASE}/${row.uid}`,
          { headers: { "User-Agent": USER_AGENT, Accept: "text/html" } },
          7000
        );
        if (r.ok) detail = parseElibDetail(await readText(r));
      } catch {
        // The catalogue record is still useful without its detail page.
      }

      const yearFromImprint = row.imprint.match(/\b(19|20)\d{2}\b/)?.[0];
      const year = detail.year ?? (yearFromImprint ? Number(yearFromImprint) : null);
      const publisher = row.imprint.replace(/^.*?:\s*/, "").replace(/,\s*(19|20)\d{2}.*$/, "").trim();

      return {
        id: paperId(null, row.title),
        title: row.title,
        authors: detail.authors.map(normalizeName),
        year,
        venue: publisher || "Philippine eLib",
        type: detail.type,
        doi: null,
        abstract: detail.abstract,
        openAccessUrl: null,
        isOpenAccess: false,
        keywords: row.subjects.slice(0, 5),
        url: `${BASE}/${row.uid}`,
        sources: ["elib"],
      };
    })
  );

  return papers.filter((p) => !(fromYear && fromYear > 0 && p.year != null && p.year < fromYear));
}
