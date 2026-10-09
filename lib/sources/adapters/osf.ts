import { fetchWithTimeout, safeJson, paperId } from "@/lib/utils";
import { USER_AGENT } from "@/lib/server/config";
import { extractDoi, stripHtml } from "@/lib/text";
import type { Paper } from "@/lib/types";
import type { AdapterOptions } from "@/lib/sources/types";

/**
 * OSF Preprints, via the SHARE index (Center for Open Science): the
 * moderated preprint servers hosted on OSF, among them PsyArXiv, SocArXiv,
 * EdArXiv, AfricArXiv, INA-Rxiv (Indonesia), MarXiv and EarthArXiv. Strong
 * for psychology, education and the social sciences. Every record is a
 * preprint, i.e. not peer-reviewed. Free, no API key.
 * Docs: https://share.osf.io/trove/docs
 */

const BASE = "https://share.osf.io/api/v3/index-card-search";

type Literal = { "@value"?: string };
type Node = { "@id"?: string; name?: Literal[] };

interface Card {
  type?: string;
  attributes?: {
    resourceMetadata?: {
      "@id"?: string;
      title?: Literal[];
      creator?: Node[];
      dateCreated?: Literal[];
      description?: Literal[];
      identifier?: Literal[];
      keyword?: Literal[];
      publisher?: Node[];
    };
  };
}

export async function searchOsf(query: string, opts: AdapterOptions = {}): Promise<Paper[]> {
  const { fromYear, perSource = 15 } = opts;

  const params = new URLSearchParams({
    cardSearchText: query,
    // Only the preprint servers; the index also holds arbitrary project files.
    "cardSearchFilter[resourceType]": "Preprint",
    "page[size]": String(fromYear ? perSource * 2 : perSource),
  });
  const res = await fetchWithTimeout(`${BASE}?${params}`, {
    headers: { "User-Agent": USER_AGENT, Accept: "application/vnd.api+json" },
  });
  if (!res.ok) throw new Error(`OSF ${res.status}`);
  const data = await safeJson<{ included?: Card[] }>(res);

  const papers: Paper[] = [];
  for (const card of data?.included ?? []) {
    const m = card.type === "index-card" ? card.attributes?.resourceMetadata : undefined;
    const rawTitle = m?.title?.[0]?.["@value"];
    if (!m || !rawTitle) continue;
    const date = m.dateCreated?.[0]?.["@value"] ?? null;
    const year = date ? Number(date.slice(0, 4)) || null : null;
    if (fromYear && year && year < fromYear) continue;

    const ids = (m.identifier ?? []).map((i) => i["@value"] ?? "");
    const doi = ids.map((i) => extractDoi(i)).find(Boolean) ?? null;
    const page = m["@id"] ?? ids.find((i) => /^https:\/\/osf\.io\//.test(i)) ?? null;
    const title = stripHtml(rawTitle);
    const server = m.publisher?.[0]?.name?.[0]?.["@value"];

    papers.push({
      id: paperId(doi, title),
      title,
      authors: (m.creator ?? [])
        .map((c) => c.name?.[0]?.["@value"]?.trim() ?? "")
        .filter(Boolean)
        .slice(0, 10),
      year,
      publishedDate: date,
      venue: server ? `${server} (preprint)` : "OSF Preprints",
      doi,
      abstract: m.description?.[0]?.["@value"] ? stripHtml(m.description[0]["@value"]!) : null,
      openAccessUrl: page,
      isOpenAccess: !!page,
      keywords: (m.keyword ?? []).map((k) => k["@value"] ?? "").filter(Boolean).slice(0, 5),
      url: page,
      preprint: true,
      sources: ["osf"],
    });
    if (papers.length >= perSource) break;
  }
  return papers;
}
