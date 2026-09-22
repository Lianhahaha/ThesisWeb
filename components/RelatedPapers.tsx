"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { PaperCard } from "@/components/PaperCard";
import { mergeRecentPapers } from "@/lib/recent-papers";
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
 * Snowball a review from one good paper: what it cites (older foundations),
 * what cites it (newer follow-ups), and similar work. Loaded on demand so
 * opening a paper costs no extra API call.
 */
export function RelatedPapers({ doi }: { doi: string }) {
  const [tab, setTab] = useState<Tab>("citedBy");

  const load = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/related?doi=${encodeURIComponent(doi)}`);
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || "Could not load related papers.");
      return body as Related;
    },
    onSuccess: (data) => {
      // Let the cards below open their detail pages, which read this store.
      mergeRecentPapers([...data.citedBy, ...data.references, ...data.similar]);
      setTab(data.citedBy.length ? "citedBy" : data.references.length ? "references" : "similar");
    },
  });

  const data = load.data;
  const tabs: { key: Tab; label: string; count: number; hint: string }[] = data
    ? [
        { key: "citedBy", label: "Cited by", count: data.citedByTotal, hint: "Newer work built on this paper" },
        { key: "references", label: "References", count: data.referencesTotal, hint: "The sources this paper cites" },
        { key: "similar", label: "Similar", count: data.similar.length, hint: "Related work suggested by OpenAlex" },
      ]
    : [];
  const list: Paper[] = data ? data[tab] : [];

  return (
    <section className="mt-10" aria-labelledby="explore">
      <h2 id="explore" className="text-lg">Explore the literature</h2>

      {!data && (
        <div className="panel mt-3 flex flex-wrap items-center justify-between gap-3">
          <p className="max-w-md text-sm text-muted">
            Pull up the papers this one cites, the newer papers citing it, and similar work — the
            fastest way to widen a review from one good source.
          </p>
          <button
            onClick={() => load.mutate()}
            disabled={load.isPending}
            className="btn-secondary btn-sm"
          >
            {load.isPending ? "Loading…" : "Explore citations"}
          </button>
        </div>
      )}

      {load.isError && (
        <p role="alert" className="notice notice-danger mt-3">
          {(load.error as Error).message}
        </p>
      )}

      {data && (
        <>
          <div className="seg mt-3" role="group" aria-label="Citation neighbourhood">
            {tabs.map((t) => (
              <button key={t.key} type="button" data-on={tab === t.key} onClick={() => setTab(t.key)} title={t.hint}>
                {t.label} ({t.count.toLocaleString()})
              </button>
            ))}
          </div>

          {list.length > 0 ? (
            <>
              <ul className="card mt-3 divide-y divide-border">
                {list.map((p) => (
                  <li key={p.id}>
                    <PaperCard paper={p} />
                  </li>
                ))}
              </ul>
              <p className="field-hint">
                The {list.length} most-cited of{" "}
                {tab === "citedBy"
                  ? data.citedByTotal.toLocaleString()
                  : tab === "references"
                  ? data.referencesTotal.toLocaleString()
                  : list.length}
                . Data from OpenAlex.
              </p>
            </>
          ) : (
            <p className="panel mt-3 text-sm text-muted">Nothing to show here for this paper.</p>
          )}
        </>
      )}
    </section>
  );
}
