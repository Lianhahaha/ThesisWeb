"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { mergeRecentPapers } from "@/lib/search/recent-papers";
import { authHeaders } from "@/lib/auth/id-token";
import { displayTitle } from "@/lib/title-case";
import { sourceLabel } from "@/lib/sources/meta";
import type { Paper } from "@/lib/types";

interface ThemePaper {
  paper: Paper;
  why: string;
}

interface Theme {
  label: string;
  terms: string[];
  papers: ThemePaper[];
}

interface TopicResponse {
  query: string;
  terms: string[];
  country: string | null;
  openAccessOnly: boolean;
  total: number;
  themes: Theme[];
  tookMs: number;
}

const EXAMPLES = [
  "How small sari-sari store owners in the province keep track of their stock",
  "Reading comprehension strategies for senior high school students",
  "Waste management practices of coastal barangays",
];

/** Title, who wrote it, when — the line under every result. */
function metaLine(paper: Paper): string {
  const parts: string[] = [];
  if (paper.authors.length) {
    parts.push(paper.authors.slice(0, 2).join(", ") + (paper.authors.length > 2 ? " et al." : ""));
  }
  if (paper.year) parts.push(String(paper.year));
  if (paper.venue) parts.push(paper.venue);
  return parts.join(" · ");
}

function TopicRow({ paper, why }: ThemePaper) {
  const source = paper.sources[0] ? sourceLabel(paper.sources[0]) : null;
  return (
    <li className="py-3">
      <Link
        href={`/paper/${encodeURIComponent(paper.id)}`}
        className="font-medium leading-snug hover:underline"
      >
        {displayTitle(paper.title)}
      </Link>
      <p className="mt-1 text-xs text-muted">{metaLine(paper)}</p>
      <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs">
        {source && <span className="chip">{source}</span>}
        {paper.isOpenAccess && paper.openAccessUrl && (
          <a
            href={paper.openAccessUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="underline decoration-dotted underline-offset-2 hover:text-text"
          >
            Free full text
          </a>
        )}
        <span className="text-subtle">{why}</span>
      </div>
    </li>
  );
}

/**
 * The "describe your topic" box. It sends the paragraph to /api/topics, which
 * turns it into topic words, searches every database, ranks what comes back
 * against the description, and groups it. Nothing here writes text: every
 * paper is a real record.
 */
export function TopicPlanner() {
  const [description, setDescription] = useState("");
  const [busy, setBusy] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<TopicResponse | null>(null);

  useEffect(() => {
    if (!busy) return;
    setSeconds(0);
    const timer = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(timer);
  }, [busy]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const text = description.trim();
    if (text.length < 8) {
      setError("Add a sentence or two about what you are studying.");
      return;
    }
    setBusy(true);
    setError(null);
    setData(null);
    try {
      const res = await fetch("/api/topics", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(await authHeaders()) },
        body: JSON.stringify({ description: text }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || "That did not work. Try again.");
      mergeRecentPapers(body.themes.flatMap((t: Theme) => t.papers.map((p) => p.paper)));
      setData(body as TopicResponse);
    } catch (err) {
      setError(err instanceof Error ? err.message : "That did not work. Try again.");
    } finally {
      setBusy(false);
    }
  }

  const best = data ? data.themes.flatMap((t) => t.papers).slice(0, 5) : [];

  return (
    <>
      <form onSubmit={onSubmit} className="panel mt-6 space-y-3">
        <label htmlFor="topic-description" className="field-label">
          What is your thesis about?
        </label>
        <textarea
          id="topic-description"
          className="input min-h-[104px] resize-y text-[15px] sm:text-base"
          maxLength={500}
          placeholder="e.g. How small sari-sari store owners in Naval, Biliran keep track of stock, and what makes them adopt a digital record-keeping app"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-subtle">{description.length}/500 characters</p>
          <button type="submit" disabled={busy} className="btn-primary w-full sm:w-auto">
            {busy ? "Searching…" : "Find and group papers"}
          </button>
        </div>
      </form>

      {!data && !busy && (
        <div className="mt-4">
          <p className="text-xs text-subtle">Try one of these:</p>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {EXAMPLES.map((example) => (
              <button
                key={example}
                type="button"
                className="chip-btn max-w-full text-left text-xs"
                onClick={() => setDescription(example)}
              >
                {example}
              </button>
            ))}
          </div>
        </div>
      )}

      {error && (
        <p role="alert" className="notice notice-danger mt-4">
          {error}
        </p>
      )}

      {busy && (
        <div role="status" className="panel mt-4 text-sm text-muted">
          <p>
            Searching 123 databases, then ranking what comes back against your description.
            {seconds > 0 ? ` ${seconds}s…` : ""}
          </p>
          <p className="mt-1 text-xs text-subtle">
            This takes a few seconds. Every database that answers is kept; slow ones are dropped.
          </p>
        </div>
      )}

      {data && (
        <section className="mt-6" aria-label="Results for your topic">
          <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-b border-border pb-3">
            <p className="text-sm text-muted">
              <strong className="text-text">{data.total}</strong> papers ·{" "}
              <strong className="text-text">{data.themes.length}</strong> themes ·{" "}
              {(data.tookMs / 1000).toFixed(1)}s
            </p>
            <Link
              href={`/search?q=${encodeURIComponent(data.query)}`}
              className="text-sm text-accent underline"
            >
              Open as a normal search
            </Link>
          </div>
          <p className="mt-2 text-xs text-subtle">
            Searched for <span className="text-muted">{data.query}</span>
            {data.country ? ` · ${data.country}` : ""}
            {data.openAccessOnly ? " · free full text only" : ""}
          </p>

          {data.themes.length === 0 && (
            <p className="mt-6 text-muted">
              No papers matched that description. Try naming the topic more directly, or broader
              terms.
            </p>
          )}

          {best.length > 0 && (
            <section className="mt-6" aria-labelledby="best-matches">
              <h2 id="best-matches" className="text-lg">
                Best matches
                <span className="ml-2 text-sm text-subtle">closest to your description</span>
              </h2>
              <ol className="mt-1 divide-y divide-border border-t border-border">
                {best.map((entry) => (
                  <TopicRow key={`best-${entry.paper.id}`} {...entry} />
                ))}
              </ol>
            </section>
          )}

          {data.themes.map((theme) => (
            <section key={theme.label} className="mt-8" aria-labelledby={`theme-${theme.label}`}>
              <h2 id={`theme-${theme.label}`} className="text-lg">
                {theme.label}
                <span className="ml-2 text-sm text-subtle">
                  {theme.papers.length} {theme.papers.length === 1 ? "paper" : "papers"}
                </span>
              </h2>
              <ul className="mt-1 divide-y divide-border border-t border-border">
                {theme.papers.map((entry) => (
                  <TopicRow key={`${theme.label}-${entry.paper.id}`} {...entry} />
                ))}
              </ul>
            </section>
          ))}
        </section>
      )}
    </>
  );
}
