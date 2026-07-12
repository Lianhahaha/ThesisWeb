"use client";

import { FileText, ExternalLink, Quote, Calendar, Users, CircleDot } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import type { Paper } from "@/lib/types";
import { cn, truncate } from "@/lib/utils";
import { SaveButton } from "@/components/SaveButton";
import { toast } from "@/components/Toaster";

interface Props {
  paper: Paper;
  showScore?: boolean;
  refNum?: number;
}

export function PaperCard({ paper, showScore, refNum }: Props) {
  const [expanded, setExpanded] = useState(false);
  const summary = paper.tldr || paper.abstract;

  const relColor =
    (paper.relevance ?? 0) >= 70 ? { text: "#3fb950", bg: "rgba(63,185,80,0.1)", border: "rgba(63,185,80,0.3)" }
    : (paper.relevance ?? 0) >= 45 ? { text: "#d29922", bg: "rgba(210,153,34,0.1)", border: "rgba(210,153,34,0.3)" }
    : { text: "rgb(var(--muted))", bg: "rgba(139,148,158,0.08)", border: "rgba(139,148,158,0.2)" };

  return (
    <article
      className="flex gap-3 px-3 sm:px-4 py-3 transition-colors cursor-default"
      style={{ borderBottom: "1px solid rgb(var(--border))" }}
      onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = "rgb(var(--surface2))"; }}
      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = ""; }}
    >
      {/* OA status */}
      <div className="shrink-0 pt-0.5" title={paper.isOpenAccess ? "Open Access" : "Restricted"}>
        <CircleDot
          className="h-4 w-4"
          style={{ color: paper.isOpenAccess ? "#3fb950" : "rgb(var(--border2))" }}
        />
      </div>

      <div className="flex-1 min-w-0">
        {/* Title + score */}
        <div className="flex items-start gap-2">
          <Link
            href={`/paper/${encodeURIComponent(paper.id)}`}
            className="flex-1 min-w-0 text-sm font-semibold leading-snug hover:underline"
            style={{ color: "rgb(var(--text))" }}
          >
            {paper.title}
          </Link>
          {showScore && paper.relevance != null && (
            <span
              className="shrink-0 text-xs font-mono font-bold px-1.5 py-0.5 rounded"
              style={{ color: relColor.text, backgroundColor: relColor.bg, border: `1px solid ${relColor.border}` }}
            >
              {paper.relevance}
            </span>
          )}
        </div>

        {/* Meta */}
        <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs" style={{ color: "rgb(var(--muted))" }}>
          {refNum != null && <span className="font-mono" style={{ color: "rgb(var(--subtle))" }}>#{refNum}</span>}
          {paper.year && (
            <span className="inline-flex items-center gap-1">
              <Calendar className="h-3 w-3" />{paper.year}
            </span>
          )}
          {paper.authors.length > 0 && (
            <span className="inline-flex items-center gap-1 min-w-0">
              <Users className="h-3 w-3 shrink-0" />
              <span className="truncate max-w-[140px] sm:max-w-[260px]">
                {paper.authors.slice(0, 2).join(", ")}{paper.authors.length > 2 ? " et al." : ""}
              </span>
            </span>
          )}
          {paper.venue && <span className="italic truncate max-w-[120px] sm:max-w-[200px]">{paper.venue}</span>}
          {(paper.citedByCount ?? 0) > 0 && <span>· Cited {paper.citedByCount}</span>}
        </div>

        {/* Abstract */}
        {summary && (
          <p className={cn("mt-1.5 text-xs leading-relaxed", !expanded && "line-clamp-2")} style={{ color: "rgb(var(--muted))" }}>
            {paper.tldr && <span className="font-semibold" style={{ color: "rgb(var(--text))" }}>TL;DR: </span>}
            {summary}
          </p>
        )}
        {summary && summary.length > 200 && (
          <button
            onClick={() => setExpanded(e => !e)}
            className="mt-0.5 text-xs hover:underline"
            style={{ color: "rgb(var(--accent))" }}
          >
            {expanded ? "Show less" : "Show more"}
          </button>
        )}

        {/* Keywords */}
        {paper.keywords && paper.keywords.length > 0 && (
          <div className="mt-1.5 flex flex-wrap gap-1">
            {paper.keywords.slice(0, 4).map((k) => (
              <span key={k} className="rounded-full px-2 py-0.5 text-[11px]" style={{
                backgroundColor: "rgb(var(--surface2))",
                color: "rgb(var(--muted))",
                border: "1px solid rgb(var(--border))",
              }}>
                {k}
              </span>
            ))}
          </div>
        )}

        {/* Actions */}
        <div className="mt-2 flex flex-wrap items-center gap-1">
          <SaveButton paper={paper} />
          {paper.openAccessUrl && (
            <a href={paper.openAccessUrl} target="_blank" rel="noopener noreferrer"
              className="btn-secondary !py-1 !px-2 !text-xs"
              onClick={() => toast("Opening open-access PDF…", "info")}
            >
              <FileText className="h-3.5 w-3.5" />
              <span className="hidden xs:inline">Free PDF</span>
              <span className="xs:hidden">PDF</span>
            </a>
          )}
          {paper.doi && (
            <a href={`https://doi.org/${paper.doi}`} target="_blank" rel="noopener noreferrer" className="btn-ghost !py-1 !px-2 !text-xs">
              <ExternalLink className="h-3.5 w-3.5" />DOI
            </a>
          )}
          <button
            onClick={() => {
              navigator.clipboard.writeText(truncate(paper.title + ". " + (paper.authors[0] || "") + ` (${paper.year || "n.d."})`, 300));
              toast("Citation snippet copied", "success");
            }}
            className="btn-ghost !py-1 !px-2 !text-xs"
          >
            <Quote className="h-3.5 w-3.5" />Copy
          </button>
        </div>
      </div>
    </article>
  );
}
