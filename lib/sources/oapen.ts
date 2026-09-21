import { fetchWithTimeout, safeJson, paperId } from "@/lib/utils";
import { USER_AGENT } from "@/lib/config";
import { flipName, stripHtml } from "@/lib/text";
import type { Paper } from "@/lib/types";

/**
 * OAPEN adapter — open-access academic books and book chapters.
 * - Peer-reviewed scholarly monographs from university presses, all free to
 *   read (mostly CC-licensed). Books are a common source for the theoretical
 *   framework of a thesis, and are absent from article databases.
 * - Free, no API key (DSpace REST API).
 * Docs: https://library.oapen.org/rest
 */

const ORIGIN = "https://library.oapen.org";

interface OapenItem {
  name?: string;
  handle?: string;
  metadata?: { key: string; value: string }[];
  bitstreams?: { bundleName?: string; mimeType?: string; retrieveLink?: string }[];
}

/** Lucene special characters would change the meaning of a topic string. */
function words(query: string): string[] {
  return query
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .split(/\s+/)
    .filter((w) => w.length > 1 && !/^(and|or|not)$/i.test(w));
}

export async function searchOapen(
  query: string,
  opts: { fromYear?: number; perSource?: number } = {}
): Promise<Paper[]> {
  const { fromYear, perSource = 15 } = opts;

  const ws = words(query);
  if (ws.length === 0) return [];

  let q = ws.join(" AND ");
  if (fromYear && fromYear > 0) q += ` AND dc.date.issued:[${fromYear}-01-01 TO 3000-12-31]`;

  const params = new URLSearchParams({ query: q, limit: String(perSource), expand: "metadata,bitstreams" });
  const res = await fetchWithTimeout(
    `${ORIGIN}/rest/search?${params}`,
    { headers: { "User-Agent": USER_AGENT, Accept: "application/json" } },
    12000
  );
  if (!res.ok) throw new Error(`OAPEN ${res.status}`);
  const items = await safeJson<OapenItem[]>(res);
  if (!Array.isArray(items)) return [];

  const papers: Paper[] = [];
  for (const it of items) {
    // DSpace metadata is a flat list of {key, value}; gather all values per key.
    const meta: Record<string, string[]> = {};
    for (const { key, value } of it.metadata ?? []) (meta[key] ||= []).push(value);
    const first = (k: string) => meta[k]?.[0];

    const title = first("dc.title") ?? it.name;
    if (!title) continue;

    const year = Number(first("dc.date.issued")?.slice(0, 4));
    const doi = first("oapen.identifier.doi") ?? null;
    const pdf = it.bitstreams?.find((b) => b.bundleName === "ORIGINAL" && b.mimeType === "application/pdf");
    const abstract = first("dc.description.abstract");
    const authors = meta["dc.contributor.author"] ?? meta["dc.contributor.editor"] ?? [];

    papers.push({
      id: paperId(doi, title),
      title: stripHtml(title),
      authors: authors.map(flipName).slice(0, 10),
      year: Number.isFinite(year) ? year : null,
      venue: first("publisher.name") ? `${first("publisher.name")} (book)` : "Book (OAPEN)",
      doi,
      abstract: abstract ? stripHtml(abstract) : null,
      // Everything in OAPEN is open access.
      openAccessUrl: pdf?.retrieveLink ? `${ORIGIN}${pdf.retrieveLink}` : it.handle ? `${ORIGIN}/handle/${it.handle}` : null,
      isOpenAccess: true,
      keywords: (meta["dc.subject.other"] ?? []).slice(0, 5),
      sources: ["oapen"],
    });
  }
  return papers;
}
