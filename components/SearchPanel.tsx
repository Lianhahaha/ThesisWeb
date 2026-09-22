"use client";

import { useEffect, useState } from "react";
import { Search as SearchIcon, X } from "lucide-react";
import { CountryCombobox } from "@/components/CountryCombobox";
import { clearSearchHistory, getSearchHistory } from "@/lib/search-history";
import { MIN_QUERY_LENGTH, type SearchInput } from "@/lib/search-params";

const CURRENT_YEAR = new Date().getFullYear();

export const DEFAULT_FROM_YEAR = CURRENT_YEAR - 5;

const YEAR_PRESETS = [
  { value: CURRENT_YEAR - 1, label: `Last 2 years (${CURRENT_YEAR - 1}+)` },
  { value: CURRENT_YEAR - 3, label: `Last 3 years (${CURRENT_YEAR - 3}+)` },
  { value: CURRENT_YEAR - 5, label: `Last 5 years (${CURRENT_YEAR - 5}+)` },
  { value: CURRENT_YEAR - 10, label: `Last 10 years (${CURRENT_YEAR - 10}+)` },
  { value: 0, label: "Any year" },
];

/** A few of these are shown at random on each visit. */
const EXAMPLE_TOPICS = [
  "vendor challenges supply chain",
  "mental health impact of social media students",
  "microplastics freshwater ecosystems",
  "blockchain supply chain transparency",
  "reading comprehension strategies senior high school",
  "financial literacy college students",
  "online learning readiness Philippines",
  "sari-sari store sustainability",
  "teacher burnout public schools",
  "climate change adaptation farmers",
  "customer satisfaction fast food",
  "ChatGPT use in academic writing",
  "sleep quality academic performance",
  "e-wallet adoption small businesses",
  "flood risk management urban",
  "nurse workload patient safety",
  "tourism impact local communities",
  "mother tongue based education",
];

const EXAMPLES_SHOWN = 4;

function pickExamples(): string[] {
  const pool = [...EXAMPLE_TOPICS];
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, EXAMPLES_SHOWN);
}

/**
 * The search form: topic, year range, country focus, full-text filter,
 * recent searches and example topics. Controlled by the parent, which decides
 * what "search" means (run it here, or go to the results page).
 */
export function SearchPanel({
  value,
  onChange,
  onSearch,
  pending = false,
  showSuggestions = true,
}: {
  value: SearchInput;
  onChange: (next: SearchInput) => void;
  onSearch: (input: SearchInput) => void;
  pending?: boolean;
  showSuggestions?: boolean;
}) {
  // localStorage isn't available while server rendering, so read it after mount.
  const [history, setHistory] = useState<string[]>([]);
  // Random picks differ between server and browser, so choose after mount.
  const [examples, setExamples] = useState<string[]>([]);
  useEffect(() => {
    setHistory(getSearchHistory());
    setExamples(pickExamples());
  }, []);

  const set = (patch: Partial<SearchInput>) => onChange({ ...value, ...patch });
  const canSearch = value.query.trim().length >= MIN_QUERY_LENGTH && !pending;
  const customYear = !YEAR_PRESETS.some((p) => p.value === value.fromYear);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (canSearch) onSearch({ ...value, query: value.query.trim() });
  }

  return (
    <form onSubmit={submit} role="search" className="panel text-left">
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
            value={value.query}
            onChange={(e) => set({ query: e.target.value })}
            placeholder="e.g. vendor challenges supply chain"
            className="input pl-9"
          />
        </div>
        <button type="submit" disabled={!canSearch} className="btn-primary sm:min-w-[120px]">
          {pending ? "Searching…" : "Search"}
        </button>
      </div>
      <p className="field-hint">Three to six topic words work best. Skip full sentences.</p>

      <div className="mt-4 grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] sm:items-end">
        <div>
          <label htmlFor="from-year" className="field-label">Published since</label>
          <select
            id="from-year"
            value={value.fromYear}
            onChange={(e) => set({ fromYear: Number(e.target.value) })}
            className="input"
          >
            {YEAR_PRESETS.map((p) => (
              <option key={p.value} value={p.value}>{p.label}</option>
            ))}
            {/* A shared link can carry a year that isn't one of the presets. */}
            {customYear && <option value={value.fromYear}>{value.fromYear}+ (from link)</option>}
          </select>
        </div>

        <div>
          <label htmlFor="country" className="field-label">Country focus</label>
          <div className="flex items-center gap-1">
            <div className="flex-1">
              <CountryCombobox id="country" value={value.country} onChange={(c) => set({ country: c })} />
            </div>
            {value.country && (
              <button
                type="button"
                onClick={() => set({ country: null })}
                className="btn-ghost btn-sm !px-2"
                aria-label={`Remove ${value.country} filter`}
              >
                <X className="h-4 w-4" aria-hidden />
              </button>
            )}
          </div>
        </div>

        <label className="flex cursor-pointer items-center gap-2 pb-2.5 text-sm text-muted">
          <input
            type="checkbox"
            checked={value.openAccessOnly}
            onChange={(e) => set({ openAccessOnly: e.target.checked })}
            className="h-4 w-4 rounded"
            style={{ accentColor: "rgb(var(--accent))" }}
          />
          Free full text only
        </label>
      </div>

      {showSuggestions && history.length > 0 && (
        <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-border pt-4">
          <span className="text-xs text-subtle">Recent</span>
          {history.map((h) => (
            <button
              key={h}
              type="button"
              disabled={pending}
              onClick={() => {
                const next = { ...value, query: h };
                onChange(next);
                onSearch(next);
              }}
              className="chip-btn max-w-[240px]"
              title={h}
            >
              <span className="truncate">{h}</span>
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

      {showSuggestions && examples.length > 0 && (
        <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-border pt-4">
          <span className="text-xs text-subtle">Try</span>
          {examples.map((t) => (
            <button key={t} type="button" onClick={() => set({ query: t })} className="chip-btn">
              {t}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setExamples(pickExamples())}
            className="text-xs text-subtle underline"
          >
            Shuffle
          </button>
        </div>
      )}
    </form>
  );
}
