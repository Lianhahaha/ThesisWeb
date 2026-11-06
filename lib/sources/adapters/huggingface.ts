import { paperId } from "@/lib/utils";
import { fetchWithTimeout, readJson } from "@/lib/server/http";
import { USER_AGENT } from "@/lib/server/config";
import type { Paper } from "@/lib/types";
import type { AdapterOptions } from "@/lib/sources/types";

/**
 * Hugging Face Papers: the AI community's daily research feed, built on
 * arXiv papers with community upvotes and discussion. Useful for finding
 * recent work in machine learning, NLP, computer vision, agents and AI safety.
 * Docs: https://huggingface.co/docs/hub/api (Papers API)
 */

interface HfAuthor {
  name?: string;
}

interface HfPaper {
  id?: string;
  title?: string;
  authors?: HfAuthor[];
  publishedAt?: string;
  summary?: string;
}

interface HfEntry {
  paper?: HfPaper;
  publishedAt?: string;
}

export async function searchHuggingFace(query: string, opts: AdapterOptions = {}): Promise<Paper[]> {
  const { fromYear = 0, perSource = 15 } = opts;
  const params = new URLSearchParams({
    q: query,
    limit: String(Math.min(Math.max(perSource * (fromYear ? 3 : 2), 1), 60)),
  });
  const res = await fetchWithTimeout(`https://huggingface.co/api/papers/search?${params}`, {
    headers: { "User-Agent": USER_AGENT, Accept: "application/json" },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await readJson<HfEntry[]>(res);

  const papers: Paper[] = [];
  for (const entry of Array.isArray(data) ? data : []) {
    const paper = entry.paper;
    if (!paper?.title || !paper.id) continue;

    const date = paper.publishedAt ?? entry.publishedAt ?? null;
    const year = date ? Number(date.slice(0, 4)) || null : null;
    if (fromYear > 0 && year != null && year < fromYear) continue;

    const arxivId = /^\d{4}\.\d{4,5}$/.test(paper.id) ? paper.id : null;
    const page = `https://huggingface.co/papers/${paper.id}`;

    papers.push({
      id: paperId(null, paper.title),
      title: paper.title,
      authors: (paper.authors ?? []).map((a) => a.name?.trim() ?? "").filter(Boolean).slice(0, 10),
      year,
      publishedDate: date ? date.slice(0, 10) : null,
      venue: "Hugging Face Papers",
      doi: null,
      abstract: null,
      openAccessUrl: arxivId ? `https://arxiv.org/pdf/${arxivId}.pdf` : null,
      isOpenAccess: Boolean(arxivId),
      keywords: [],
      url: page,
      type: "preprint",
      preprint: true,
      sources: ["huggingface"],
    });
    if (papers.length >= perSource) break;
  }
  return papers;
}
