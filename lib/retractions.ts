import { fetchWithTimeout, safeJson } from "@/lib/utils";
import { CONTACT_EMAIL } from "@/lib/config";

/**
 * Retraction lookup through Crossref, which carries the Retraction Watch
 * database plus publishers' own notices. Every source can be checked this way
 * as long as the paper has a DOI, unlike OpenAlex's `is_retracted`, which only
 * covers results that came through OpenAlex.
 *
 * A notice (the retraction) "updates" the original paper, so the query asks
 * for works whose `update-to` points at one of our DOIs.
 */

export type IntegrityStatus = "retracted" | "concern";

/** Update types that mean "do not cite this". */
const RETRACTED = new Set(["retraction", "withdrawal", "removal"]);
const CONCERN = new Set(["expression_of_concern", "expression-of-concern"]);

/** DOIs per Crossref request; the filter goes in the URL, so keep it short. */
const CHUNK = 50;
/** Chunks in flight at once; Crossref's polite pool allows a few. */
const PARALLEL = 4;

/** Results by lower-cased DOI, kept for a day; notices are rare and slow to change. */
const TTL_MS = 24 * 60 * 60 * 1000;
const MAX_CACHE = 20_000;
const cache = new Map<string, { status: IntegrityStatus | null; at: number }>();

interface CrossrefNotice {
  "update-to"?: { DOI?: string; type?: string }[];
}

async function checkChunk(dois: string[]): Promise<Map<string, IntegrityStatus>> {
  const params = new URLSearchParams({
    filter: dois.map((d) => `updates:${d}`).join(","),
    rows: "200",
    select: "DOI,update-to",
    mailto: CONTACT_EMAIL,
  });
  const res = await fetchWithTimeout(`https://api.crossref.org/works?${params}`, {}, 15000);
  if (!res.ok) throw new Error(`Crossref ${res.status}`);
  const data = await safeJson<{ message?: { items?: CrossrefNotice[] } }>(res);

  const wanted = new Set(dois);
  const found = new Map<string, IntegrityStatus>();
  for (const item of data?.message?.items ?? []) {
    for (const u of item["update-to"] ?? []) {
      const doi = u.DOI?.toLowerCase();
      if (!doi || !wanted.has(doi)) continue;
      const type = (u.type ?? "").toLowerCase();
      if (RETRACTED.has(type)) found.set(doi, "retracted");
      else if (CONCERN.has(type) && !found.has(doi)) found.set(doi, "concern");
    }
  }
  return found;
}

/**
 * Integrity status for each DOI that has one. DOIs with no notice are left
 * out. A chunk that fails is skipped (and not cached), so a Crossref outage
 * means "no warning shown", never a false warning.
 */
export async function checkIntegrity(input: string[]): Promise<Record<string, IntegrityStatus>> {
  const now = Date.now();
  const out: Record<string, IntegrityStatus> = {};
  const todo: string[] = [];

  // Commas separate Crossref filters, so a DOI containing one can't be asked about.
  for (const raw of new Set(input.map((d) => d.trim().toLowerCase()))) {
    if (!raw.startsWith("10.") || raw.includes(",")) continue;
    const hit = cache.get(raw);
    if (hit && now - hit.at < TTL_MS) {
      if (hit.status) out[raw] = hit.status;
    } else {
      todo.push(raw);
    }
  }

  const chunks: string[][] = [];
  for (let i = 0; i < todo.length; i += CHUNK) chunks.push(todo.slice(i, i + CHUNK));

  for (let i = 0; i < chunks.length; i += PARALLEL) {
    const batch = chunks.slice(i, i + PARALLEL);
    const results = await Promise.allSettled(batch.map(checkChunk));
    results.forEach((r, j) => {
      if (r.status !== "fulfilled") return;
      if (cache.size > MAX_CACHE) cache.clear();
      for (const doi of batch[j]) {
        const status = r.value.get(doi) ?? null;
        cache.set(doi, { status, at: Date.now() });
        if (status) out[doi] = status;
      }
    });
  }
  return out;
}
