import { countryTerms } from "@/lib/countries";
import { SOURCE_META } from "@/lib/sources/meta";
import type { Paper, SavedPaper } from "@/lib/types";

/**
 * Local or foreign. A Philippine RRL is usually split into Related Local and
 * Related Foreign Literature and Studies, so the library tags each paper. The
 * guess comes from the data; the student can set it per paper (SavedPaper.scope),
 * and that choice always wins.
 */

export type Scope = "local" | "foreign";

export const SCOPE_LABELS: Record<Scope, string> = { local: "Local", foreign: "Foreign" };

/** The country whose studies count as local: the student's country focus, else the Philippines. */
export function localCountry(preferred: string | null | undefined): string {
  return preferred || "Philippines";
}

/** Places that mark a Philippine study even when the country isn't named. */
const PH_PLACES = ["Manila", "Luzon", "Visayas", "Mindanao", "Cebu", "Davao", "Iloilo", "Pilipinas", "Quezon City", "Baguio"];

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** True if the paper's data says it is from or about `country`. */
export function looksLocal(p: Paper, country: string): boolean {
  // A database that only holds this country's research.
  if (p.sources.some((s) => SOURCE_META[s]?.region === country)) return true;
  const words = [...countryTerms(country), ...(country === "Philippines" ? PH_PLACES : [])];
  const re = new RegExp(`\\b(?:${words.map(escape).join("|")})`, "i");
  return re.test([p.title, p.venue, ...(p.keywords ?? []), p.abstract].filter(Boolean).join(" "));
}

/** The paper's scope: the student's choice if they made one, otherwise the guess. */
export function paperScope(p: SavedPaper, country: string): Scope {
  return p.scope ?? (looksLocal(p, country) ? "local" : "foreign");
}
