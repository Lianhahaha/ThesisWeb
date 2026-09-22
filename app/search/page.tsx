"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { useMutation } from "@tanstack/react-query";
import { Search as SearchIcon, Globe, ChevronDown, X } from "lucide-react";
import { PaperCard } from "@/components/PaperCard";
import { toast } from "@/components/Toaster";
import { storeRecentPapers } from "@/lib/recent-papers";
import type { SearchResult } from "@/lib/types";
import { filterCountries } from "@/lib/countries";
import { KEYLESS_SOURCE_COUNT, sourceLabel, SOURCE_META } from "@/lib/sources/meta";
import { suggestTerms } from "@/lib/related-terms";
import { addSearchHistory, clearSearchHistory, getSearchHistory } from "@/lib/search-history";
import { MIN_QUERY_LENGTH, buildSearchParams, parseSearchParams, type SearchInput } from "@/lib/search-params";
import { SORT_OPTIONS, countBySource, filterBySources, sortPapers, type SortKey } from "@/lib/result-view";

const CURRENT_YEAR = new Date().getFullYear();

const EXAMPLE_TOPICS = [
  "vendor challenges supply chain",
  "mental health impact of social media students",
  "microplastics freshwater ecosystems",
  "blockchain supply chain transparency",
];

const YEAR_PRESETS = [
  { value: CURRENT_YEAR - 1, label: `Last 2 years (${CURRENT_YEAR - 1}+)` },
  { value: CURRENT_YEAR - 3, label: `Last 3 years (${CURRENT_YEAR - 3}+)` },
  { value: CURRENT_YEAR - 5, label: `Last 5 years (${CURRENT_YEAR - 5}+)` },
  { value: CURRENT_YEAR - 10, label: `Last 10 years (${CURRENT_YEAR - 10}+)` },
  { value: 0, label: "Any year" },
];

// ─── Country picker ──────────────────────────────────────────────────────────
function CountryCombobox({
  value,
  onChange,
}: {
  value: string | null;
  onChange: (v: string | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const ref = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const filtered = filterCountries(search);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  function select(country: string | null) {
    onChange(country);
    setOpen(false);
    setSearch("");
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => {
          setOpen(true);
          setSearch("");
          setTimeout(() => inputRef.current?.focus(), 0);
        }}
        aria-expanded={open}
        aria-haspopup="listbox"
        className="input flex w-full items-center gap-2 text-left sm:w-[200px]"
      >
        <Globe className="h-4 w-4 shrink-0 text-subtle" aria-hidden />
        <span className={`flex-1 truncate ${value ? "text-text" : "text-subtle"}`}>
          {value ?? "Anywhere"}
        </span>
        <ChevronDown className="h-4 w-4 shrink-0 text-subtle" aria-hidden />
      </button>

      {open && (
        <div
          className="card absolute left-0 top-full z-30 mt-1 w-[260px] overflow-hidden"
          style={{ boxShadow: "0 12px 32px rgba(0,0,0,0.6)" }}
        >
          <div className="border-b border-border p-2">
            <label htmlFor="country-search" className="sr-only">Search countries</label>
            <input
              id="country-search"
              ref={inputRef}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Type a country…"
              className="input"
            />
          </div>
          <ul className="max-h-[260px] overflow-y-auto py-1" role="listbox">
            <li>
              <button
                type="button"
                onClick={() => select(null)}
                aria-selected={!value}
                role="option"
                className={`flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-surface3 ${
                  !value ? "text-accent" : "text-muted"
                }`}
              >
                <Globe className="h-4 w-4 shrink-0" aria-hidden />
                Anywhere (global)
              </button>
            </li>
            {filtered.length === 0 ? (
              <li className="px-3 py-4 text-center text-sm text-subtle">No countries match.</li>
            ) : (
              filtered.map((c) => (
                <li key={c}>
                  <button
                    type="button"
                    onClick={() => select(c)}
                    role="option"
                    aria-selected={value === c}
                    className={`w-full px-3 py-2 text-left text-sm hover:bg-surface3 ${
                      value === c ? "text-accent" : "text-muted"
                    }`}
                  >
                    {c}
                  </button>
                </li>
              ))
            )}
          </ul>
        </div>
      )}
    </div>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────
export default function SearchPage() {
  const [query, setQuery] = useState("");
  const [fromYear, setFromYear] = useState<number>(CURRENT_YEAR - 5);
  const [openAccessOnly, setOpenAccessOnly] = useState(false);
  const [country, setCountry] = useState<string | null>(null);
  const [result, setResult] = useState<SearchResult | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>("relevance");
  const [selectedSources, setSelectedSources] = useState<Set<string>>(new Set());

  // localStorage isn't available while server rendering, so read it after mount.
  const [history, setHistory] = useState<string[]>([]);
  useEffect(() => setHistory(getSearchHistory()), []);

  // Suggestions come from the whole result set for the query that produced it —
  // the input may have been edited since.
  const [searchedQuery, setSearchedQuery] = useState("");
  const relatedTerms = useMemo(
    () => (result ? suggestTerms(result.papers, searchedQuery) : []),
    [result, searchedQuery]
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
      setHistory(addSearchHistory(input.query));
      setSearchedQuery(input.query);
      storeRecentPapers(data.papers);
      const ok = Object.values(data.sources).filter((s) => s === "ok").length;
      if (ok === 0) toast("No database returned results. Try different words.", "error");
      else toast(`${data.papers.length} papers in ${(data.tookMs / 1000).toFixed(1)}s`, "success");
    },
    onError: (e: Error) => toast(e.message, "error"),
  });

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (query.trim().length < MIN_QUERY_LENGTH) return;
    search.mutate({ query: query.trim(), fromYear, openAccessOnly, country });
  }

  function runSearch(q: string) {
    setQuery(q);
    search.mutate({ query: q, fromYear, openAccessOnly, country });
  }

  // Opened from a shared link or a refresh: restore the form and re-run.
  useEffect(() => {
    const input = parseSearchParams(window.location.search, { fromYear: CURRENT_YEAR - 5 });
    if (!input) return;
    setQuery(input.query);
    setFromYear(input.fromYear);
    setOpenAccessOnly(input.openAccessOnly);
    setCountry(input.country);
    search.mutate(input);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const canSearch = query.trim().length >= MIN_QUERY_LENGTH && !search.isPending;
  const customYear = !YEAR_PRESETS.some((p) => p.value === fromYear);

  return (
    <div className="mx-auto max-w-4xl">
      <header className="mb-6">
        <p className="overline">Review of related literature</p>
        <h1 className="display mt-3 text-3xl sm:text-4xl">Find related literature</h1>
        <p className="mt-2 text-muted">
          {KEYLESS_SOURCE_COUNT} free databases, searched together and ranked by relevance.
        </p>
      </header>

      <form onSubmit={onSubmit} className="panel" role="search">
        <label htmlFor="q" className="field-label">Your topic</label>
        <div className="flex flex-col gap-2 sm:flex-row">
          <div className="relative flex-1">
            <SearchIcon
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-subtle"
              aria-hidden
            />
            <input
              id="q"
              type="search"
              enterKeyHint="search"
              autoComplete="off"
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="e.g. vendor challenges supply chain"
              className="input pl-9"
            />
          </div>
          <button type="submit" disabled={!canSearch} className="btn-primary sm:min-w-[120px]">
            {search.isPending ? "Searching…" : "Search"}
          </button>
        </div>
        <p className="field-hint">Three to six topic words works best. Skip full sentences.</p>

        <div className="mt-4 grid gap-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] sm:items-end">
          <div>
            <label htmlFor="from-year" className="field-label">Published since</label>
            <select
              id="from-year"
              value={fromYear}
              onChange={(e) => setFromYear(Number(e.target.value))}
              className="input"
            >
              {YEAR_PRESETS.map((p) => (
                <option key={p.value} value={p.value}>{p.label}</option>
              ))}
              {/* A shared link can carry a year that isn't one of the presets. */}
              {customYear && <option value={fromYear}>{fromYear}+ (from link)</option>}
            </select>
          </div>

          <div>
            <span className="field-label">Country focus</span>
            <CountryCombobox value={country} onChange={setCountry} />
          </div>

          <label className="flex cursor-pointer items-center gap-2 pb-2 text-sm text-muted">
            <input
              type="checkbox"
              checked={openAccessOnly}
              onChange={(e) => setOpenAccessOnly(e.target.checked)}
              className="h-4 w-4 rounded border-border2 bg-surface2"
              style={{ accentColor: "rgb(var(--accent))" }}
            />
            Free full text only
          </label>
        </div>

        {country && (
          <p className="mt-3">
            <span className="chip chip-on">
              <Globe className="h-3 w-3" aria-hidden />
              Papers about {country}
              <button
                type="button"
                onClick={() => setCountry(null)}
                aria-label={`Remove ${country} filter`}
                className="ml-0.5"
              >
                <X className="h-3 w-3" aria-hidden />
              </button>
            </span>
          </p>
        )}

        {!result && history.length > 0 && (
          <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-border pt-4">
            <span className="text-xs text-subtle">Recent</span>
            {history.map((h) => (
              <button
                key={h}
                type="button"
                onClick={() => runSearch(h)}
                className="chip-btn max-w-[240px] truncate"
                title={h}
              >
                {h}
              </button>
            ))}
            <button
              type="button"
              onClick={() => { clearSearchHistory(); setHistory([]); }}
              className="text-xs text-subtle underline"
            >
              Clear
            </button>
          </div>
        )}

        {!result && (
          <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-border pt-4">
            <span className="text-xs text-subtle">Try</span>
            {EXAMPLE_TOPICS.map((t) => (
              <button key={t} type="button" onClick={() => setQuery(t)} className="chip-btn">
                {t}
              </button>
            ))}
          </div>
        )}
      </form>

      {search.isError && (
        <p role="alert" className="notice notice-danger mt-4">
          <strong>Search failed.</strong> {(search.error as Error).message}
        </p>
      )}

      {search.isPending && (
        <div className="mt-6">
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
        <section className="mt-8" aria-label="Results">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg">
              {visible.length}
              {visible.length !== result.papers.length && ` of ${result.papers.length}`}{" "}
              {result.papers.length === 1 ? "paper" : "papers"}
              <span className="ml-2 text-sm font-normal text-subtle">
                {(result.tookMs / 1000).toFixed(1)}s
              </span>
            </h2>

            {result.papers.length > 0 && (
              <label className="flex items-center gap-2 text-sm text-muted">
                Sort
                <select
                  value={sortKey}
                  onChange={(e) => setSortKey(e.target.value as SortKey)}
                  className="input !min-h-[36px] !w-auto !py-1 text-sm"
                >
                  {SORT_OPTIONS.map((o) => (
                    <option key={o.key} value={o.key}>{o.label}</option>
                  ))}
                </select>
              </label>
            )}
          </div>

          {/* Per-database status; click one with results to narrow the list. */}
          <div className="mt-3 flex flex-wrap gap-1.5">
            {Object.entries(result.sources).map(([name, status]) => {
              const failed = status === "error";
              const n = sourceCounts[name] ?? 0;
              const on = selectedSources.has(name);
              const clickable = !failed && n > 0;
              return (
                <button
                  key={name}
                  type="button"
                  disabled={!clickable}
                  onClick={() => toggleSource(name)}
                  aria-pressed={on}
                  title={
                    failed
                      ? `${sourceLabel(name)} failed or timed out`
                      : `${SOURCE_META[name]?.blurb ?? name}${clickable ? " — click to filter" : ""}`
                  }
                  className={`chip-btn ${on ? "chip-on" : ""}`}
                  style={
                    failed
                      ? { color: "rgb(var(--danger))", borderColor: "rgb(var(--danger) / 0.4)" }
                      : n === 0
                      ? { opacity: 0.5 }
                      : undefined
                  }
                >
                  {sourceLabel(name)} {failed ? "failed" : n}
                </button>
              );
            })}
            {selectedSources.size > 0 && (
              <button
                type="button"
                onClick={() => setSelectedSources(new Set())}
                className="chip-btn"
              >
                Clear source filter
              </button>
            )}
          </div>

          {relatedTerms.length > 0 && (
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span className="text-xs text-subtle">Narrow with</span>
              {relatedTerms.map((t) => (
                <button
                  key={t.term}
                  type="button"
                  disabled={search.isPending}
                  onClick={() => runSearch(`${searchedQuery} ${t.term}`)}
                  title={`${t.count} results mention this`}
                  className="chip-btn"
                >
                  + {t.term}
                </button>
              ))}
            </div>
          )}

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
                  : country
                  ? "Try removing the country filter or using a broader topic."
                  : "Try fewer or broader words, widen the year range, or turn off “free full text only”."}
              </p>
              {selectedSources.size > 0 && (
                <button
                  onClick={() => setSelectedSources(new Set())}
                  className="btn-secondary btn-sm mt-4"
                >
                  Clear source filter
                </button>
              )}
            </div>
          )}
        </section>
      )}
    </div>
  );
}
