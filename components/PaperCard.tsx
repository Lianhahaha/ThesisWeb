"use client";

import { useState } from "react";
import Link from "next/link";
import { FileText, ExternalLink, Quote, Check } from "lucide-react";
import type { Paper } from "@/lib/types";
import { truncate } from "@/lib/utils";
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
  const long = (summary?.length ?? 0) > 220;

  return (
    <article className="p-4 sm:p-5">
      <div className="flex items-start gap-3">
        {refNum != null && (
          <span className="mt-0.5 shrink-0 font-mono text-xs text-subtle">{refNum}</span>
        )}

        <div className="min-w-0 flex-1">
          <h3 className="text-[15px] font-semibold leading-snug">
            <Link href={`/paper/${encodeURIComponent(paper.id)}`} className="hover:underline">
              {paper.title}
            </Link>
          </h3>

          <p className="mt-1.5 text-sm text-muted">
            {paper.authors.length > 0 && (
              <>
                {paper.authors.slice(0, 3).join(", ")}
                {paper.authors.length > 3 && " et al."}
              </>
            )}
            {paper.year != null && <> · {paper.year}</>}
            {paper.venue && <> · <span className="italic">{paper.venue}</span></>}
          </p>

          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            {paper.retracted && (
              <span
                className="chip"
                style={{
                  color: "rgb(var(--danger))",
                  borderColor: "rgb(var(--danger) / 0.5)",
                  backgroundColor: "rgb(var(--danger-d))",
                  fontWeight: 600,
                }}
                title="This work has been retracted. Do not cite it as evidence."
              >
                Retracted
              </span>
            )}
            {paper.isOpenAccess && (
              <span
                className="chip"
                style={{
                  color: "rgb(var(--ok))",
                  borderColor: "rgb(var(--ok) / 0.4)",
                  backgroundColor: "rgb(var(--ok-d))",
                }}
              >
                <Check className="h-3 w-3" aria-hidden />
                Free full text
              </span>
            )}
            {(paper.citedByCount ?? 0) > 0 && (
              <span className="chip">Cited {paper.citedByCount!.toLocaleString()}</span>
            )}
            {showScore && paper.relevance != null && (
              <span className="chip" title="How closely the title and abstract match your words">
                Match {paper.relevance}
              </span>
            )}
          </div>

          {summary && (
            <p className={`mt-3 text-sm text-muted ${!expanded && long ? "line-clamp-2" : ""}`}>
              {paper.tldr && <span className="font-semibold text-text">TL;DR: </span>}
              {summary}
            </p>
          )}
          {long && (
            <button
              onClick={() => setExpanded((v) => !v)}
              className="mt-1 text-sm text-accent hover:underline"
            >
              {expanded ? "Show less" : "Show more"}
            </button>
          )}

          {paper.keywords && paper.keywords.length > 0 && (
            <ul className="mt-3 flex flex-wrap gap-1.5">
              {paper.keywords.slice(0, 4).map((k) => (
                <li key={k} className="chip">{k}</li>
              ))}
            </ul>
          )}

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <SaveButton paper={paper} />
            {paper.openAccessUrl && (
              <a
                href={paper.openAccessUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-secondary btn-sm"
              >
                <FileText className="h-3.5 w-3.5" aria-hidden />
                Free PDF
              </a>
            )}
            {paper.doi && (
              <a
                href={`https://doi.org/${paper.doi}`}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-ghost btn-sm"
              >
                <ExternalLink className="h-3.5 w-3.5" aria-hidden />
                DOI
              </a>
            )}
            <button
              onClick={() => {
                const snippet = truncate(
                  `${paper.title}. ${paper.authors[0] || ""} (${paper.year || "n.d."})`,
                  300
                );
                navigator.clipboard
                  .writeText(snippet)
                  .then(() => toast("Citation snippet copied", "success"))
                  .catch(() => toast("Could not copy. Select the text instead.", "error"));
              }}
              className="btn-ghost btn-sm"
            >
              <Quote className="h-3.5 w-3.5" aria-hidden />
              Copy
            </button>
          </div>
        </div>
      </div>
    </article>
  );
}
