import { paperId } from "@/lib/utils";
import { fetchWithTimeout, readJson } from "@/lib/server/http";
import { USER_AGENT } from "@/lib/server/config";
import { flipName, stripHtml } from "@/lib/text";
import type { Paper } from "@/lib/types";
import type { AdapterOptions } from "@/lib/sources/types";

/**
 * PANGAEA: a data publisher for earth and environmental science. Records are
 * datasets and their descriptions, each with a DOI; useful for geoscience,
 * oceanography, climate and environmental studies.
 * https://pangaea.de
 */

const BASE = "https://www.pangaea.de/advanced/search.php";

interface PangaeaHit {
  URI?: string;
  html?: string;
}

export async function searchPangaea(query: string, opts: AdapterOptions = {}): Promise<Paper[]> {
  const { fromYear, perSource = 15 } = opts;
  const params = new URLSearchParams({ q: query, count: String(Math.min(perSource * 2, 50)), format: "json" });

  const res = await fetchWithTimeout(`${BASE}?${params}`, { headers: { "User-Agent": USER_AGENT, Accept: "application/json" } }, 14000);
  if (!res.ok) throw new Error(`PANGAEA ${res.status}`);
  const data = await readJson<{ results?: PangaeaHit[] }>(res);

  const papers: Paper[] = [];
  for (const hit of data?.results ?? []) {
    const html = hit.html ?? "";
    const link = html.match(/<strong>([\s\S]*?)<\/strong>\s*([\s\S]*?)<\/a>/);
    const title = stripHtml(link?.[2] ?? "");
    if (!title) continue;
    const credit = stripHtml(link?.[1] ?? ""); // "Takemura, A (1992):"
    const year = Number(credit.match(/\((\d{4})\)/)?.[1]) || null;
    if (fromYear && year && year < fromYear) continue;

    const authors = credit
      .replace(/\(\d{4}\).*$/, "")
      .split(";")
      .map((s) => s.trim())
      .filter(Boolean)
      .map(flipName)
      .slice(0, 10);
    const doi = hit.URI?.replace(/^doi:/i, "").trim() || null;
    const url = doi ? `https://doi.pangaea.de/${doi}` : null;
    const abstract = html.match(/<td class="content">([\s\S]*?)<\/td>/)?.[1];

    papers.push({
      id: paperId(doi, title),
      title,
      authors,
      year,
      publishedDate: null,
      venue: "PANGAEA",
      // A dataset, not a journal article; cited as a report/data publication.
      type: "other",
      publisher: "PANGAEA",
      doi,
      abstract: abstract ? stripHtml(abstract) : null,
      openAccessUrl: url,
      isOpenAccess: true,
      url,
      keywords: [],
      sources: ["pangaea"],
    });
    if (papers.length >= perSource) break;
  }
  return papers;
}
