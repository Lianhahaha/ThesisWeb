"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Network, Loader2 } from "lucide-react";
import { PaperCard } from "@/components/PaperCard";
import { mergeRecentPapers } from "@/lib/recent-papers";
import { cn } from "@/lib/utils";
import type { Paper } from "@/lib/types";

interface Related {
  references: Paper[];
  referencesTotal: number;
  citedBy: Paper[];
  citedByTotal: number;
  similar: Paper[];
}

type Tab = "citedBy" | "references" | "similar";

/**
 * Snowball a literature review from one good paper: what it cites (older
 * foundations), who cites it (newer follow-ups) and similar papers. Loaded on
 * demand so opening a paper doesn't cost an extra API call.
 */
export function RelatedPapers({ doi }: { doi: string }) {
  const [tab, setTab] = useState<Tab>("citedBy");

  const load = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/related?doi=${encodeURIComponent(doi)}`);
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || "Couldn't load related papers.");
      return body as Related;
    },
    onSuccess: (data) => {
      // Let the cards below open their detail pages (which read this store).
      mergeRecentPapers([...data.citedBy, ...data.references, ...data.similar]);
      // Land on the first tab that has something in it.
      setTab(data.citedBy.length ? "citedBy" : data.references.length ? "references" : "similar");
    },
  });

  const data = load.data;
  const tabs: { key: Tab; label: string; count: number; hint: string }[] = data
    ? [
        { key: "citedBy", label: "Cited by", count: data.citedByTotal, hint: "Newer work that builds on this paper" },
        { key: "references", label: "References", count: data.referencesTotal, hint: "The sources this paper is built on" },
        { key: "similar", label: "Similar", count: data.similar.length, hint: "Related papers suggested by OpenAlex" },
      ]
    : [];
  const list: Paper[] = data ? data[tab] : [];

  return (
    <section className="mt-6">
      <h2 className="text-sm font-semibold mb-2">Explore the literature</h2>

      {!data && (
        <div className="card p-4 flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs text-muted max-w-md">
            Find the papers this one cites, the newer papers that cite it, and similar work —
            a fast way to build out your review of related literature.
          </p>
          <button onClick={() => load.mutate()} disabled={load.isPending} className="btn-secondary !text-xs">
            {load.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Network className="h-3.5 w-3.5" />}
            {load.isPending ? "Loading…" : "Explore citations"}
          </button>
        </div>
      )}

      {load.isError && (
        <p className="mt-2 text-xs" style={{ color: "#f85149" }}>
          {(load.error as Error).message}
        </p>
      )}

      {data && (
        <div>
          <div className="mb-2 flex flex-wrap gap-1.5">
            {tabs.map((t) => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                title={t.hint}
                className={cn(
                  "badge border px-3 py-1",
                  tab === t.key ? "bg-brand-600 text-white border-brand-600" : "bg-surface text-muted border-border"
                )}
              >
                {t.label} ({t.count.toLocaleString()})
              </button>
            ))}
          </div>

          {list.length > 0 ? (
            <div className="rounded-lg border overflow-hidden" style={{ borderColor: "rgb(var(--border))" }}>
              {list.map((p) => (
                <PaperCard key={p.id} paper={p} />
              ))}
            </div>
          ) : (
            <p className="card p-4 text-xs text-muted">Nothing to show here for this paper.</p>
          )}

          {list.length > 0 && (
            <p className="mt-1.5 text-[11px] text-muted">
              Showing the {list.length} most-cited of{" "}
              {tab === "citedBy" ? data.citedByTotal.toLocaleString() : tab === "references" ? data.referencesTotal.toLocaleString() : list.length}.
              Data from OpenAlex.
            </p>
          )}
        </div>
      )}
    </section>
  );
}
