import { fetchWithTimeout, safeJson, paperId } from "@/lib/utils";
import type { Paper } from "@/lib/types";

/**
 * BASE (Bielefeld Academic Search Engine) adapter.
 * - Free API key required: https://www.base-search.net/about/en/contact.php
 * - 400M+ documents from 12,000+ repositories.
 * - Aggregates institutional repos — strong for theses & dissertations.
 * Docs: https://www.base-search.net/about/download/base_interface.pdf
 */

const API_KEY = process.env.BASE_API_KEY?.trim() || "";
const BASE = "https://api.base-search.net";

interface BaseSearchResult {
  response?: {
    docs?: BaseDoc[];
    numFound?: number;
  };
}

interface BaseDoc {
  id?: string;
  dc_title?: string[];
  dc_creator?: string[];
  dc_date?: string[];
  dc_publisher?: string[];
  dc_identifier?: string[];
  dc_description?: string[];
  dc_source?: string[];
  dc_language?: string[];
  dc_type?: string[];
  base_dc_identifier?: string[];
  urn?: string[];
  foaf_url?: string[];
  foilaf_name?: string[];
}

function extractDoi(doc: BaseDoc): string | null {
  // Try dc_identifier first (often contains DOI)
  for (const id of doc.dc_identifier || []) {
    if (id.startsWith("10.")) return id;
    const doiMatch = id.match(/doi:\s*(10\..+)/i);
    if (doiMatch) return doiMatch[1];
  }
  // Try dc_source
  for (const src of doc.dc_source || []) {
    const doiMatch = src.match(/(10\.\d{4,}\/[^\s]+)/);
    if (doiMatch) return doiMatch[1];
  }
  return null;
}

function extractYear(doc: BaseDoc): number | null {
  for (const d of doc.dc_date || []) {
    const m = d.match(/(\d{4})/);
    if (m) return Number(m[1]);
  }
  return null;
}

export async function searchBase(
  query: string,
  opts: { fromYear?: number; perSource?: number; openAccessOnly?: boolean } = {}
): Promise<Paper[]> {
  if (!API_KEY) return [];

  const { fromYear, perSource = 15 } = opts;

  const params = new URLSearchParams({
    q: query,
    rows: String(perSource),
    format: "json",
  });

  if (fromYear) {
    params.set("fq", `dc.date:[${fromYear}-01-01 TO *]`);
  }

  const res = await fetchWithTimeout(`${BASE}/cgi-bin/BaseHttpSearchInterface.fcgi?func=PerformSearch&${params}`, {
    headers: { Authorization: `Bearer ${API_KEY}` },
  });

  if (!res.ok) throw new Error(`BASE ${res.status}`);
  const data = await safeJson<BaseSearchResult>(res);
  if (!data?.response?.docs) return [];

  return data.response.docs.map<Paper>((doc) => {
    const title = doc.dc_title?.[0] || "Untitled";
    const doi = extractDoi(doc);
    const year = extractYear(doc);
    const authors = (doc.dc_creator || []).slice(0, 10);
    const venue = doc.dc_publisher?.[0] ?? doc.dc_source?.[0] ?? null;
    const abstract = doc.dc_description?.[0] || null;

    // BASE provides direct links to full text
    const oaUrl = doc.foaf_url?.[0] || doc.urn?.[0] || (doi ? `https://doi.org/${doi}` : null);

    return {
      id: paperId(doi, title),
      title,
      authors,
      year,
      venue,
      doi,
      abstract: abstract?.replace(/<[^>]+>/g, "") || null,
      openAccessUrl: oaUrl,
      isOpenAccess: true,
      sources: ["base"],
    };
  });
}
