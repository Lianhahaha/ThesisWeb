"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Download } from "lucide-react";
import { SaveButton } from "@/components/SaveButton";
import { toast } from "@/components/Toaster";
import {
  formatCitation,
  citationToText,
  inTextCitation,
  toBibtex,
  toRis,
  type CitationStyle,
} from "@/lib/citations";
import { mergeRecentPapers } from "@/lib/recent-papers";
import type { Paper } from "@/lib/types";
import type { CiteResult } from "@/app/api/cite/route";

const STYLES: { id: CitationStyle; label: string }[] = [
  { id: "apa", label: "APA 7" },
  { id: "mla", label: "MLA 9" },
  { id: "ieee", label: "IEEE" },
  { id: "chicago", label: "Chicago" },
];

const EXAMPLE = "10.1038/nature12373\nhttps://doi.org/10.1016/j.compedu.2019.103778";

function download(content: string, filename: string, mime: string) {
  const url = URL.createObjectURL(new Blob([content], { type: mime }));
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function copy(text: string, label: string) {
  navigator.clipboard
    .writeText(text)
    .then(() => toast(`${label} copied`, "success"))
    .catch(() => toast("Could not copy. Select the text instead.", "error"));
}

export default function CitePage() {
  const [text, setText] = useState("");
  const [style, setStyle] = useState<CitationStyle>("apa");

  const lookup = useMutation({
    mutationFn: async (items: string[]) => {
      const res = await fetch("/api/cite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || "Lookup failed");
      return body.results as CiteResult[];
    },
    onSuccess: (results) => {
      const found = results.filter((r) => r.paper).map((r) => r.paper as Paper);
      // Lets "open" links and the paper page find these records.
      mergeRecentPapers(found);
      const missed = results.length - found.length;
      toast(
        missed ? `${found.length} found, ${missed} not found` : `${found.length} citation${found.length === 1 ? "" : "s"} ready`,
        missed ? "info" : "success"
      );
    },
    onError: (e: Error) => toast(e.message, "error"),
  });

  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
  const results = lookup.data ?? [];
  const papers = results.filter((r) => r.paper).map((r) => r.paper as Paper);

  const referenceList = papers
    .map((p, i) => citationToText(formatCitation(p, style, i + 1)))
    .join("\n\n");

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (lines.length > 0 && !lookup.isPending) lookup.mutate(lines);
  }

  return (
    <div className="mx-auto max-w-3xl">
      <header className="mb-5">
        <p className="eyebrow">Citation generator</p>
        <h1 className="display mt-2 text-3xl sm:text-4xl">
          Cite <em>fast</em>
        </h1>
        <p className="mt-2 text-muted">
          Paste DOIs, get references in APA, MLA, IEEE or Chicago. Save any of them to your library.
        </p>
      </header>

      <form onSubmit={onSubmit} className="panel">
        <label htmlFor="dois" className="field-label">DOIs or DOI links, one per line</label>
        <textarea
          id="dois"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={EXAMPLE}
          rows={5}
          className="input mono resize-y"
          spellCheck={false}
        />
        <p className="field-hint">
          A DOI looks like <code>10.xxxx/…</code>{" "}and is printed on the first page of most papers.
          Up to 25 at a time.
        </p>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <div className="seg" role="group" aria-label="Citation style">
            {STYLES.map((s) => (
              <button key={s.id} type="button" data-on={style === s.id} onClick={() => setStyle(s.id)}>
                {s.label}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            {!text && (
              <button type="button" onClick={() => setText(EXAMPLE)} className="btn-ghost btn-sm">
                Use an example
              </button>
            )}
            <button type="submit" disabled={lines.length === 0 || lookup.isPending} className="btn-primary">
              {lookup.isPending ? "Looking up…" : "Generate"}
            </button>
          </div>
        </div>
      </form>

      {results.length > 0 && !lookup.isPending && (
        <section className="mt-6" aria-labelledby="refs-h">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-3">
            <h2 id="refs-h" className="text-xl">
              {papers.length} {papers.length === 1 ? "reference" : "references"}
            </h2>
            {papers.length > 0 && (
              <div className="flex flex-wrap gap-2">
                <button onClick={() => copy(referenceList, "Reference list")} className="btn-secondary btn-sm">
                  Copy all
                </button>
                <button
                  onClick={() => download(papers.map(toBibtex).join("\n\n"), "references.bib", "text/plain")}
                  className="btn-ghost btn-sm"
                >
                  <Download className="h-3.5 w-3.5" aria-hidden /> .bib
                </button>
                <button
                  onClick={() =>
                    download(papers.map(toRis).join("\n\n"), "references.ris", "application/x-research-info-systems")
                  }
                  className="btn-ghost btn-sm"
                >
                  <Download className="h-3.5 w-3.5" aria-hidden /> .ris
                </button>
              </div>
            )}
          </div>

          <ol className="mt-4 space-y-3">
            {results.map((r, i) => {
              if (!r.paper) {
                return (
                  <li key={`${r.input}-${i}`} className="notice notice-danger">
                    <span className="mono break-all">{r.input}</span> — {r.error}
                  </li>
                );
              }
              const n = papers.indexOf(r.paper) + 1;
              return (
                <li key={r.paper.id} className="panel">
                  <p
                    className="prose-serif"
                    dangerouslySetInnerHTML={{ __html: formatCitation(r.paper, style, n) }}
                  />
                  <p className="mt-2 text-sm text-muted">
                    In text: <code>{inTextCitation(r.paper, style, n)}</code>
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2 border-t border-border pt-3">
                    <button
                      onClick={() => copy(citationToText(formatCitation(r.paper!, style, n)), "Citation")}
                      className="btn-secondary btn-sm"
                    >
                      Copy
                    </button>
                    <SaveButton paper={r.paper} />
                  </div>
                </li>
              );
            })}
          </ol>
          <p className="field-hint">
            Formatted from publisher records. Check capitalisation and italics against your school&apos;s
            style guide before you submit.
          </p>
        </section>
      )}
    </div>
  );
}
