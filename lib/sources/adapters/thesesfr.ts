import { paperId } from "@/lib/utils";
import { fetchWithTimeout, readJson } from "@/lib/server/http";
import { USER_AGENT } from "@/lib/server/config";
import { extractDoi, stripHtml } from "@/lib/text";
import type { Paper } from "@/lib/types";
import type { AdapterOptions } from "@/lib/sources/types";

/**
 * theses.fr: every French doctoral thesis, defended or still in preparation,
 * with the awarding university, discipline, NNT number and DOI.
 * Free JSON API, no key. Records are theses, so they are typed as such even
 * when the record has no dc.type to read.
 * Docs: https://theses.fr/api/v1/swagger-ui/index.html
 */

const API = "https://theses.fr/api/v1/theses/recherche/";

interface These {
  id?: string;
  titrePrincipal?: string;
  titreEN?: string;
  etabSoutenanceN?: string;
  dateSoutenance?: string;
  doi?: string;
  discipline?: string;
  status?: string;
  auteurs?: { nom?: string; prenom?: string }[];
}

/** The API localises dates as dd/mm/yyyy; the app stores YYYY-MM-DD. */
function isoDate(value?: string): string | null {
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec((value ?? "").trim());
  return m ? `${m[3]}-${m[2]}-${m[1]}` : null;
}

export async function searchThesesFr(query: string, opts: AdapterOptions = {}): Promise<Paper[]> {
  const { fromYear, perSource = 15 } = opts;
  // A few extra, since records defended before fromYear are dropped below.
  const params = new URLSearchParams({ q: query, nombre: String(Math.min(perSource * 2, 100)) });
  const res = await fetchWithTimeout(
    `${API}?${params}`,
    { headers: { "User-Agent": USER_AGENT, Accept: "application/json" } },
    10000
  );
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await readJson<{ theses?: These[] }>(res);

  const papers: Paper[] = [];
  for (const t of data?.theses ?? []) {
    // "enCours" is a thesis still being written: there is no text to cite yet.
    if (t.status && t.status.toLowerCase() !== "soutenue") continue;
    const title = stripHtml(t.titrePrincipal || t.titreEN || "");
    if (!title) continue;
    const publishedDate = isoDate(t.dateSoutenance);
    const year = publishedDate ? Number(publishedDate.slice(0, 4)) : null;
    if (fromYear && year !== null && year < fromYear) continue;

    const school = stripHtml(t.etabSoutenanceN ?? "") || null;
    const url = t.id ? `https://theses.fr/${encodeURIComponent(t.id)}` : null;
    const doi = extractDoi(t.doi);

    papers.push({
      id: paperId(doi, title),
      title,
      authors: (t.auteurs ?? [])
        .map((a) => [a.prenom, a.nom].filter(Boolean).join(" ").trim())
        .filter(Boolean)
        .slice(0, 10),
      year,
      publishedDate,
      venue: school,
      type: "thesis",
      publisher: school,
      doi,
      // The record page is public; the full text often is not, so this is not
      // claimed as open access.
      abstract: null,
      openAccessUrl: null,
      isOpenAccess: false,
      keywords: t.discipline ? [stripHtml(t.discipline)] : [],
      url,
      sources: ["thesesfr"],
    });
    if (papers.length >= perSource) break;
  }
  return papers;
}
