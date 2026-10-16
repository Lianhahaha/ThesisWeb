import { paperId } from "@/lib/utils";
import { extractYear, stripHtml } from "@/lib/text";
import type { Paper } from "@/lib/types";
import type { AdapterOptions } from "@/lib/sources/types";
import { eFetchXml, eSearch } from "@/lib/sources/platforms/ncbi";

/**
 * PubMed / NCBI E-utilities adapter.
 * - 37M+ biomedical citations — essential for nursing, medicine, biology, psychology.
 * - Free. No key required (<3 req/s). Set NCBI_API_KEY env var for 10 req/s.
 * - Two steps through the shared, rate-paced NCBI client: esearch for the
 *   best matches, then efetch for their full records. efetch (unlike
 *   esummary) includes the abstract and keywords, so students can judge a
 *   paper from the results and the ranking can read more than the title.
 * Docs: https://www.ncbi.nlm.nih.gov/books/NBK25499/
 */
export async function searchPubMed(query: string, opts: AdapterOptions = {}): Promise<Paper[]> {
  const { fromYear, perSource = 15, openAccessOnly } = opts;
  const ids = await eSearch("pubmed", buildTerm(query, fromYear, openAccessOnly), perSource);
  const byPmid = new Map(parsePubmedXml(await eFetchXml("pubmed", ids)).map((p) => [p.url, p]));
  // Keep PubMed's relevance order.
  return ids.map((id) => byPmid.get(pubmedUrl(id))).filter((p): p is Paper => !!p);
}

function buildTerm(query: string, fromYear?: number, openAccessOnly?: boolean): string {
  let term = query;
  if (fromYear) term += ` AND ${fromYear}:3000[pdat]`;
  if (openAccessOnly) term += " AND free full text[sb]";
  return term;
}

const pubmedUrl = (pmid: string) => `https://pubmed.ncbi.nlm.nih.gov/${pmid}/`;

/** The inside of the first <name> element, or null. */
const inner = (xml: string, name: string) => xml.match(new RegExp(`<${name}\\b[^>]*>([\\s\\S]*?)</${name}>`))?.[1] ?? null;

/** MEDLINE shortens page ranges: "1234-45" is 1234-1245. */
export function expandPages(pages: string | null): string | null {
  const m = pages?.trim().match(/^(\d+)\s*-\s*(\d+)$/);
  if (!m) return pages?.trim() || null;
  const [, start, end] = m;
  return end.length < start.length ? `${start}-${start.slice(0, start.length - end.length)}${end}` : `${start}-${end}`;
}

/** Papers from an efetch PubmedArticleSet. */
export function parsePubmedXml(xml: string): Paper[] {
  const papers: Paper[] = [];
  for (const [, record] of xml.matchAll(/<PubmedArticle>([\s\S]*?)<\/PubmedArticle>/g)) {
    const pmid = inner(record, "PMID")?.trim();
    const article = inner(record, "Article") ?? "";
    const title = stripHtml(inner(article, "ArticleTitle") ?? "").replace(/\.$/, "");
    if (!pmid || !title) continue;

    // Structured abstracts come in labelled parts: "Background: ... Methods: ...".
    const abstract =
      [...article.matchAll(/<AbstractText\b([^>]*)>([\s\S]*?)<\/AbstractText>/g)]
        .map(([, attrs, body]) => {
          const label = attrs.match(/Label="([^"]+)"/)?.[1];
          const text = stripHtml(body);
          return label && text ? `${label.charAt(0)}${label.slice(1).toLowerCase()}: ${text}` : text;
        })
        .filter(Boolean)
        .join(" ") || null;

    const authors = [...(inner(article, "AuthorList") ?? "").matchAll(/<Author\b[^>]*>([\s\S]*?)<\/Author>/g)]
      .map(([, a]) => {
        const group = inner(a, "CollectiveName");
        if (group) return stripHtml(group);
        return [inner(a, "ForeName") ?? inner(a, "Initials"), inner(a, "LastName")].filter(Boolean).map((s) => stripHtml(s!)).join(" ");
      })
      .filter(Boolean)
      .slice(0, 10);

    const journal = inner(article, "Journal") ?? "";
    const issue = inner(journal, "JournalIssue") ?? "";
    const pubDate = inner(issue, "PubDate") ?? "";
    const year = Number(inner(pubDate, "Year")) || extractYear(inner(pubDate, "MedlineDate")) || Number(inner(inner(article, "ArticleDate") ?? "", "Year")) || null;

    // The article's own ids; the reference list further down carries the cited papers' ids.
    const own = (inner(record, "PubmedData") ?? "").replace(/<ReferenceList>[\s\S]*?<\/ReferenceList>/g, "");
    const ownIds = inner(own, "ArticleIdList") ?? "";
    const idOf = (type: string) => ownIds.match(new RegExp(`<ArticleId IdType="${type}">([^<]+)</ArticleId>`))?.[1]?.trim() ?? null;
    const doi = article.match(/<ELocationID EIdType="doi"[^>]*>([^<]+)</)?.[1]?.trim() ?? idOf("doi");
    const pmcId = idOf("pmc");

    // PubMed also lists NIH-funded preprints, marked by their publication type.
    const preprint = /<PublicationType\b[^>]*>Preprint</.test(article);
    const keywords = [...record.matchAll(/<Keyword\b[^>]*>([\s\S]*?)<\/Keyword>/g)].map(([, k]) => stripHtml(k));
    const mesh = [...record.matchAll(/<DescriptorName\b[^>]*>([\s\S]*?)<\/DescriptorName>/g)].map(([, k]) => stripHtml(k));

    papers.push({
      id: paperId(doi, title),
      title,
      authors,
      year,
      publishedDate: year ? `${year}-01-01` : null,
      venue: stripHtml(inner(journal, "Title") ?? "") || null,
      type: preprint ? "preprint" : "article",
      volume: inner(issue, "Volume")?.trim() || null,
      issue: inner(issue, "Issue")?.trim() || null,
      pages: expandPages(inner(article, "MedlinePgn")),
      doi,
      abstract,
      // A PMC copy is the free full text.
      openAccessUrl: pmcId ? `https://pmc.ncbi.nlm.nih.gov/articles/${pmcId}/` : null,
      isOpenAccess: !!pmcId,
      url: pubmedUrl(pmid),
      citedByCount: 0,
      keywords: (keywords.length ? keywords : mesh).filter(Boolean).slice(0, 5),
      preprint,
      sources: ["pubmed"],
    });
  }
  return papers;
}
