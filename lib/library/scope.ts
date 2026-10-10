import { looksLocal } from "@/lib/countries";
import type { SavedPaper } from "@/lib/types";

/**
 * Local or foreign. A Philippine RRL is usually split into Related Local and
 * Related Foreign Literature and Studies, so the library tags each paper. The
 * guess comes from the data; the student can set it per paper (SavedPaper.scope),
 * and that choice always wins.
 */

export type Scope = "local" | "foreign";

export const SCOPE_LABELS: Record<Scope, string> = { local: "Local", foreign: "Foreign" };

/** The paper's scope: the student's choice if they made one, otherwise the guess. */
export function paperScope(p: SavedPaper, country: string): Scope {
  return p.scope ?? (looksLocal(p, country) ? "local" : "foreign");
}
