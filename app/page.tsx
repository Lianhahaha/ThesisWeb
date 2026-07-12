"use client";

import Link from "next/link";
import {
  Search, Sparkles, Library, ArrowRight, BookOpen,
  ShieldCheck, FileText, Database, Globe
} from "lucide-react";
import { useLiveQuery } from "dexie-react-hooks";
import { getDb } from "@/lib/db";

export default function DashboardPage() {
  const libraryCount = useLiveQuery(async () => {
    if (typeof window === "undefined") return 0;
    return getDb().papers.count();
  }, []);

  return (
    <div className="max-w-[860px] mx-auto">

      {/* Hero card */}
      <div
        className="rounded-lg p-5 sm:p-8 mb-5 border"
        style={{
          borderColor: "rgb(var(--border))",
          backgroundColor: "rgb(var(--surface2))",
        }}
      >
        <div className="flex flex-col sm:flex-row items-start gap-4">
          {/* Icon + title */}
          <div
            className="flex h-12 w-12 sm:h-14 sm:w-14 shrink-0 items-center justify-center rounded-lg"
            style={{
              backgroundColor: "rgba(56,139,253,0.1)",
              border: "1px solid rgba(56,139,253,0.3)",
            }}
          >
            <BookOpen className="h-6 w-6 sm:h-7 sm:w-7" style={{ color: "#388bfd" }} />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-lg sm:text-xl font-semibold" style={{ color: "rgb(var(--text))" }}>
                ThesisWeb
              </h1>
              <span
                className="rounded-full px-2 py-0.5 text-xs font-medium"
                style={{
                  color: "rgb(var(--muted))",
                  border: "1px solid rgb(var(--border))",
                  backgroundColor: "rgba(139,148,158,0.1)",
                }}
              >
                Free · Global
              </span>
            </div>
            <p className="mt-1 text-xs sm:text-sm" style={{ color: "rgb(var(--muted))" }}>
              Search 700M+ global academic papers across 10 databases, manage references, and pre-check your thesis for AI-likeness.
            </p>

            {/* CTA buttons */}
            <div className="mt-4 flex flex-wrap gap-2">
              <Link href="/search" className="btn-primary">
                <Search className="h-4 w-4" />
                Find RRLs
              </Link>
              <Link href="/ai-check" className="btn-secondary">
                <Sparkles className="h-4 w-4" />
                AI Self-Check
              </Link>
              <Link href="/library" className="btn-secondary">
                <Library className="h-4 w-4" />
                Library
                {libraryCount ? <span className="counter ml-1">{libraryCount}</span> : null}
              </Link>
            </div>
          </div>
        </div>

        {/* DB coverage — mobile-friendly chips */}
        <div
          className="mt-5 pt-4 flex flex-wrap items-center gap-2"
          style={{ borderTop: "1px solid rgb(var(--border))" }}
        >
          <Globe className="h-3.5 w-3.5 shrink-0" style={{ color: "rgb(var(--subtle))" }} />
          <span className="text-xs" style={{ color: "rgb(var(--subtle))" }}>Sources:</span>
          {["OpenAlex", "Crossref", "Semantic Scholar", "DOAJ", "Europe PMC", "PubMed", "arXiv", "CORE", "BASE", "Google Scholar"].map((db) => (
            <span
              key={db}
              className="rounded-full px-2.5 py-0.5 text-[11px] font-medium"
              style={{
                backgroundColor: "rgba(139,148,158,0.1)",
                color: "rgb(var(--muted))",
                border: "1px solid rgb(var(--border))",
              }}
            >
              {db}
            </span>
          ))}
        </div>
      </div>

      {/* Feature cards — 1 col mobile, 3 col sm+ */}
      <div className="grid gap-3 sm:grid-cols-3 mb-5">
        <FeatureCard
          icon={Search}
          title="Multi-source search"
          desc="OpenAlex, Crossref, Semantic Scholar, DOAJ, Europe PMC, PubMed, arXiv, CORE, BASE & Google Scholar — merged into one ranked list with 5-year recency."
          href="/search"
          count={null}
          label="Find RRLs"
        />
        <FeatureCard
          icon={Library}
          title="Reference manager"
          desc="Save papers, take notes, and export to APA, MLA, IEEE, BibTeX or RIS."
          href="/library"
          count={libraryCount ?? 0}
          label="Open library"
        />
        <FeatureCard
          icon={Sparkles}
          title="AI self-check"
          desc="Flag text that reads too uniform and get concrete rewrite suggestions to avoid false positives."
          href="/ai-check"
          count={null}
          label="Check writing"
        />
      </div>

      {/* README-style panel */}
      <div
        className="rounded-lg border p-4 sm:p-5"
        style={{ borderColor: "rgb(var(--border))", backgroundColor: "rgb(var(--surface))" }}
      >
        <div
          className="flex items-center gap-2 mb-4 pb-3 text-sm font-semibold"
          style={{ borderBottom: "1px solid rgb(var(--border))", color: "rgb(var(--text))" }}
        >
          <BookOpen className="h-4 w-4" style={{ color: "rgb(var(--muted))" }} />
          README.md
        </div>

        <div className="flex items-center gap-2 mb-3">
          <ShieldCheck className="h-4 w-4 shrink-0" style={{ color: "#3fb950" }} />
          <h2 className="text-sm font-semibold" style={{ color: "rgb(var(--text))" }}>
            Built for thesis struggles
          </h2>
        </div>

        <ul className="space-y-3">
          {[
            {
              icon: FileText,
              title: "Hard to find RRLs?",
              body: "Type your topic — we pull recent papers from 6 global databases, dedupe, and rank by relevance. Defaults to last 5 years.",
            },
            {
              icon: Database,
              title: "Paywalled papers?",
              body: "The \"Free PDF\" button checks Unpaywall, DOAJ and Europe PMC for a legal open-access copy before you give up.",
            },
            {
              icon: Sparkles,
              title: "Strict prof on AI detection?",
              body: "Paste a paragraph into the self-checker. It flags low burstiness, transition-word overuse, and stock openers — then tells you exactly what to fix.",
            },
          ].map(({ icon: Icon, title, body }) => (
            <li key={title} className="flex gap-3 text-xs sm:text-sm">
              <Icon className="h-4 w-4 mt-0.5 shrink-0" style={{ color: "#58a6ff" }} />
              <span style={{ color: "rgb(var(--muted))" }}>
                <strong style={{ color: "rgb(var(--text))" }}>{title} </strong>
                {body}
              </span>
            </li>
          ))}
        </ul>

        <p className="mt-5 text-xs" style={{ color: "rgb(var(--subtle))" }}>
          ThesisWeb uses only <strong>free, legal academic APIs</strong> and only links to{" "}
          <strong>open-access</strong> full text. The AI self-check is a{" "}
          <strong>writing coach, not a detection-evasion tool</strong>.
        </p>
      </div>
    </div>
  );
}

function FeatureCard({
  icon: Icon, title, desc, href, count, label,
}: {
  icon: React.ElementType;
  title: string;
  desc: string;
  href: string;
  count: number | null;
  label: string;
}) {
  return (
    <Link
      href={href}
      className="group flex flex-col rounded-lg border p-4 transition-colors"
      style={{ borderColor: "rgb(var(--border))", backgroundColor: "rgb(var(--surface))" }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLElement).style.borderColor = "#58a6ff";
        (e.currentTarget as HTMLElement).style.backgroundColor = "rgb(var(--surface2))";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLElement).style.borderColor = "rgb(var(--border))";
        (e.currentTarget as HTMLElement).style.backgroundColor = "rgb(var(--surface))";
      }}
    >
      <div className="flex items-center gap-2 mb-2">
        <Icon className="h-4 w-4 shrink-0" style={{ color: "#58a6ff" }} />
        <span className="text-sm font-semibold" style={{ color: "rgb(var(--text))" }}>
          {title}
        </span>
        {count != null && count > 0 && (
          <span className="counter ml-auto">{count}</span>
        )}
      </div>
      <p className="text-xs leading-relaxed flex-1" style={{ color: "rgb(var(--muted))" }}>
        {desc}
      </p>
      <div
        className="mt-3 flex items-center gap-1 text-xs font-medium"
        style={{ color: "#58a6ff" }}
      >
        {label}
        <ArrowRight className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>
    </Link>
  );
}
