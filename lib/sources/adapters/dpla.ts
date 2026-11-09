import { paperId } from "@/lib/utils";
import { fetchWithTimeout, readJson } from "@/lib/server/http";
import { USER_AGENT } from "@/lib/server/config";
import { stripHtml } from "@/lib/text";
import type { Paper } from "@/lib/types";
import type { AdapterOptions } from "@/lib/sources/types";

/**
 * Digital Public Library of America: books, newspapers, photographs,
 * manuscripts and government documents from U.S. libraries, archives and
 * museums. A free API key is required.
 * Docs: https://pro.dp.la/developers/api-codex
 */

const BASE = "https://api.dp.la/v2/items";

interface DplaSource {
  title?: string | string[];
  creator?: string | string[];
  date?: { displayDate?: string };
  description?: string | string[];
}

interface DplaDoc {
  id?: string;
  sourceResource?: DplaSource;
  isShownAt?: string;
  provider?: { name?: string };
}

interface DplaResponse {
  docs?: DplaDoc[];
}

const list = (v: string | string[] | undefined): string[] => (v == null ? [] : Array.isArray(v) ? v : [v]);

/** Map DPLA documents to records. Exported for tests. */
export function parseDpla(data: DplaResponse): Paper[] {
  const papers: Paper[] = [];
  const maxYear = new Date().getFullYear() + 1;

  for (const doc of data?.docs ?? []) {
    const title = list(doc.sourceResource?.title)[0]?.trim();
    if (!title) continue;
    const rawYear = doc.sourceResource?.date?.displayDate?.match(/\d{4}/)?.[0];
    const year = rawYear && Number(rawYear) <= maxYear ? Number(rawYear) : null;

    papers.push({
      id: paperId(null, title),
      title: stripHtml(title),
      authors: list(doc.sourceResource?.creator).filter(Boolean).slice(0, 10),
      year,
      venue: doc.provider?.name ?? "DPLA",
      type: "other",
      doi: null,
      abstract: list(doc.sourceResource?.description)[0]
        ? stripHtml(list(doc.sourceResource?.description)[0])
        : null,
      openAccessUrl: null,
      isOpenAccess: false,
      keywords: [],
      url: doc.isShownAt ?? null,
      sources: ["dpla"],
    });
  }
  return papers;
}

export async function searchDpla(query: string, opts: AdapterOptions = {}): Promise<Paper[]> {
  const key = process.env.DPLA_API_KEY?.trim();
  if (!key) return [];
  const { fromYear, perSource = 15 } = opts;
  const params = new URLSearchParams({
    q: query,
    page_size: String(Math.min(Math.max(perSource, 1), 100)),
    api_key: key,
  });

  const res = await fetchWithTimeout(
    `${BASE}?${params}`,
    { headers: { "User-Agent": USER_AGENT, Accept: "application/json" } },
    12000
  );
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return parseDpla(await readJson<DplaResponse>(res)).filter(
    (p) => !(fromYear && fromYear > 0 && p.year != null && p.year < fromYear)
  );
}
