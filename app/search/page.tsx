"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { useMutation } from "@tanstack/react-query";
import {
  Search as SearchIcon, Loader2, AlertTriangle,
  SlidersHorizontal, Globe, ChevronDown, X,
} from "lucide-react";
import { PaperCard } from "@/components/PaperCard";
import { toast } from "@/components/Toaster";
import { storeRecentPapers } from "@/lib/recent-papers";
import type { Paper, SearchResult } from "@/lib/types";
import { ALL_COUNTRIES, filterCountries } from "@/lib/countries";
import { KEYLESS_SOURCE_COUNT, sourceLabel, sourceStyle, SOURCE_META } from "@/lib/sources/meta";
import { MIN_QUERY_LENGTH, buildSearchParams, parseSearchParams, type SearchInput } from "@/lib/search-params";
import { SORT_OPTIONS, countBySource, filterBySources, sortPapers, type SortKey } from "@/lib/result-view";

const CURRENT_YEAR = new Date().getFullYear();

const EXAMPLE_TOPICS = [
  "vendor challenges supply chain",
  "mental health impact of social media students",
  "microplastics freshwater ecosystems",
  "blockchain supply chain transparency",
];

// ─── Country Combobox ────────────────────────────────────────────────────────
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

  // Close on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Close on Escape key
  useEffect(() => {
    if (!open) return;
    function handler(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open]);

  function handleOpen() {
    setOpen(true);
    setSearch("");
    setTimeout(() => inputRef.current?.focus(), 50);
  }

  function handleSelect(country: string | null) {
    onChange(country);
    setOpen(false);
    setSearch("");
  }

  return (
    <div ref={ref} className="relative flex-1 xs:flex-none">
      {/* Trigger */}
      <button
        type="button"
        onClick={handleOpen}
        className="input !flex items-center gap-1.5 !py-1 !text-xs justify-between w-full xs:w-[170px] cursor-pointer"
        style={{
          color: value ? "rgb(var(--text))" : "rgb(var(--subtle))",
          borderColor: value ? "#388bfd" : undefined,
        }}
      >
        <Globe className="h-3.5 w-3.5 shrink-0" style={{ color: "rgb(var(--subtle))" }} />
        <span className="flex-1 text-left truncate">{value ?? "Anywhere (global)"}</span>
        {value ? (
          <span
            role="button"
            tabIndex={0}
            onClick={(e) => { e.stopPropagation(); handleSelect(null); }}
            onKeyDown={(e) => { if (e.key === "Enter") { e.stopPropagation(); handleSelect(null); }}}
            className="hover:text-red-400 transition-colors"
          >
            <X className="h-3.5 w-3.5" />
          </span>
        ) : (
          <ChevronDown className="h-3.5 w-3.5 shrink-0" style={{ color: "rgb(var(--subtle))" }} />
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <div
          className="absolute left-0 top-full mt-1 z-50 rounded-lg border overflow-hidden"
          style={{
            width: "220px",
            backgroundColor: "rgb(var(--surface))",
            borderColor: "rgb(var(--border2))",
            boxShadow: "0 8px 24px rgba(0,0,0,0.4)",
          }}
        >
          {/* Search input */}
          <div className="p-2 border-b" style={{ borderColor: "rgb(var(--border))" }}>
            <input
              ref={inputRef}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search countries…"
              className="input !py-1 !text-xs w-full"
            />
          </div>

          {/* Option list */}
          <div className="overflow-y-auto" style={{ maxHeight: "240px" }}>
            {/* Global option */}
            <button
              type="button"
              onClick={() => handleSelect(null)}
              className="w-full text-left px-3 py-2 text-xs transition-colors flex items-center gap-2"
              style={{
                backgroundColor: !value ? "rgba(56,139,253,0.08)" : undefined,
                color: !value ? "#388bfd" : "rgb(var(--muted))",
              }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = "rgb(var(--surface3))"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = !value ? "rgba(56,139,253,0.08)" : ""; }}
            >
              <Globe className="h-3.5 w-3.5 shrink-0" />
              Anywhere (global)
            </button>

            {/* Country list */}
            {filtered.length === 0 ? (
              <p className="px-3 py-4 text-xs text-center" style={{ color: "rgb(var(--subtle))" }}>
                No countries match.
              </p>
            ) : (
              filtered.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => handleSelect(c)}
                  className="w-full text-left px-3 py-1.5 text-xs transition-colors"
                  style={{
                    backgroundColor: value === c ? "rgba(56,139,253,0.08)" : undefined,
                    color: value === c ? "#388bfd" : "rgb(var(--muted))",
                  }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = "rgb(var(--surface3))"; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = value === c ? "rgba(56,139,253,0.08)" : ""; }}
                >
                  {c}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main Search Page ────────────────────────────────────────────────────────
export default function SearchPage() {
  const [query, setQuery] = useState("");
  const [fromYear, setFromYear] = useState<number>(CURRENT_YEAR - 5);
  const [openAccessOnly, setOpenAccessOnly] = useState(false);
  const [country, setCountry] = useState<string | null>(null);
  const [result, setResult] = useState<SearchResult | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>("relevance");
  // Sources the user narrowed the results to. Empty = show everything.
  const [selectedSources, setSelectedSources] = useState<Set<string>>(new Set());

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
      // Reflect the search in the address bar so it can be refreshed or shared.
      window.history.replaceState(null, "", `?${buildSearchParams(input)}`);
      setSelectedSources(new Set()); // a new search starts unfiltered
      storeRecentPapers(data.papers);
      const okSources = Object.values(data.sources).filter((s) => s === "ok").length;
      const locationNote = input.country ? ` (${input.country})` : "";
      if (okSources === 0) toast("No sources returned results. Try a different topic.", "error");
      else toast(`Found ${data.papers.length} papers in ${(data.tookMs / 1000).toFixed(1)}s${locationNote}`, "success");
    },
    onError: (e: Error) => toast(e.message, "error"),
  });

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (query.trim().length < MIN_QUERY_LENGTH) return;
    search.mutate({ query: query.trim(), fromYear, openAccessOnly, country });
  }

  // Opened from a shared link or a refresh: restore the form and run the search.
  // (Read once on mount; the mutation function is stable enough not to belong in deps.)
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

  return (
    <div className="w-full max-w-[900px] mx-auto">
      {/* Page header */}
      <div className="mb-4">
        <h1 className="text-lg sm:text-xl font-semibold" style={{ color: "rgb(var(--text))" }}>
          Find related literature
        </h1>
        <p className="mt-0.5 text-xs sm:text-sm" style={{ color: "rgb(var(--muted))" }}>
          Search {KEYLESS_SOURCE_COUNT} free databases at once — global, deduplicated, ranked by relevance.
        </p>
      </div>

      {/* Search form */}
      <form
        onSubmit={onSubmit}
        className="mb-4 rounded-lg border p-3"
        style={{ borderColor: "rgb(var(--border))", backgroundColor: "rgb(var(--surface))" }}
      >
        {/* Search input + button */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <SearchIcon
              className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 pointer-events-none"
              style={{ color: "rgb(var(--subtle))" }}
            />
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="e.g. vendor challenges supply chain"
              className="input pl-9"
            />
          </div>
          <button
            type="submit"
            disabled={search.isPending || query.trim().length < 3}
            className="btn-primary shrink-0"
          >
            {search.isPending
              ? <Loader2 className="h-4 w-4 animate-spin" />
              : <SearchIcon className="h-4 w-4" />
            }
            <span className="hidden xs:inline">Search</span>
          </button>
        </div>

        {/* Filters row */}
        <div className="mt-3 flex flex-col xs:flex-row xs:flex-wrap xs:items-center gap-2 xs:gap-3">
          {/* Year filter */}
          <label className="flex items-center gap-1.5 shrink-0">
            <SlidersHorizontal className="h-3.5 w-3.5 shrink-0" style={{ color: "rgb(var(--subtle))" }} />
            <span className="text-xs whitespace-nowrap" style={{ color: "rgb(var(--muted))" }}>From year</span>
            <select
              value={fromYear}
              onChange={(e) => setFromYear(Number(e.target.value))}
              className="input !w-auto !py-1 !text-xs"
            >
              <option value={CURRENT_YEAR - 3}>Last 3 yrs ({CURRENT_YEAR - 3}+)</option>
              <option value={CURRENT_YEAR - 5}>Last 5 yrs ({CURRENT_YEAR - 5}+)</option>
              <option value={CURRENT_YEAR - 10}>Last 10 yrs ({CURRENT_YEAR - 10}+)</option>
              <option value={CURRENT_YEAR - 1}>This & last year</option>
              <option value={0}>All years</option>
              {/* A shared link can carry a year that isn't one of the presets. */}
              {![0, CURRENT_YEAR - 1, CURRENT_YEAR - 3, CURRENT_YEAR - 5, CURRENT_YEAR - 10].includes(fromYear) && (
                <option value={fromYear}>{fromYear}+ (custom)</option>
              )}
            </select>
          </label>

          {/* Country filter */}
          <CountryCombobox value={country} onChange={setCountry} />

          {/* OA toggle */}
          <label className="flex items-center gap-2 cursor-pointer shrink-0">
            <input
              type="checkbox"
              checked={openAccessOnly}
              onChange={(e) => setOpenAccessOnly(e.target.checked)}
              className="rounded h-4 w-4"
              style={{ accentColor: "#238636" }}
            />
            <span className="text-xs whitespace-nowrap" style={{ color: "rgb(var(--muted))" }}>Free full-text only</span>
          </label>
        </div>

        {/* Country badge — shown when active */}
        {country && (
          <div className="mt-2 flex items-center gap-2">
            <span
              className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium"
              style={{
                backgroundColor: "rgba(56,139,253,0.1)",
                color: "#388bfd",
                border: "1px solid rgba(56,139,253,0.3)",
              }}
            >
              <Globe className="h-3 w-3" />
              Showing papers related to: <strong>{country}</strong>
              <button
                type="button"
                onClick={() => setCountry(null)}
                className="ml-1 hover:text-red-400 transition-colors"
                aria-label="Remove country filter"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          </div>
        )}

        {/* Example chips */}
        {!result && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            <span className="text-xs self-center" style={{ color: "rgb(var(--subtle))" }}>Try:</span>
            {EXAMPLE_TOPICS.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setQuery(t)}
                className="rounded-full px-2.5 py-1 text-xs font-medium transition-colors"
                style={{
                  backgroundColor: "rgba(139,148,158,0.08)",
                  color: "rgb(var(--muted))",
                  border: "1px solid rgb(var(--border))",
                }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = "rgb(var(--surface3))"; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = "rgba(139,148,158,0.08)"; }}
              >
                {t}
              </button>
            ))}
          </div>
        )}
      </form>

      {/* Error */}
      {search.isError && (
        <div
          className="mb-4 flex items-start gap-2 rounded-lg border p-3 text-sm"
          style={{
            borderColor: "rgba(248,81,73,0.4)",
            backgroundColor: "rgba(248,81,73,0.08)",
            color: "#f85149",
          }}
        >
          <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
          <div>
            <p className="font-medium text-xs">Search failed</p>
            <p className="text-xs mt-0.5" style={{ color: "rgb(var(--muted))" }}>
              {(search.error as Error).message}
            </p>
          </div>
        </div>
      )}

      {/* Results header */}
      {result && (
        <div
          className="px-3 py-2 rounded-t-lg border border-b-0 flex flex-wrap items-center gap-x-3 gap-y-1.5"
          style={{ backgroundColor: "rgb(var(--surface2))", borderColor: "rgb(var(--border))" }}
        >
          <span className="text-sm font-semibold" style={{ color: "rgb(var(--text))" }}>
            {visible.length}
            {visible.length !== result.papers.length && ` of ${result.papers.length}`} results
          </span>
          <span className="text-xs" style={{ color: "rgb(var(--subtle))" }}>
            {(result.tookMs / 1000).toFixed(1)}s
          </span>
          {country && (
            <span className="text-xs" style={{ color: "#388bfd" }}>
              · filtered to <strong>{country}</strong>
            </span>
          )}
          <label className="flex items-center gap-1.5 text-xs" style={{ color: "rgb(var(--muted))" }}>
            Sort
            <select
              value={sortKey}
              onChange={(e) => setSortKey(e.target.value as SortKey)}
              className="input !w-auto !py-0.5 !text-xs"
            >
              {SORT_OPTIONS.map((o) => (
                <option key={o.key} value={o.key}>{o.label}</option>
              ))}
            </select>
          </label>
          <div className="flex flex-wrap gap-1.5 ml-0 xs:ml-auto">
            {Object.entries(result.sources).map(([name, status]) => {
              const c = sourceStyle(name);
              const failed = status === "error";
              const count = sourceCounts[name] ?? 0;
              const active = selectedSources.has(name);
              // Sources with no results (or that errored) have nothing to filter to.
              const clickable = !failed && count > 0;
              return (
                <button
                  type="button"
                  key={name}
                  disabled={!clickable}
                  onClick={() => toggleSource(name)}
                  aria-pressed={active}
                  title={
                    failed
                      ? `${sourceLabel(name)} failed or timed out`
                      : `${SOURCE_META[name]?.blurb ?? name}${clickable ? " — click to filter" : ""}`
                  }
                  className="badge text-[11px] disabled:cursor-default"
                  style={{
                    backgroundColor: failed ? "rgba(248,81,73,0.1)" : c.bg,
                    color: failed ? "#f85149" : c.color,
                    borderColor: failed ? "rgba(248,81,73,0.3)" : active ? c.color : c.border,
                    fontWeight: active ? 700 : undefined,
                    opacity: !failed && count === 0 ? 0.55 : 1,
                  }}
                >
                  {sourceLabel(name)}{failed ? " ✕" : ` ${count}`}
                </button>
              );
            })}
            {selectedSources.size > 0 && (
              <button
                type="button"
                onClick={() => setSelectedSources(new Set())}
                className="badge text-[11px]"
                style={{ color: "rgb(var(--muted))", borderColor: "rgb(var(--border))" }}
              >
                Clear filter
              </button>
            )}
          </div>
        </div>
      )}

      {/* Loading skeleton */}
      {search.isPending && (
        <div className="rounded-lg border overflow-hidden" style={{ borderColor: "rgb(var(--border))" }}>
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="flex gap-3 px-3 sm:px-4 py-3 animate-pulse"
              style={{
                borderBottom: i < 4 ? "1px solid rgb(var(--border))" : undefined,
                backgroundColor: "rgb(var(--surface))",
              }}
            >
              <div className="h-4 w-4 rounded-full shrink-0 mt-1" style={{ backgroundColor: "rgb(var(--surface3))" }} />
              <div className="flex-1 space-y-2">
                <div className="h-3.5 rounded" style={{ backgroundColor: "rgb(var(--surface3))", width: "72%" }} />
                <div className="h-3 rounded" style={{ backgroundColor: "rgb(var(--surface2))", width: "48%" }} />
                <div className="h-3 rounded" style={{ backgroundColor: "rgb(var(--surface2))", width: "90%" }} />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Results list */}
      {result && visible.length > 0 && (
        <div className="rounded-b-lg border overflow-hidden" style={{ borderColor: "rgb(var(--border))" }}>
          {visible.map((p, i) => (
            <PaperCard key={p.id} paper={p} showScore refNum={i + 1} />
          ))}
        </div>
      )}

      {result && result.papers.length === 0 && !search.isPending && (
        <div
          className="rounded-b-lg border p-8 text-center"
          style={{ borderColor: "rgb(var(--border))", backgroundColor: "rgb(var(--surface))" }}
        >
          <p className="font-medium text-sm" style={{ color: "rgb(var(--text))" }}>
            No papers found.
          </p>
          <p className="text-xs mt-1" style={{ color: "rgb(var(--muted))" }}>
            {country
              ? `Try removing the country filter or using a broader topic.`
              : `Try a broader topic, change the year filter, or turn off "free full-text only".`}
          </p>
          {country && (
            <button
              className="mt-3 btn-secondary !text-xs !py-1"
              onClick={() => setCountry(null)}
            >
              <Globe className="h-3.5 w-3.5" /> Remove country filter
            </button>
          )}
        </div>
      )}
    </div>
  );
}
