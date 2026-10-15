"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import Link from "next/link";
import { Bookmark, BookmarkCheck, ChevronDown } from "lucide-react";
import { PaperCard } from "@/components/PaperCard";
import { SearchPanel, DEFAULT_FROM_YEAR } from "@/components/SearchPanel";
import { toast } from "@/components/Toaster";
import { storeRecentPapers } from "@/lib/search/recent-papers";
import { applyIntegrity, fetchIntegrity } from "@/lib/search/integrity";
import type { Paper, SearchResult } from "@/lib/types";
import { rankResults } from "@/lib/search/rank";
import { streamSearch } from "@/lib/search/stream";
import { SOURCE_COUNT, sourceLabel, SOURCE_META } from "@/lib/sources/meta";
import { suggestTerms } from "@/lib/search/related-terms";
import { addSearchHistory } from "@/lib/search/history";
import { checkSavedSearch, isSearchSaved, removeSavedSearch, saveSearch, savedSearchKey } from "@/lib/search/saved";
import { recallSearch, rememberSearch } from "@/lib/search/last-search";
import { buildSearchParams, parseSearchParams, type SearchInput } from "@/lib/search/params";
import { fromYearFor, getPreferences } from "@/lib/preferences";
import {
  MIN_CITATIONS,
  NO_REFINEMENT,
  RECORD_TYPES,
  SORT_OPTIONS,
  countBySource,
  filterBySources,
  recordTypes,
  refine,
  sortPapers,
  type RecordType,
  type Refinement,
  type SortKey,
} from "@/lib/search/result-view";
import { localCountry } from "@/lib/countries";
import { trackEvent } from "@/lib/analytics-events";

/** "Oct 3", for "new since" messages. */
const shortDate = (t: number) => new Date(t).toLocaleDateString("en-PH", { month: "short", day: "numeric" });

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
  // Databases with no results are folded away; with 30+ sources they would
  // otherwise push the useful ones off screen.
  const [showIdle, setShowIdle] = useState(false);
  // Saved searches: is this one saved, and which results are new since it was last opened.
  const [isSaved, setIsSaved] = useState(false);
  const [freshIds, setFreshIds] = useState<ReadonlySet<string>>(new Set());
  const [freshSince, setFreshSince] = useState<number | null>(null);
  const [onlyNew, setOnlyNew] = useState(false);
  // Record type, local-only and citation filters over the fetched list.
  const [refinement, setRefinement] = useState<Refinement>(NO_REFINEMENT);
  // "Local" is the searched country, else the student's default country, else the Philippines.
  const [defaultCountry, setDefaultCountry] = useState<string | null>(null);
  useEffect(() => setDefaultCountry(getPreferences().country), []);
  const refined = refinement.types.size > 0 || refinement.localTo !== null || refinement.minCitations > 0;
  const typeCounts = useMemo(() => {
    const counts: Partial<Record<RecordType, number>> = {};
    for (const p of result?.papers ?? []) for (const t of recordTypes(p)) counts[t] = (counts[t] ?? 0) + 1;
    return counts;
  }, [result]);
  function toggleType(t: RecordType) {
    setRefinement((r) => {
      const types = new Set(r.types);
      if (types.has(t)) types.delete(t);
      else types.add(t);
      return { ...r, types };
    });
  }

  // Suggestions come from the whole result set for the query that produced it —
  // the input may have been edited since.
  const [searched, setSearched] = useState<SearchInput | null>(null);
  const local = localCountry(searched?.country ?? defaultCountry);
  const relatedTerms = useMemo(
    () => (result && searched ? suggestTerms(result.papers, searched.query) : []),
    [result, searched]
  );

  const sourceCounts = useMemo(() => countBySource(result?.papers ?? []), [result]);
  // Databases with results first, most results on top; the rest after.
  const [activeSources, idleSources] = useMemo(() => {
    const names = Object.keys(result?.sources ?? {});
    const active = names.filter((n) => (sourceCounts[n] ?? 0) > 0).sort((a, b) => sourceCounts[b] - sourceCounts[a]);
    const idle = names.filter((n) => !(sourceCounts[n] > 0));
    return [active, idle];
  }, [result, sourceCounts]);
  const visible = useMemo(() => {
    const list = refine(filterBySources(result?.papers ?? [], selectedSources), refinement);
    return sortPapers(onlyNew ? list.filter((p) => freshIds.has(p.id)) : list, sortKey);
  }, [result, selectedSources, refinement, sortKey, onlyNew, freshIds]);

  function toggleSaved() {
    if (!searched || !result) return;
    if (isSaved) {
      removeSavedSearch(savedSearchKey(searched));
      setIsSaved(false);
      setFreshIds(new Set());
      setOnlyNew(false);
      toast("Saved search removed", "info");
    } else {
      saveSearch(searched, result.papers.map((p) => p.id));
      setIsSaved(true);
      toast("Search saved. Open it again later and new papers are marked “New”.", "success");
    }
  }

  function toggleSource(name: string) {
    setSelectedSources((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  }

  // A search in progress: how many databases have answered, and how to stop it
  // when a new search starts or the page closes.
  const [pending, setPending] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [answered, setAnswered] = useState(0);
  const running = useRef<AbortController | null>(null);
  useEffect(() => () => running.current?.abort(), []);

  /** What follows a finished search: URL, history, retraction check, saved-search marks, message. */
  function finish(data: SearchResult, input: SearchInput) {
    // Mirror the search in the URL so it survives a refresh and can be shared.
    window.history.replaceState(null, "", `?${buildSearchParams(input)}`);
    addSearchHistory(input.query);
    storeRecentPapers(data.papers);
    // Retraction check is slow (several seconds), so it lands after the
    // results are on screen and patches the badges in.
    fetchIntegrity(data.papers.map((p) => p.doi ?? "")).then((status) => {
      if (Object.keys(status).length === 0) return;
      const papers = applyIntegrity(data.papers, status);
      storeRecentPapers(papers);
      setResult((prev) => (prev === data ? { ...data, papers } : prev));
    });
    // A saved search: mark what wasn't there the last time it was opened.
    const check = checkSavedSearch(input, data.papers.map((p) => p.id));
    setIsSaved(!!check);
    setFreshIds(new Set(check?.fresh ?? []));
    setFreshSince(check?.since ?? null);
    // Coming back from a paper shows these again without searching.
    rememberSearch(buildSearchParams(input).toString(), data, check?.fresh ?? [], check?.since ?? null);
    const ok = Object.values(data.sources).filter((s) => s === "ok").length;
    if (ok === 0) toast("No database returned results. Try different words.", "error");
    else if (check)
      toast(
        check.fresh.length > 0
          ? `${check.fresh.length} new since ${shortDate(check.since)} · ${data.papers.length} papers`
          : `Nothing new since ${shortDate(check.since)} · ${data.papers.length} papers`,
        "success"
      );
    else toast(`${data.papers.length} papers in ${(data.tookMs / 1000).toFixed(1)}s`, "success");
    trackEvent("search", { search_term: input.query, results: data.papers.length });
  }

  /**
   * Run a search. Results show as soon as the first databases answer and are
   * re-ranked as the rest come in (at most every 800 ms, so the list doesn't
   * reshuffle under the reader with every database).
   */
  async function run(input: SearchInput) {
    running.current?.abort();
    const controller = new AbortController();
    running.current = controller;
    setForm(input);
    setSearched(input);
    setPending(true);
    setSearchError(null);
    setAnswered(0);
    setResult(null);
    setSelectedSources(new Set());
    setRefinement(NO_REFINEMENT);
    setOnlyNew(false);
    setFreshIds(new Set());
    setFreshSince(null);
    setIsSaved(isSearchSaved(input));

    const started = Date.now();
    const records: Paper[] = [];
    const sources: SearchResult["sources"] = {};
    const errors: Record<string, string> = {};
    const snapshot = (tookMs: number): SearchResult => ({
      papers: rankResults(records, input.query, input),
      sources: { ...sources },
      errors: { ...errors },
      tookMs,
    });
    let lastPaint = 0;
    let paintTimer: ReturnType<typeof setTimeout> | undefined;
    const paint = () => {
      lastPaint = Date.now();
      paintTimer = undefined;
      if (running.current === controller) setResult(snapshot(Date.now() - started));
    };

    try {
      const { tookMs } = await streamSearch(input, {
        signal: controller.signal,
        onSource: (update) => {
          records.push(...update.papers);
          sources[update.id] = update.status;
          if (update.error) errors[update.id] = update.error;
          setAnswered((n) => n + 1);
          if (!paintTimer) paintTimer = setTimeout(paint, Math.max(0, 800 - (Date.now() - lastPaint)));
        },
      });
      clearTimeout(paintTimer);
      if (running.current !== controller) return;
      const data = snapshot(tookMs);
      setResult(data);
      finish(data, input);
    } catch (e) {
      clearTimeout(paintTimer);
      if (controller.signal.aborted) return;
      const message = e instanceof Error ? e.message : "Search failed";
      setSearchError(message);
      toast(message, "error");
    } finally {
      if (running.current === controller) setPending(false);
    }
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
    // Back from a paper (or a refresh) within half an hour: the same results, at once.
    const recalled = recallSearch(buildSearchParams(input).toString());
    if (recalled) {
      setForm(input);
      setResult(recalled.result);
      setSearched(input);
      setIsSaved(isSearchSaved(input));
      setFreshIds(new Set(recalled.fresh));
      setFreshSince(recalled.since);
      return;
    }
    run(input);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // While a search runs, results show once there are some; after it, always (also "no papers").
  const showResults = !!result && (result.papers.length > 0 || !pending);

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
            <Link href="/databases" className="underline decoration-dotted underline-offset-2 hover:text-text">
              {SOURCE_COUNT} free databases
            </Link>
            , searched together and ranked by relevance.
          </p>
        </header>

        <SearchPanel
          value={form}
          onChange={setForm}
          onSearch={run}
          pending={pending}
          showSuggestions={!result && !pending}
        />
      </div>

      {result && showResults && (
        <aside className="min-w-0 space-y-6 lg:sticky lg:top-20 lg:col-start-2 lg:row-span-2 lg:row-start-1 lg:max-h-[calc(100vh-6rem)] lg:overflow-y-auto lg:pr-1">
          <section aria-labelledby="refine-h">
            <div className="flex items-baseline justify-between">
              <h2 id="refine-h" className="eyebrow">Refine</h2>
              {refined && (
                <button type="button" onClick={() => setRefinement(NO_REFINEMENT)} className="text-xs text-muted underline">
                  Clear
                </button>
              )}
            </div>
            <div className="mt-3 flex flex-wrap gap-1.5" role="group" aria-label="Record type">
              {RECORD_TYPES.filter((t) => typeCounts[t.key]).map((t) => (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => toggleType(t.key)}
                  aria-pressed={refinement.types.has(t.key)}
                  className={`chip-btn ${refinement.types.has(t.key) ? "chip-on" : ""}`}
                >
                  {t.label} <span className="tabular-nums text-subtle">{typeCounts[t.key]}</span>
                </button>
              ))}
            </div>
            <label className="mt-3 flex cursor-pointer items-center gap-2 text-sm text-muted">
              <input
                type="checkbox"
                checked={refinement.localTo !== null}
                onChange={(e) => setRefinement((r) => ({ ...r, localTo: e.target.checked ? local : null }))}
                className="h-4 w-4 rounded"
                style={{ accentColor: "rgb(var(--accent))" }}
              />
              Local studies only ({local})
            </label>
            <label className="mt-2 flex items-center gap-2 text-sm text-muted">
              Cited at least
              <select
                value={refinement.minCitations}
                onChange={(e) => setRefinement((r) => ({ ...r, minCitations: Number(e.target.value) }))}
                className="input !min-h-[32px] !w-auto !py-1 text-sm"
              >
                {MIN_CITATIONS.map((n) => (
                  <option key={n} value={n}>{n === 0 ? "any" : `${n}×`}</option>
                ))}
              </select>
            </label>
          </section>

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
              {[...activeSources, ...(showIdle ? idleSources : [])].map((name) => {
                const failed = result.sources[name] === "error";
                const n = sourceCounts[name] ?? 0;
                const on = selectedSources.has(name);
                const clickable = !failed && n > 0;
                const reason = result.errors?.[name];
                // On the <li>: some browsers show no tooltip on a disabled button.
                return (
                  <li
                    key={name}
                    title={failed ? `${sourceLabel(name)} failed${reason ? `: ${reason}` : " or timed out"}` : SOURCE_META[name]?.blurb ?? name}
                  >
                    <button
                      type="button"
                      disabled={!clickable}
                      onClick={() => toggleSource(name)}
                      aria-pressed={on}
                      className={`list-row ${on ? "chip-on" : ""} ${clickable ? "" : "opacity-50"}`}
                    >
                      <span className="flex-1 truncate">{sourceLabel(name)}</span>
                      <span className="text-xs tabular-nums text-subtle">{failed ? "failed" : n}</span>
                    </button>
                  </li>
                );
              })}
              {idleSources.length > 0 && (
                <li className="col-span-full">
                  <button
                    type="button"
                    onClick={() => setShowIdle((v) => !v)}
                    aria-expanded={showIdle}
                    className="list-row justify-center text-xs text-muted"
                  >
                    {showIdle
                      ? "Hide databases with no results"
                      : `${idleSources.length} more with no results`}
                    <ChevronDown className={`h-3.5 w-3.5 ${showIdle ? "rotate-180" : ""}`} aria-hidden />
                  </button>
                </li>
              )}
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
        {searchError && !pending && (
          <p role="alert" className="notice notice-danger">
            <strong>Search failed.</strong> {searchError}
          </p>
        )}

        {pending && !showResults && (
          <div>
            <p role="status" className="text-sm text-muted">
              Searching {SOURCE_COUNT} databases{answered > 0 ? `: ${answered} answered` : ""}. Results show as soon as
              the first ones are in.
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

        {result && showResults && (
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

              <div className="flex flex-wrap items-center gap-2">
              {freshIds.size > 0 && (
                <button
                  type="button"
                  onClick={() => setOnlyNew((v) => !v)}
                  aria-pressed={onlyNew}
                  className={`chip-btn ${onlyNew ? "chip-on" : ""}`}
                  title={freshSince ? `Not in this search on ${shortDate(freshSince)}` : undefined}
                >
                  New only ({freshIds.size})
                </button>
              )}
              <button
                type="button"
                onClick={toggleSaved}
                disabled={pending}
                aria-pressed={isSaved}
                className="btn-ghost btn-sm"
                title={isSaved ? "Stop tracking new papers for this search" : "Keep this search and mark new papers next time"}
              >
                {isSaved ? <BookmarkCheck className="h-3.5 w-3.5" aria-hidden /> : <Bookmark className="h-3.5 w-3.5" aria-hidden />}
                {isSaved ? "Saved search" : "Save search"}
              </button>
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
            </div>

            {pending && (
              <p role="status" className="notice notice-info mt-3">
                {answered} of {SOURCE_COUNT} databases have answered. The list updates as the rest come in; slow
                ones are dropped after a few seconds.
              </p>
            )}

            {result.papers.length > 0 && (
              <p className="mt-3 text-xs text-subtle">
                Every result comes straight from a public academic database; nothing is generated.
                Still check the journal, read the paper, and watch for the <em>Preprint</em>,{" "}
                <em>Retracted</em> and <em>Expression of concern</em> badges before you cite.
              </p>
            )}

            {visible.length > 0 ? (
              <ol className="card mt-4 divide-y divide-border">
                {visible.map((p, i) => (
                  <li key={p.id}>
                    <PaperCard paper={p} showScore refNum={i + 1} isNew={freshIds.has(p.id)} />
                  </li>
                ))}
              </ol>
            ) : (
              <div className="panel mt-4 text-center">
                <p className="font-medium">No papers matched.</p>
                <p className="mt-1 text-sm text-muted">
                  {refined || onlyNew
                    ? "No papers pass the filters you chose. Clear them to see the rest."
                    : selectedSources.size > 0
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
