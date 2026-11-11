"use client";

import { useState } from "react";
import Link from "next/link";
import { PaperCard } from "@/components/PaperCard";
import { mergeRecentPapers } from "@/lib/search/recent-papers";
import { authHeaders } from "@/lib/auth/id-token";
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

/**
 * The "describe your topic" box. It sends the paragraph to /api/topics, which
 * turns it into topic words, searches every database, and groups what comes
 * back. Nothing here writes text: every paper is a real record.
 */
export function TopicPlanner() {
  const [description, setDescription] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<TopicResponse | null>(null);

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

  return (
    <>
      <form onSubmit={onSubmit} className="panel mt-6 space-y-3">
        <label htmlFor="topic-description" className="field-label">
          What is your thesis about?
        </label>
        <textarea
          id="topic-description"
          className="input min-h-[110px] resize-y"
          maxLength={500}
          placeholder="e.g. How small sari-sari store owners in Naval, Biliran keep track of stock, and what makes them adopt a digital record-keeping app"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs text-subtle">{description.length}/500 characters</p>
          <button type="submit" disabled={busy} className="btn-primary">
            {busy ? "Searching…" : "Find and group papers"}
          </button>
        </div>
      </form>

      {!data && !busy && (
        <div className="mt-4 flex flex-wrap items-center gap-2 text-sm text-muted">
          <span className="text-subtle">Try:</span>
          {EXAMPLES.map((example) => (
            <button
              key={example}
              type="button"
              className="chip-btn"
              onClick={() => setDescription(example)}
            >
              {example}
            </button>
          ))}
        </div>
      )}

      {error && (
        <p role="alert" className="notice notice-danger mt-4">
          {error}
        </p>
      )}

      {busy && (
        <p role="status" className="mt-6 text-sm text-muted">
          Searching 122 databases and grouping what comes back. This takes a few seconds.
        </p>
      )}

      {data && (
        <section className="mt-8" aria-label="Themes">
          <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-border pb-3">
            <p className="text-sm text-muted">
              Searched for <strong className="text-text">{data.query}</strong>
              {data.country ? ` · ${data.country}` : ""}
              {data.openAccessOnly ? " · free full text only" : ""}
            </p>
            <Link
              href={`/search?q=${encodeURIComponent(data.query)}`}
              className="text-sm text-accent underline"
            >
              Open in search ({data.total} papers)
            </Link>
          </div>

          {data.themes.length === 0 && (
            <p className="mt-6 text-muted">
              No papers matched that description. Try naming the topic more directly, or
              broader terms.
            </p>
          )}

          {data.themes.map((theme) => (
            <section key={theme.label} className="mt-8" aria-labelledby={`theme-${theme.label}`}>
              <h2 id={`theme-${theme.label}`} className="text-lg">
                {theme.label}
                <span className="ml-2 text-sm text-subtle">
                  {theme.papers.length} {theme.papers.length === 1 ? "paper" : "papers"}
                </span>
              </h2>
              <div className="mt-2 divide-y divide-border">
                {theme.papers.map(({ paper, why }) => (
                  <div key={paper.id}>
                    <PaperCard paper={paper} />
                    <p className="px-4 pb-3 text-xs text-subtle sm:px-5">{why}</p>
                  </div>
                ))}
              </div>
            </section>
          ))}
        </section>
      )}
    </>
  );
}
