"use client";

import type { Paper } from "@/lib/types";
import type { IntegrityStatus } from "@/lib/retractions";

/**
 * Ask the server which of these papers have been retracted or carry an
 * expression of concern. Never throws: on any failure it answers "nothing
 * found", so a lookup problem can only hide a warning, not invent one.
 */
export async function fetchIntegrity(dois: string[]): Promise<Record<string, IntegrityStatus>> {
  const unique = Array.from(new Set(dois.filter(Boolean)));
  if (unique.length === 0) return {};
  try {
    const res = await fetch("/api/retractions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ dois: unique }),
    });
    if (!res.ok) return {};
    const body = (await res.json()) as { status?: Record<string, IntegrityStatus> };
    return body.status ?? {};
  } catch {
    return {};
  }
}

/** Copy of the papers with the retraction / concern flags set from `status`. */
export function applyIntegrity<T extends Paper>(papers: T[], status: Record<string, IntegrityStatus>): T[] {
  if (Object.keys(status).length === 0) return papers;
  return papers.map((p) => {
    const s = p.doi ? status[p.doi.toLowerCase()] : undefined;
    if (s === "retracted") return { ...p, retracted: true };
    if (s === "concern") return { ...p, concern: true };
    return p;
  });
}
