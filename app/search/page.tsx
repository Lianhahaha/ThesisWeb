"use client";

import { useState, useRef, useEffect } from "react";
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

const CURRENT_YEAR = new Date().getFullYear();

const EXAMPLE_TOPICS = [
  "vendor challenges supply chain",
  "mental health impact of social media students",
  "microplastics freshwater ecosystems",
  "blockchain supply chain transparency",
];

const SOURCE_COLORS: Record<string, { bg: string; color: string; border: string }> = {
  openalex:        { bg: "rgba(56,139,253,0.1)",  color: "#388bfd", border: "rgba(56,139,253,0.3)" },
  crossref:        { bg: "rgba(63,185,80,0.1)",   color: "#3fb950", border: "rgba(63,185,80,0.3)"  },
  semanticscholar: { bg: "rgba(188,140,255,0.1)", color: "#bc8cff", border: "rgba(188,140,255,0.3)" },
  doaj:            { bg: "rgba(210,153,34,0.1)",  color: "#d29922", border: "rgba(210,153,34,0.3)" },
  europepmc:       { bg: "rgba(100,196,196,0.1)", color: "#64c4c4", border: "rgba(100,196,196,0.3)" },
  pubmed:          { bg: "rgba(248,129,74,0.1)",  color: "#f8814a", border: "rgba(248,129,74,0.3)"  },
  arxiv:           { bg: "rgba(224,96,96,0.1)",   color: "#e06060", border: "rgba(224,96,96,0.3)"  },
};

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

  const search = useMutation({
    mutationFn: async () => {
      const params = new URLSearchParams({ q: query, fromYear: String(fromYear) });
      if (openAccessOnly) params.set("openAccessOnly", "1");
      if (country) params.set("country", country);
      const res = await fetch(`/api/search?${params}`);
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Search failed" }));
        throw new Error(err.error || "Search failed");
      }
      return (await res.json()) as SearchResult;
    },
    onSuccess: (data) => {
      setResult(data);
      storeRecentPapers(data.papers);
      const okSources = Object.values(data.sources).filter((s) => s === "ok").length;
      const locationNote = country ? ` (${country})` : "";
      if (okSources === 0) toast("No sources returned results. Try a different topic.", "error");
      else toast(`Found ${data.papers.length} papers in ${(data.tookMs / 1000).toFixed(1)}s${locationNote}`, "success");
    },
    onError: (e: Error) => toast(e.message, "error"),
  });

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (query.trim().length < 3) return;
    search.mutate();
  }

  return (
    <div className="w-full max-w-[900px] mx-auto">
      {/* Page header */}
      <div className="mb-4">
        <h1 className="text-lg sm:text-xl font-semibold" style={{ color: "rgb(var(--text))" }}>
          Find related literature
        </h1>
        <p className="mt-0.5 text-xs sm:text-sm" style={{ color: "rgb(var(--muted))" }}>
          Search 280M+ papers across 7 databases — global, free, ranked by relevance.
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
            {result.papers.length} results
          </span>
          <span className="text-xs" style={{ color: "rgb(var(--subtle))" }}>
            {(result.tookMs / 1000).toFixed(1)}s
          </span>
          {country && (
            <span className="text-xs" style={{ color: "#388bfd" }}>
              · filtered to <strong>{country}</strong>
            </span>
          )}
          <div className="flex flex-wrap gap-1.5 ml-0 xs:ml-auto">
            {Object.entries(result.sources).map(([name, status]) => {
              const c = SOURCE_COLORS[name] ?? { bg: "rgba(139,148,158,0.1)", color: "rgb(var(--muted))", border: "rgb(var(--border))" };
              const failed = status === "error";
              return (
                <span
                  key={name}
                  className="badge text-[11px]"
                  style={{
                    backgroundColor: failed ? "rgba(248,81,73,0.1)" : c.bg,
                    color: failed ? "#f85149" : c.color,
                    borderColor: failed ? "rgba(248,81,73,0.3)" : c.border,
                  }}
                >
                  {name}{status === "ok" ? " ✓" : status === "error" ? " ✕" : ""}
                </span>
              );
            })}
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
      {result && result.papers.length > 0 && (
        <div className="rounded-b-lg border overflow-hidden" style={{ borderColor: "rgb(var(--border))" }}>
          {result.papers.map((p, i) => (
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
