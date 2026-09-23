import { fetchWithTimeout, safeJson, paperId } from "@/lib/utils";
import { USER_AGENT } from "@/lib/config";
import { flipName, stripHtml } from "@/lib/text";
import type { Paper } from "@/lib/types";

/**
 * INSPIRE-HEP adapter.
 * - The high-energy-physics literature database run by CERN, DESY, Fermilab
 *   and SLAC: particle physics, astrophysics, cosmology, gravitation.
 * - Free, no API key. Includes theses and conference papers, with citation counts.
 * Docs: https://github.com/inspirehep/rest-api-doc
 */

const BASE = "https://inspirehep.net/api/literature";
const FIELDS = [
  "control_number", "titles", "authors.full_name", "arxiv_eprints", "dois", "abstracts",
  "earliest_date", "publication_info", "citation_count", "document_type", "keywords",
].join(",");

interface InspireMeta {
  control_number?: number;
  titles?: { title?: string }[];
  authors?: { full_name?: string }[];
  arxiv_eprints?: { value?: string }[];
  dois?: { value?: string }[];
  abstracts?: { value?: string }[];
  earliest_date?: string;
  publication_info?: { journal_title?: string }[];
  citation_count?: number;
  document_type?: string[];
  keywords?: { value?: string }[];
}

/**
 * INSPIRE has its own query language, and words like "a", "t" or "and" are
 * operators. Keep only plain word characters so a topic string can't be
 * misread as a field search.
 */
function sanitize(query: string): string {
  return query.replace(/[^\p{L}\p{N}\s-]/gu, " ").replace(/\s+/g, " ").trim();
}

export async function searchInspire(
  query: string,
  opts: { fromYear?: number; perSource?: number; openAccessOnly?: boolean } = {}
): Promise<Paper[]> {
  const { fromYear, perSource = 15, openAccessOnly } = opts;

  // Drop the query language's own operators and one-letter words ("a", "t").
  const words = sanitize(query)
    .split(" ")
    .filter((w) => w.length > 1 && !/^(and|or|not)$/i.test(w));
  if (words.length === 0) return [];

  // `t` = title search; abstract-only matches are too noisy for a topical query.
  // Requiring every word in the title matched almost nothing for a normal four-
  // to six-word topic, and INSPIRE is `boolean: false`, so a country focus
  // appends its name and would have to appear in the title too. Insist on the
  // first two words and let INSPIRE rank the rest.
  let q = `t ${words.slice(0, 2).join(" and t ")}`;
  if (fromYear && fromYear > 0) q += ` and date >= ${fromYear}`;
  // Every arXiv preprint is free to read; other records may not be.
  if (openAccessOnly) q += " and arxiv_eprints.value:*";

  const params = new URLSearchParams({
    q,
    size: String(perSource),
    sort: "bestmatch",
    fields: FIELDS,
  });

  const res = await fetchWithTimeout(`${BASE}?${params}`, { headers: { "User-Agent": USER_AGENT } });
  if (!res.ok) throw new Error(`INSPIRE ${res.status}`);
  const data = await safeJson<{ hits?: { hits?: { metadata?: InspireMeta }[] } }>(res);
  const hits = data?.hits?.hits ?? [];

  const papers: Paper[] = [];
  for (const h of hits) {
    const m = h.metadata;
    const title = m?.titles?.[0]?.title;
    if (!m || !title) continue;

    const doi = m.dois?.[0]?.value ?? null;
    const arxivId = m.arxiv_eprints?.[0]?.value ?? null;
    const year = m.earliest_date ? Number(m.earliest_date.slice(0, 4)) : null;
    const abstract = m.abstracts?.[0]?.value;

    papers.push({
      id: paperId(doi, title),
      title: stripHtml(title),
      authors: (m.authors ?? []).map((a) => flipName(a.full_name ?? "")).filter(Boolean).slice(0, 10),
      year: year && Number.isFinite(year) ? year : null,
      publishedDate: m.earliest_date ?? null,
      venue: m.publication_info?.[0]?.journal_title ?? (arxivId ? "arXiv" : (m.document_type?.[0] ?? null)),
      doi,
      abstract: abstract ? stripHtml(abstract) : null,
      openAccessUrl: arxivId ? `https://arxiv.org/pdf/${arxivId}` : null,
      isOpenAccess: Boolean(arxivId),
      citedByCount: m.citation_count ?? 0,
      keywords: (m.keywords ?? []).map((k) => k.value ?? "").filter(Boolean).slice(0, 5),
      sources: ["inspire"],
    });
  }
  return papers;
}
