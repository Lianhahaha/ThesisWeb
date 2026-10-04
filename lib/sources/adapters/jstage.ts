import { fetchWithTimeout, paperId } from "@/lib/utils";
import { USER_AGENT } from "@/lib/config";
import { decodeEntities, extractDoi } from "@/lib/text";
import type { Paper } from "@/lib/types";
import type { AdapterOptions } from "@/lib/sources/types";

/**
 * J-STAGE adapter (Japan Science and Technology Agency).
 * - Over 3,000 journals and conference proceedings published in Japan:
 *   engineering, medicine, agriculture, education and social science, most
 *   with English titles and abstracts pages.
 * - Free, no API key. Answers in XML (Atom).
 * Docs: https://www.jstage.jst.go.jp/static/pages/JstageServices/TAB3/-char/en
 */

const BASE = "https://api.jstage.jst.go.jp/searchapi/do";

/** Inner text of the first <tag>, unwrapping CDATA. */
function tag(xml: string, name: string): string | null {
  const m = xml.match(new RegExp(`<${name}>([\\s\\S]*?)</${name}>`));
  if (!m) return null;
  const v = m[1].replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1").trim();
  return v ? decodeEntities(v) : null;
}

/** English value of a bilingual <x><en/><ja/></x> block, else the Japanese one. */
function bilingual(xml: string, name: string): string | null {
  const block = xml.match(new RegExp(`<${name}>([\\s\\S]*?)</${name}>`))?.[1];
  return block ? tag(block, "en") ?? tag(block, "ja") : null;
}

function names(xml: string): string[] {
  const block = xml.match(/<author>([\s\S]*?)<\/author>/)?.[1] ?? "";
  const en = block.match(/<en>([\s\S]*?)<\/en>/)?.[1];
  const ja = block.match(/<ja>([\s\S]*?)<\/ja>/)?.[1];
  return [...(en || ja || "").matchAll(/<name>([\s\S]*?)<\/name>/g)]
    .map((m) => decodeEntities(m[1].replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1").trim()))
    .filter(Boolean);
}

export async function searchJstage(
  query: string,
  opts: AdapterOptions = {}
): Promise<Paper[]> {
  const { fromYear, perSource = 15 } = opts;

  const params = new URLSearchParams({ service: "3", keyword: query, count: String(perSource) });
  if (fromYear && fromYear > 0) params.set("pubyearfrom", String(fromYear));

  const res = await fetchWithTimeout(`${BASE}?${params}`, { headers: { "User-Agent": USER_AGENT } });
  if (!res.ok) throw new Error(`J-STAGE ${res.status}`);
  const xml = await res.text();
  // Errors come back as 200 with a non-zero <status> (e.g. no matches).
  const status = xml.match(/<status>(\d+)<\/status>/)?.[1];
  if (status && status !== "0") return [];

  const papers: Paper[] = [];
  for (const [, entry] of xml.matchAll(/<entry>([\s\S]*?)<\/entry>/g)) {
    const title = bilingual(entry, "article_title");
    if (!title) continue;
    const doi = extractDoi(tag(entry, "prism:doi"));
    const year = Number(tag(entry, "pubyear")) || null;

    papers.push({
      id: paperId(doi, title),
      title,
      authors: names(entry).slice(0, 10),
      year,
      venue: bilingual(entry, "material_title") ?? "J-STAGE",
      doi,
      abstract: null,
      openAccessUrl: null,
      isOpenAccess: false,
      sources: ["jstage"],
    });
  }
  return papers;
}
