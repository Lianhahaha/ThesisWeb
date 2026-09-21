import { fetchWithTimeout, safeJson, paperId } from "@/lib/utils";
import { USER_AGENT } from "@/lib/config";
import { flipName, stripHtml } from "@/lib/text";
import type { Paper } from "@/lib/types";

/**
 * DataCite adapter — theses and dissertations.
 * - DataCite registers DOIs for repository content: university thesis
 *   repositories, Zenodo, Figshare and national archives. We query only the
 *   "dissertation" resource type, since theses are the literature that
 *   journal-driven indexes (Crossref, PubMed) leave out and that thesis
 *   writers most need for "related studies".
 * - Free, no API key.
 * Docs: https://support.datacite.org/docs/api-queries
 */

const BASE = "https://api.datacite.org/dois";

interface DataCiteAttrs {
  doi?: string;
  titles?: { title?: string; lang?: string }[];
  creators?: { name?: string; givenName?: string; familyName?: string }[];
  publisher?: string;
  publicationYear?: number;
  descriptions?: { description?: string; descriptionType?: string; lang?: string }[];
  subjects?: { subject?: string }[];
  url?: string;
  rightsList?: { rights?: string; rightsUri?: string; rightsIdentifier?: string }[];
}

/** Prefer an English entry, falling back to the first one. */
function pickEnglish<T extends { lang?: string }>(items: T[] | undefined): T | undefined {
  return items?.find((i) => i.lang?.toLowerCase().startsWith("en")) ?? items?.[0];
}

function isOpen(a: DataCiteAttrs): boolean {
  return (a.rightsList ?? []).some((r) =>
    /openAccess|creativecommons|publicdomain/i.test(`${r.rightsUri ?? ""} ${r.rightsIdentifier ?? ""} ${r.rights ?? ""}`)
  );
}

/** Lucene special characters would change the meaning of a topic string. */
function words(query: string): string[] {
  return query
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .split(/\s+/)
    .filter((w) => w.length > 1 && !/^(and|or|not)$/i.test(w));
}

export async function searchDataCite(
  query: string,
  opts: { fromYear?: number; perSource?: number; openAccessOnly?: boolean } = {}
): Promise<Paper[]> {
  const { fromYear, perSource = 15, openAccessOnly } = opts;

  const ws = words(query);
  if (ws.length === 0) return [];

  const params = new URLSearchParams({
    query: `(${ws.join(" AND ")})`,
    "resource-type-id": "dissertation",
    // Over-fetch when filtering on rights, which the API can't do server-side.
    "page[size]": String(openAccessOnly ? Math.min(perSource * 3, 100) : perSource),
  });
  if (fromYear && fromYear > 0) params.set("published", `${fromYear},${new Date().getFullYear() + 1}`);

  const res = await fetchWithTimeout(`${BASE}?${params}`, { headers: { "User-Agent": USER_AGENT } }, 10000);
  if (!res.ok) throw new Error(`DataCite ${res.status}`);
  const data = await safeJson<{ data?: { attributes?: DataCiteAttrs }[] }>(res);

  const papers: Paper[] = [];
  for (const item of data?.data ?? []) {
    const a = item.attributes;
    const rawTitle = pickEnglish(a?.titles)?.title;
    if (!a || !rawTitle) continue;
    const open = isOpen(a);
    if (openAccessOnly && !open) continue;

    const abstract = pickEnglish(a.descriptions?.filter((d) => d.descriptionType === "Abstract"))?.description;
    const title = stripHtml(rawTitle);
    const doi = a.doi ?? null;

    papers.push({
      id: paperId(doi, title),
      title,
      authors: (a.creators ?? [])
        .map((c) => (c.givenName && c.familyName ? `${c.givenName} ${c.familyName}` : flipName(c.name ?? "")))
        .filter(Boolean)
        .slice(0, 10),
      year: a.publicationYear ?? null,
      venue: a.publisher ? `${a.publisher} (thesis)` : "Thesis",
      doi,
      abstract: abstract ? stripHtml(abstract) : null,
      openAccessUrl: open ? a.url ?? (doi ? `https://doi.org/${doi}` : null) : null,
      isOpenAccess: open,
      keywords: (a.subjects ?? []).map((s) => s.subject ?? "").filter(Boolean).slice(0, 5),
      sources: ["datacite"],
    });
    if (papers.length >= perSource) break;
  }
  return papers;
}
