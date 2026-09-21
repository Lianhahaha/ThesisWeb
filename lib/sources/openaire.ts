import { fetchWithTimeout, safeJson, paperId } from "@/lib/utils";
import { USER_AGENT } from "@/lib/config";
import { extractDoi, flipName, stripHtml } from "@/lib/text";
import type { Paper } from "@/lib/types";

/**
 * OpenAIRE adapter.
 * - The European open-science graph: 170M+ publications aggregated from
 *   institutional repositories, publishers and national infrastructures, with
 *   a strong bias toward openly accessible research and funder-linked output.
 * - Free, no API key for the public search API.
 * Docs: https://graph.openaire.eu/docs/apis/search-api/publications
 */

const BASE = "https://api.openaire.eu/search/publications";

/**
 * OpenAIRE's JSON is XML-to-JSON: any field can be a value, an object with the
 * text under "$", or an array of either, depending on how many were present.
 */
type Node = string | { $?: string; [k: string]: unknown } | null | undefined;

const asArray = <T,>(x: T | T[] | null | undefined): T[] => (x == null ? [] : Array.isArray(x) ? x : [x]);
const text = (n: Node): string => (typeof n === "string" ? n : n?.$ ?? "");

/** A value tagged with a classification (pid type, subject type). */
interface OaClassified {
  "@classid"?: string;
  $?: string;
}

interface OaInstance {
  accessright?: { "@classid"?: string };
  webresource?: { url?: Node } | { url?: Node }[];
}

interface OaResult {
  title?: Node | Node[];
  creator?: Node | Node[];
  dateofacceptance?: Node;
  pid?: OaClassified | OaClassified[];
  description?: Node | Node[];
  subject?: OaClassified | OaClassified[];
  journal?: Node;
  publisher?: Node;
  bestaccessright?: { "@classid"?: string };
  children?: { instance?: OaInstance | OaInstance[] };
}

/** Prefer the "main title" entry; OpenAIRE lists alternative/sub titles too. */
function pickTitle(titles: Node | Node[]): string {
  const list = asArray(titles) as ({ "@classid"?: string; $?: string } | string)[];
  const main = list.find((t) => typeof t !== "string" && t["@classid"] === "main title");
  return stripHtml(text((main ?? list[0]) as Node));
}

export async function searchOpenAire(
  query: string,
  opts: { fromYear?: number; perSource?: number; openAccessOnly?: boolean } = {}
): Promise<Paper[]> {
  const { fromYear, perSource = 15, openAccessOnly } = opts;

  const params = new URLSearchParams({
    keywords: query,
    format: "json",
    size: String(perSource),
  });
  if (fromYear && fromYear > 0) params.set("fromDateAccepted", `${fromYear}-01-01`);
  if (openAccessOnly) params.set("OA", "true");

  const res = await fetchWithTimeout(`${BASE}?${params}`, { headers: { "User-Agent": USER_AGENT } }, 12000);
  if (!res.ok) throw new Error(`OpenAIRE ${res.status}`);
  const data = await safeJson<{ response?: { results?: { result?: unknown } | null } }>(res);
  const rows = asArray(data?.response?.results?.result as { metadata?: Record<string, { "oaf:result"?: OaResult }> }[]);

  const papers: Paper[] = [];
  for (const row of rows) {
    const r = row.metadata?.["oaf:entity"]?.["oaf:result"];
    if (!r) continue;

    const title = pickTitle(r.title);
    if (!title) continue;

    const doi = asArray(r.pid).find((p) => p["@classid"] === "doi")?.$ ?? null;

    const dateStr = text(r.dateofacceptance);
    const year = dateStr ? Number(dateStr.slice(0, 4)) : null;

    const isOA = r.bestaccessright?.["@classid"] === "OPEN";
    // First open instance that has a URL; DOI landing page as a fallback.
    const instances = asArray(r.children?.instance);
    const openInstance = instances.find((i) => i.accessright?.["@classid"] === "OPEN");
    const openUrl = openInstance ? text(asArray(openInstance.webresource)[0]?.url) : "";

    const abstract = asArray<Node>(r.description).map(text).find(Boolean);
    const keywords = asArray(r.subject)
      .filter((s) => s["@classid"] === "keyword")
      .map((s) => s.$ ?? "")
      .filter(Boolean)
      .slice(0, 5);

    papers.push({
      id: paperId(doi, title),
      title,
      // Repositories mix "Given Family" and "Family, Given"; normalize to the former.
      authors: asArray<Node>(r.creator).map((c) => flipName(text(c))).filter(Boolean).slice(0, 10),
      year: year && Number.isFinite(year) ? year : null,
      publishedDate: dateStr || null,
      venue: text(r.journal) ? stripHtml(text(r.journal)) : text(r.publisher) ? stripHtml(text(r.publisher)) : null,
      doi: doi ?? extractDoi(openUrl),
      // JATS abstracts start with an <jats:title>Abstract</jats:title> heading.
      abstract: abstract ? stripHtml(abstract).replace(/^abstract\s*[:.]?\s+/i, "") || null : null,
      openAccessUrl: isOA ? openUrl || (doi ? `https://doi.org/${doi}` : null) : null,
      isOpenAccess: isOA,
      keywords,
      sources: ["openaire"],
    });
  }
  return papers;
}
