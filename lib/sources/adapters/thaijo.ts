import { fetchWithTimeout, safeJson, paperId } from "@/lib/utils";
import { USER_AGENT } from "@/lib/server/config";
import { extractDoi, extractYear, stripHtml } from "@/lib/text";
import type { Paper } from "@/lib/types";
import type { AdapterOptions } from "@/lib/sources/types";

/**
 * ThaiJO (Thai Journals Online), run by the Thai-Journal Citation Index
 * Centre: 1,000+ peer-reviewed Thai journals in health, education, social
 * sciences, agriculture and engineering. Most articles carry an English
 * title and abstract next to the Thai ones; only the English is kept.
 * The search API has no year filter, so the year is filtered here from a
 * larger page.
 * https://www.tci-thaijo.org
 */

type Localized = { en_US?: string; th_TH?: string };

interface ThaijoArticle {
  title?: Localized;
  abstract_clean?: Localized;
  authors?: { full_name?: Localized }[];
  datePublished?: string;
  articleUrl?: string;
  pubIdDoi?: string | null;
  copyrightHolder?: Localized;
  keywords?: { en_US?: string[] };
}

const THAI = /[฀-๿]/;

/**
 * The English part of a field that may mix Thai and English:
 * "ชื่อเรื่อง (English title)" gives the bracketed English, and an
 * abstract written Thai-then-English gives what follows the last Thai
 * character. Null when there is no English part.
 */
export function englishPart(s: string | undefined, minLength = 1): string | null {
  const text = stripHtml(s ?? "");
  if (!text) return null;
  if (!THAI.test(text)) return text;
  const bracketed = text.match(/\(([^()]*[A-Za-z][^()]*)\)\s*$/)?.[1];
  if (bracketed && !THAI.test(bracketed)) return bracketed.trim();
  const tail = text.slice(text.search(/[฀-๿][^฀-๿]*$/) + 1).replace(/^[\s.,;:)]+/, "").trim();
  return tail.length >= minLength && /[A-Za-z]/.test(tail) ? tail : null;
}

export async function searchThaijo(query: string, opts: AdapterOptions = {}): Promise<Paper[]> {
  const { fromYear, perSource = 15 } = opts;
  const size = fromYear ? Math.min(perSource * 2, 50) : perSource;

  const res = await fetchWithTimeout("https://www.tci-thaijo.org/api/articles/search/", {
    method: "POST",
    headers: { "User-Agent": USER_AGENT, "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ term: query, page: 1, size, strict: true, title: true, author: true, abstract: true }),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await safeJson<{ result?: ThaijoArticle[] }>(res);

  const papers: Paper[] = [];
  for (const a of data?.result ?? []) {
    // Articles with only a Thai title can't be read or cited in English.
    const title = englishPart(a.title?.en_US) ?? englishPart(a.title?.th_TH);
    if (!title) continue;
    const year = extractYear(a.datePublished);
    if (fromYear && year && year < fromYear) continue;
    const doi = extractDoi(a.pubIdDoi);

    papers.push({
      id: paperId(doi, title),
      title,
      authors: (a.authors ?? [])
        .map((p) => englishPart(p.full_name?.en_US) ?? "")
        .filter(Boolean)
        .slice(0, 10),
      year,
      publishedDate: a.datePublished?.slice(0, 10) ?? null,
      venue: englishPart(a.copyrightHolder?.en_US) ?? "ThaiJO",
      doi,
      abstract: englishPart(a.abstract_clean?.en_US, 80),
      // ThaiJO journals are open access.
      openAccessUrl: a.articleUrl ?? null,
      isOpenAccess: !!a.articleUrl,
      keywords: (a.keywords?.en_US ?? [])
        .map((k) => k.replace(/;$/, "").trim())
        .filter((k) => k && !THAI.test(k))
        .slice(0, 5),
      url: a.articleUrl ?? null,
      preprint: false,
      sources: ["thaijo"],
    });
    if (papers.length >= perSource) break;
  }
  return papers;
}
