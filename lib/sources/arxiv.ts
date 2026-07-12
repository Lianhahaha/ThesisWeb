import { fetchWithTimeout, paperId } from "@/lib/utils";
import type { Paper } from "@/lib/types";

/**
 * arXiv adapter.
 * - ~2.5M preprints mostly in physics, math, computer science, quantitative biology, quantitative finance, statistics, electrical engineering and systems science, and economics.
 * - Completely free, no API key needed, Atom XML format.
 * - Rate limit: max 3 requests per second.
 * Docs: https://info.arxiv.org/help/api/user-manual.html
 */

export async function searchArxiv(
  query: string,
  opts: { fromYear?: number; perSource?: number; openAccessOnly?: boolean } = {}
): Promise<Paper[]> {
  const { fromYear, perSource = 15 } = opts;

  // arXiv uses a specific query syntax: all:"query string"
  // For years, there's no native "from year" parameter, so we just filter client-side,
  // but to avoid starving results, we fetch a bit more initially.
  const fetchCount = fromYear ? Math.min(perSource * 2, 50) : perSource;
  
  // Format query: replace spaces with +
  const formattedQuery = encodeURIComponent(`all:${query}`);
  const url = `http://export.arxiv.org/api/query?search_query=${formattedQuery}&start=0&max_results=${fetchCount}&sortBy=relevance&sortOrder=descending`;

  const res = await fetchWithTimeout(url);
  if (!res.ok) throw new Error(`arXiv search failed: ${res.status}`);
  
  const text = await res.text();
  
  // Quick and dirty XML parsing using regex to avoid heavy dependencies
  const entryRegex = /<entry>([\s\S]*?)<\/entry>/g;
  let match;
  const papers: Paper[] = [];
  
  while ((match = entryRegex.exec(text)) !== null) {
    const entryXml = match[1];
    
    const idMatch = entryXml.match(/<id>(.*?)<\/id>/);
    const arxivUrl = idMatch ? idMatch[1].trim() : null;
    const arxivId = arxivUrl ? arxivUrl.split("/abs/")[1]?.split("v")[0] : null;
    
    const titleMatch = entryXml.match(/<title>([\s\S]*?)<\/title>/);
    const title = titleMatch ? titleMatch[1].replace(/\s+/g, ' ').trim() : "Untitled";
    
    const abstractMatch = entryXml.match(/<summary>([\s\S]*?)<\/summary>/);
    const abstract = abstractMatch ? abstractMatch[1].replace(/\s+/g, ' ').trim() : null;
    
    const publishedMatch = entryXml.match(/<published>(.*?)<\/published>/);
    const publishedStr = publishedMatch ? publishedMatch[1].trim() : null;
    const year = publishedStr ? parseInt(publishedStr.slice(0, 4), 10) : null;
    
    // Filter by year if needed
    if (fromYear && year && year < fromYear) continue;
    
    const authors: string[] = [];
    const authorRegex = /<author>\s*<name>([\s\S]*?)<\/name>\s*<\/author>/g;
    let authorMatch;
    while ((authorMatch = authorRegex.exec(entryXml)) !== null) {
      authors.push(authorMatch[1].trim());
    }
    
    // Extract DOI if available
    const doiMatch = entryXml.match(/<arxiv:doi[^>]*>(.*?)<\/arxiv:doi>/);
    const doi = doiMatch ? doiMatch[1].trim() : null;
    
    // All arXiv papers are Open Access. Provide the PDF URL.
    const pdfUrl = arxivId ? `https://arxiv.org/pdf/${arxivId}.pdf` : null;
    
    papers.push({
      id: paperId(doi, title),
      title,
      authors: authors.slice(0, 10), // Limit to 10 authors
      year,
      publishedDate: publishedStr ? publishedStr.slice(0, 10) : null,
      venue: "arXiv", // Preprints
      doi,
      abstract,
      tldr: null, // arXiv doesn't provide TLDRs
      openAccessUrl: pdfUrl,
      isOpenAccess: true, // arXiv is always open access
      citedByCount: 0, // arXiv API doesn't provide citation counts directly
      keywords: [],
      sources: ["arxiv"],
    });
    
    if (papers.length >= perSource) break;
  }

  return papers;
}
