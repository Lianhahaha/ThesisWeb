import { fetchWithTimeout, safeJson, paperId } from "@/lib/utils";
import { USER_AGENT } from "@/lib/server/config";
import { extractDoi } from "@/lib/text";
import type { Paper } from "@/lib/types";
import type { AdapterOptions } from "@/lib/sources/types";

/**
 * theses.fr (ABES, France): every doctoral thesis defended in France since
 * 1985, with its university, discipline and supervisors. Many are written
 * in English; the full text is often free on HAL or the university site.
 * Free, no API key.
 */

const BASE = "https://theses.fr/api/v1/theses/recherche/";

interface Person {
  nom?: string | null;
  prenom?: string | null;
}

interface ThesisRecord {
  id?: string;
  nnt?: string | null;
  titrePrincipal?: string;
  etabSoutenanceN?: string;
  dateSoutenance?: string | null;
  auteurs?: Person[];
  doi?: string | null;
  discipline?: string;
  /** "soutenue" (defended) or "enCours" (in progress). */
  status?: string;
  sujets?: { langue?: string; libelle?: string }[];
}

export async function searchThesesFr(query: string, opts: AdapterOptions = {}): Promise<Paper[]> {
  const { fromYear, perSource = 15 } = opts;

  // No year filter in the API: ask for more and keep the defended, recent ones.
  const params = new URLSearchParams({ q: query, nombre: String(perSource * 3), debut: "0" });
  const res = await fetchWithTimeout(`${BASE}?${params}`, { headers: { "User-Agent": USER_AGENT } });
  if (!res.ok) throw new Error(`theses.fr ${res.status}`);
  const data = await safeJson<{ theses?: ThesisRecord[] }>(res);

  const papers: Paper[] = [];
  for (const t of data?.theses ?? []) {
    // A thesis still in progress has nothing to read or cite yet.
    if (!t.titrePrincipal || t.status !== "soutenue") continue;
    // dateSoutenance is "dd/mm/yyyy".
    const year = Number(t.dateSoutenance?.slice(-4)) || null;
    if (fromYear && (!year || year < fromYear)) continue;

    const doi = extractDoi(t.doi);
    const title = t.titrePrincipal.trim();
    const page = t.nnt ? `https://theses.fr/${t.nnt}` : t.id ? `https://theses.fr/${t.id}` : null;

    papers.push({
      id: paperId(doi, title),
      title,
      authors: (t.auteurs ?? [])
        .map((a) => [a.prenom, a.nom].filter(Boolean).join(" "))
        .filter(Boolean)
        .slice(0, 10),
      year,
      venue: `Doctoral thesis${t.etabSoutenanceN ? `, ${t.etabSoutenanceN}` : ""}`,
      doi,
      abstract: null,
      // The record page links the free copy when the author allowed one.
      openAccessUrl: null,
      isOpenAccess: false,
      keywords: [
        ...(t.discipline ? [t.discipline] : []),
        ...(t.sujets ?? []).filter((s) => s.langue === "en").map((s) => s.libelle ?? ""),
      ]
        .filter(Boolean)
        .slice(0, 5),
      url: page,
      sources: ["thesesfr"],
    });
    if (papers.length >= perSource) break;
  }
  return papers;
}
