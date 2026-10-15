"use client";

import { useMemo, useState } from "react";
import { ChevronDown } from "lucide-react";
import type { SearchResult } from "@/lib/types";
import type { SearchInput } from "@/lib/search/params";
import { sourceLabel, SOURCE_META } from "@/lib/sources/meta";
import { suggestTerms } from "@/lib/search/related-terms";
import {
  MIN_CITATIONS,
  NO_REFINEMENT,
  RECORD_TYPES,
  countBySource,
  isRefined,
  recordTypes,
  type RecordType,
  type Refinement,
} from "@/lib/search/result-view";

/**
 * The search page's side panel: refine by record type, local studies and
 * citations; narrow to some databases (and see which failed); and terms to
 * add to the search. From lg up it sits beside the results; on a phone it
 * comes before them, with the database list folded.
 */
export function ResultsSidebar({
  result,
  searched,
  local,
  refinement,
  onRefinement,
  selectedSources,
  onSelectedSources,
  onNarrow,
}: {
  result: SearchResult;
  /** The search that produced `result`; suggestions are taken from it, as the form may have changed since. */
  searched: SearchInput | null;
  /** The country whose studies count as local. */
  local: string;
  refinement: Refinement;
  onRefinement: React.Dispatch<React.SetStateAction<Refinement>>;
  selectedSources: ReadonlySet<string>;
  onSelectedSources: React.Dispatch<React.SetStateAction<Set<string>>>;
  /** Run a search with a suggested term added. */
  onNarrow: (input: SearchInput) => void;
}) {
  // Phones only: the database list is folded so results start near the top.
  const [sourcesOpen, setSourcesOpen] = useState(false);
  // Databases with no results are folded away; with 50 sources they would
  // otherwise push the useful ones off screen.
  const [showIdle, setShowIdle] = useState(false);

  const typeCounts = useMemo(() => {
    const counts: Partial<Record<RecordType, number>> = {};
    for (const p of result.papers) for (const t of recordTypes(p)) counts[t] = (counts[t] ?? 0) + 1;
    return counts;
  }, [result]);

  const relatedTerms = useMemo(() => (searched ? suggestTerms(result.papers, searched.query) : []), [result, searched]);

  const sourceCounts = useMemo(() => countBySource(result.papers), [result]);
  // Databases with results first, most results on top; the rest after.
  const [activeSources, idleSources] = useMemo(() => {
    const names = Object.keys(result.sources);
    const active = names.filter((n) => (sourceCounts[n] ?? 0) > 0).sort((a, b) => sourceCounts[b] - sourceCounts[a]);
    const idle = names.filter((n) => !(sourceCounts[n] > 0));
    return [active, idle];
  }, [result, sourceCounts]);

  function toggleType(t: RecordType) {
    onRefinement((r) => {
      const types = new Set(r.types);
      if (types.has(t)) types.delete(t);
      else types.add(t);
      return { ...r, types };
    });
  }

  function toggleSource(name: string) {
    onSelectedSources((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  }

  return (
    <aside className="min-w-0 space-y-6 lg:sticky lg:top-20 lg:col-start-2 lg:row-span-2 lg:row-start-1 lg:max-h-[calc(100vh-6rem)] lg:overflow-y-auto lg:pr-1">
      <section aria-labelledby="refine-h">
        <div className="flex items-baseline justify-between">
          <h2 id="refine-h" className="eyebrow">Refine</h2>
          {isRefined(refinement) && (
            <button type="button" onClick={() => onRefinement(NO_REFINEMENT)} className="text-xs text-muted underline">
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
            onChange={(e) => onRefinement((r) => ({ ...r, localTo: e.target.checked ? local : null }))}
            className="h-4 w-4 rounded"
            style={{ accentColor: "rgb(var(--accent))" }}
          />
          Local studies only ({local})
        </label>
        <label className="mt-2 flex items-center gap-2 text-sm text-muted">
          Cited at least
          <select
            value={refinement.minCitations}
            onChange={(e) => onRefinement((r) => ({ ...r, minCitations: Number(e.target.value) }))}
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
            <button type="button" onClick={() => onSelectedSources(new Set())} className="text-xs text-muted underline">
              Show all
            </button>
          )}
        </div>
        <p className={`${sourcesOpen ? "block" : "hidden"} mt-2 text-xs text-subtle lg:mt-1 lg:block`}>
          Select one or more to narrow the list.
          {selectedSources.size > 0 && (
            <button type="button" onClick={() => onSelectedSources(new Set())} className="ml-2 underline lg:hidden">
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
                {showIdle ? "Hide databases with no results" : `${idleSources.length} more with no results`}
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
                onClick={() => onNarrow({ ...searched, query: `${searched.query} ${t.term}` })}
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
  );
}
