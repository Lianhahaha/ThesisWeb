import { paperId } from "@/lib/utils";
import { fetchWithTimeout, readJson } from "@/lib/server/http";
import { USER_AGENT } from "@/lib/server/config";
import type { Paper } from "@/lib/types";
import type { AdapterOptions } from "@/lib/sources/types";

/**
 * Google Books: the books, textbooks and monographs that an RRL often cites
 * but journal indexes do not cover. Results link to the Google Books record;
 * previews are free only when Google marks the volume as fully viewable.
 * Docs: https://developers.google.com/books/docs/v1/using
 */

interface GoogleVolume {
  id?: string;
  volumeInfo?: {
    title?: string;
    subtitle?: string;
    authors?: string[];
    publishedDate?: string;
    publisher?: string;
    description?: string;
    categories?: string[];
    previewLink?: string;
    infoLink?: string;
  };
  accessInfo?: {
    viewability?: string;
    publicDomain?: boolean;
  };
}

export async function searchGoogleBooks(query: string, opts: AdapterOptions = {}): Promise<Paper[]> {
  const { fromYear = 0, perSource = 15, openAccessOnly } = opts;
  const key = process.env.GOOGLE_BOOKS_API_KEY?.trim();
  if (!key) throw new Error("GOOGLE_BOOKS_API_KEY not configured");

  const params = new URLSearchParams({
    q: query,
    maxResults: String(Math.min(Math.max(perSource, 1), 40)),
    printType: "books",
    orderBy: "relevance",
  });
  params.set("key", key);

  const res = await fetchWithTimeout(`https://www.googleapis.com/books/v1/volumes?${params}`, {
    headers: { "User-Agent": USER_AGENT, Accept: "application/json" },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await readJson<{ items?: GoogleVolume[] }>(res);

  const papers: Paper[] = [];
  for (const item of data?.items ?? []) {
    const info = item.volumeInfo;
    if (!info?.title) continue;

    const year = info.publishedDate ? Number(info.publishedDate.slice(0, 4)) : null;
    if (fromYear > 0 && year != null && year < fromYear) continue;

    const link = info.infoLink ?? info.previewLink ?? null;
    const isOpen = item.accessInfo?.publicDomain === true || item.accessInfo?.viewability === "ALL_PAGES";
    if (openAccessOnly && !isOpen) continue;

    papers.push({
      id: paperId(null, info.title),
      title: info.subtitle ? `${info.title}: ${info.subtitle}` : info.title,
      authors: (info.authors ?? []).slice(0, 10),
      year: year != null && Number.isFinite(year) ? year : null,
      venue: info.publisher ?? "Book",
      doi: null,
      abstract: info.description ?? null,
      openAccessUrl: isOpen ? info.previewLink ?? link : null,
      isOpenAccess: isOpen,
      keywords: (info.categories ?? []).slice(0, 5),
      url: link,
      sources: ["googlebooks"],
      type: "book",
    });
  }
  return papers;
}
