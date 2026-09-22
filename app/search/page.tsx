"use client";

import { useState, useEffect, useMemo } from "react";
import { useMutation } from "@tanstack/react-query";
import { ChevronDown } from "lucide-react";
import { PaperCard } from "@/components/PaperCard";
import { SearchPanel, DEFAULT_FROM_YEAR } from "@/components/SearchPanel";
import { toast } from "@/components/Toaster";
import { storeRecentPapers } from "@/lib/recent-papers";
import type { SearchResult } from "@/lib/types";
import { KEYLESS_SOURCE_COUNT, sourceLabel, SOURCE_META } from "@/lib/sources/meta";
import { suggestTerms } from "@/lib/related-terms";
import { addSearchHistory } from "@/lib/search-history";
import { buildSearchParams, parseSearchParams, type SearchInput } from "@/lib/search-params";
import { fromYearFor, getPreferences } from "@/lib/preferences";
import { SORT_OPTIONS, countBySource, filterBySources, sortPapers, type SortKey } from "@/lib/result-view";

export default function SearchPage() {
  const [form, setForm] = useState<SearchInput>({
    query: "",
    fromYear: DEFAULT_FROM_YEAR,
    openAccessOnly: false,
    country: null,
  });
  const [result, setResult] = useState<SearchResult | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>("relevance");
  const [selectedSources, setSelectedSources] = useState<Set<string>>(new Set());
  // Phones only: the database list is folded so results start near the top.
  const [sourcesOpen, setSourcesOpen] = useState(false);

  // Suggestions come from the whole result set for the query that produced it —
  // the input may have been edited since.
  const [searched, setSearched] = useState<SearchInput | null>(null);
  const relatedTerms = useMemo(
    () => (result && searched ? suggestTerms(result.papers, searched.query) : []),
    [result, searched]
  );

  const sourceCounts = useMemo(() => countBySource(result?.papers ?? []), [result]);
  const visible = useMemo(
    () => sortPapers(filterBySources(result?.papers ?? [], selectedSources), sortKey),
    [result, selectedSources, sortKey]
  );

  function toggleSource(name: string) {
    setSelectedSources((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  }

  const search = useMutation({
    mutationFn: async (input: SearchInput) => {
      const params = new URLSearchParams({ q: input.query, fromYear: String(input.fromYear) });
      if (input.openAccessOnly) params.set("openAccessOnly", "1");
      if (input.country) params.set("country", input.country);
      const res = await fetch(`/api/search?${params}`);
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Search failed" }));
        throw new Error(err.error || "Search failed");
      }
      return (await res.json()) as SearchResult;
    },
    onSuccess: (data, input) => {
      setResult(data);
      // Mirror the search in the URL so it survives a refresh and can be shared.
      window.history.replaceState(null, "", `?${buildSearchParams(input)}`);
      setSelectedSources(new Set());
      addSearchHistory(input.query);
      setSearched(input);
      storeRecentPapers(data.papers);
      const ok = Object.values(data.sources).filter((s) => s === "ok").length;
      if (ok === 0) toast("No database returned results. Try different words.", "error");
      else toast(`${data.papers.length} papers in ${(data.tookMs / 1000).toFixed(1)}s`, "success");
    },
    onError: (e: Error) => toast(e.message, "error"),
  });

  function run(input: SearchInput) {
    setForm(input);
    search.mutate(input);
  }

  // Opened from the home page, a shared link or a refresh: restore and run.
  useEffect(() => {
    const prefs = getPreferences();
    const input = parseSearchParams(window.location.search, { fromYear: fromYearFor(prefs) });
    if (!input) {
      // Fresh visit: start from the saved defaults.
      setForm((f) => ({ ...f, fromYear: fromYearFor(prefs), country: prefs.country, openAccessOnly: prefs.openAccessOnly }));
      return;
    }
    run(input);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    // Phones: one column. From lg up the sidebar sits right of the results;
    // in the DOM it comes first so on a phone the filter precedes the list.
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_280px] lg:items-start lg:gap-8">
      <div className="min-w-0">
        <header className="mb-5">
          <p className="eyebrow">Search</p>
          <h1 className="display mt-2 text-3xl sm:text-4xl">
            Find <em>sources</em>
          </h1>
          <p className="mt-2 text-muted">
            {KEYLESS_SOURCE_COUNT} free databases, searched together and ranked by relevance.
          </p>
        </header>

        <SearchPanel
          value={form}
          onChange={setForm}
          onSearch={run}
          pending={search.isPending}
          showSuggestions={!result}
        />
      </div>

      {result && !search.isPending && (
        <aside className="min-w-0 space-y-6 lg:sticky lg:top-20 lg:col-start-2 lg:row-span-2 lg:row-start-1 lg:max-h-[calc(100vh-6rem)] lg:overflow-y-auto lg:pr-1">
          <section aria-labelledby="sources-h">
            <button
              type="button"
              onClick={() => setSourcesOpen((v) => !v)}
              aria-expanded={sourcesOpen}
              aria-controls="sources-list"
              className="list-row justify-between lg:hidden"
            >
              <span>
                <span className="font-medium">Databases</span>
                <span className="ml-2 text-xs text-subtle">
                  {selectedSources.size > 0
                    ? `${selectedSources.size} selected`
                    : `${Object.values(result.sources).filter((st) => st === "ok").length} with results`}
                </span>
              </span>
              <ChevronDown className={`h-4 w-4 text-subtle ${sourcesOpen ? "rotate-180" : ""}`} aria-hidden />
            </button>
            <div className="hidden items-baseline justify-between lg:flex">
              <h2 id="sources-h" className="eyebrow">Databases</h2>
              {selectedSources.size > 0 && (
                <button
                  type="button"
                  onClick={() => setSelectedSources(new Set())}
                  className="text-xs text-muted underline"
                >
                  Show all
                </button>
              )}
            </div>
            <p className={`${sourcesOpen ? "block" : "hidden"} mt-2 text-xs text-subtle lg:mt-1 lg:block`}>
              Select one or more to narrow the list.
              {selectedSources.size > 0 && (
                <button
                  type="button"
                  onClick={() => setSelectedSources(new Set())}
                  className="ml-2 underline lg:hidden"
                >
                  Show all
                </button>
              )}
            </p>
            <ul
              id="sources-list"
              className={`${sourcesOpen ? "grid" : "hidden"} mt-3 grid-cols-2 gap-1.5 sm:grid-cols-3 lg:grid lg:grid-cols-1`}
            >
              {Object.entries(result.sources).map(([name, status]) => {
                const failed = status === "error";
                const n = sourceCounts[name] ?? 0;
                const on = selectedSources.has(name);
                const clickable = !failed && n > 0;
                return (
                  <li key={name}>
                    <button
                      type="button"
                      disabled={!clickable}
                      onClick={() => toggleSource(name)}
                      aria-pressed={on}
                      title={failed ? `${sourceLabel(name)} failed or timed out` : SOURCE_META[name]?.blurb ?? name}
                      className={`list-row ${on ? "chip-on" : ""} ${clickable ? "" : "opacity-50"}`}
                    >
                      <span className="flex-1 truncate">{sourceLabel(name)}</span>
                      <span className="text-xs tabular-nums text-subtle">{failed ? "failed" : n}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>

          {relatedTerms.length > 0 && searched && (
            <section aria-labelledby="narrow-h">
              <h2 id="narrow-h" className="eyebrow">Narrow with</h2>
              <p className="mt-1 text-xs text-subtle">Adds the term to your search.</p>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {relatedTerms.map((t) => (
                  <button
                    key={t.term}
                    type="button"
                    onClick={() => run({ ...searched, query: `${searched.query} ${t.term}` })}
                    title={`${t.count} results mention this`}
                    className="chip-btn"
                  >
                    + {t.term}
                  </button>
                ))}
              </div>
            </section>
          )}
        </aside>
      )}

      <div className="min-w-0 lg:col-start-1 lg:row-start-2">
        {search.isError && (
          <p role="alert" className="notice notice-danger">
            <strong>Search failed.</strong> {(search.error as Error).message}
          </p>
        )}

        {search.isPending && (
          <div>
            <p role="status" className="text-sm text-muted">
              Searching {KEYLESS_SOURCE_COUNT} databases. Slow ones are dropped after a few seconds.
            </p>
            <div className="card mt-3 divide-y divide-border" aria-hidden>
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="space-y-2.5 p-4">
                  <div className="h-4 w-3/4 rounded bg-surface3" />
                  <div className="h-3 w-1/3 rounded bg-surface2" />
                  <div className="h-3 w-full rounded bg-surface2" />
                </div>
              ))}
            </div>
          </div>
        )}

        {result && !search.isPending && (
          <section aria-label="Results">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-3">
              <h2 className="text-xl">
                {visible.length}
                {visible.length !== result.papers.length && (
                  <span className="text-muted"> of {result.papers.length}</span>
                )}{" "}
                {result.papers.length === 1 ? "paper" : "papers"}
                <span className="ml-2 font-sans text-xs text-subtle">
                  {(result.tookMs / 1000).toFixed(1)}s
                </span>
              </h2>

              {result.papers.length > 0 && (
                <label className="flex items-center gap-2 text-sm text-muted">
                  Sort
                  <select
                    value={sortKey}
                    onChange={(e) => setSortKey(e.target.value as SortKey)}
                    className="input !min-h-[34px] !w-auto !py-1 text-sm"
                  >
                    {SORT_OPTIONS.map((o) => (
                      <option key={o.key} value={o.key}>{o.label}</option>
                    ))}
                  </select>
                </label>
              )}
            </div>

            {visible.length > 0 ? (
              <ol className="card mt-4 divide-y divide-border">
                {visible.map((p, i) => (
                  <li key={p.id}>
                    <PaperCard paper={p} showScore refNum={i + 1} />
                  </li>
                ))}
              </ol>
            ) : (
              <div className="panel mt-4 text-center">
                <p className="font-medium">No papers matched.</p>
                <p className="mt-1 text-sm text-muted">
                  {selectedSources.size > 0
                    ? "No results from the databases you selected."
                    : searched?.country
                    ? "Try removing the country filter or using a broader topic."
                    : "Try fewer or broader words, widen the year range, or turn off “free full text only”."}
                </p>
                {selectedSources.size > 0 && (
                  <button onClick={() => setSelectedSources(new Set())} className="btn-secondary btn-sm mt-4">
                    Show all databases
                  </button>
                )}
              </div>
            )}
          </section>
        )}
      </div>
    </div>
  );
}
