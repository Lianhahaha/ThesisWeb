"use client";

import { useEffect, useRef, useState } from "react";
import { X, Download, FileText } from "lucide-react";
import type { SavedPaper } from "@/lib/types";
import { groupReferences, sortBySurname } from "@/lib/library/reference-list";
import type { Scope } from "@/lib/library/scope";
import { referenceListRtf } from "@/lib/library/rtf";
import {
  formatCitation,
  citationToText,
  inTextCitation,
  toBibtexList,
  toRis,
  CITATION_STYLES,
  type CitationStyle,
} from "@/lib/citations";
import { getPreferences } from "@/lib/preferences";
import { toast } from "@/components/Toaster";

export function ExportDialog({
  papers,
  onClose,
  scopeOf,
}: {
  papers: SavedPaper[];
  onClose: () => void;
  /** When given, the list can be split into Local and Foreign. */
  scopeOf?: (p: SavedPaper) => Scope;
}) {
  const [style, setStyle] = useState<CitationStyle>(() => getPreferences().citationStyle);
  const [byScope, setByScope] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    closeRef.current?.focus();
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const sorted = sortBySurname(papers);
  const groups = groupReferences(papers, byScope ? scopeOf : undefined);

  // formatCitation() returns HTML; this is shown in a <pre> and copied, so it
  // has to be plain text. IEEE numbers run on across the groups.
  let n = 0;
  const formatted = groups.map((g) => ({ heading: g.heading, entries: g.papers.map((p) => formatCitation(p, style, ++n)) }));
  const refList = formatted
    .map((g) => {
      const entries = g.entries.map(citationToText).join("\n\n");
      return g.heading ? `${g.heading}\n\n${entries}` : entries;
    })
    .join("\n\n\n");

  // Word and Google Docs lose hanging indents and italics on paste; an .rtf keeps them.
  function downloadForWord() {
    const rtf = referenceListRtf(formatted, { single: style === "ieee" });
    download(rtf, `references-${style}.rtf`, "application/rtf");
  }

  const inTextList = sorted
    .map(
      (p, i) =>
        `${inTextCitation(p, style, i + 1)} — ${
          p.title.length > 60 ? `${p.title.slice(0, 60)}…` : p.title
        }`
    )
    .join("\n");

  function download(content: string, filename: string, mime: string) {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  function copy(text: string, field: string) {
    // Only say "Copied" once it really was: the clipboard can be blocked
    // (insecure context, permissions, some in-app browsers).
    navigator.clipboard
      .writeText(text)
      .then(() => {
        setCopied(field);
        setTimeout(() => setCopied(null), 1500);
      })
      .catch(() => toast("Could not copy. Select the text instead.", "error"));
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="export-title"
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[92vh] w-full max-w-2xl flex-col rounded-t-2xl border border-border bg-surface sm:rounded-2xl"
      >
        <header className="flex items-center justify-between border-b border-border p-4">
          <h2 id="export-title" className="text-lg">Export references</h2>
          <button ref={closeRef} onClick={onClose} className="btn-ghost btn-sm !px-2" aria-label="Close">
            <X className="h-4 w-4" aria-hidden />
          </button>
        </header>

        <div className="overflow-y-auto p-4">
          <div className="seg" role="group" aria-label="Citation style">
            {CITATION_STYLES.map((s) => (
              <button
                key={s.id}
                type="button"
                data-on={style === s.id}
                onClick={() => setStyle(s.id)}
              >
                {s.label}
              </button>
            ))}
          </div>

          {scopeOf && (
            <label className="mt-4 flex cursor-pointer items-center gap-2 text-sm text-muted">
              <input
                type="checkbox"
                checked={byScope}
                onChange={(e) => setByScope(e.target.checked)}
                className="h-4 w-4 rounded"
                style={{ accentColor: "rgb(var(--accent))" }}
              />
              Split into Local and Foreign
            </label>
          )}

          <div className="mt-5 flex items-center justify-between gap-2">
            <h3 className="font-semibold">Reference list ({sorted.length})</h3>
            <button onClick={() => copy(refList, "refs")} className="btn-secondary btn-sm">
              {copied === "refs" ? "Copied" : "Copy"}
            </button>
          </div>
          <pre className="mt-2 max-h-56 overflow-y-auto whitespace-pre-wrap break-words rounded-lg border border-border bg-surface2 p-3 serif text-[15px] leading-relaxed">
            {refList}
          </pre>

          <div className="mt-5 flex items-center justify-between gap-2">
            <h3 className="font-semibold">In-text citations</h3>
            <button onClick={() => copy(inTextList, "intext")} className="btn-secondary btn-sm">
              {copied === "intext" ? "Copied" : "Copy"}
            </button>
          </div>
          <pre className="mt-2 max-h-40 overflow-y-auto whitespace-pre-wrap break-words rounded-lg border border-border bg-surface2 p-3 text-sm">
            {inTextList}
          </pre>

          <h3 className="mt-5 font-semibold">Download for Word or Google Docs</h3>
          <div className="mt-2 flex flex-wrap gap-2">
            <button onClick={downloadForWord} className="btn-secondary btn-sm">
              <FileText className="h-3.5 w-3.5" aria-hidden />
              Reference list (.rtf)
            </button>
          </div>
          <p className="field-hint">
            Opens in Word, Google Docs and LibreOffice with hanging indents, italics and{" "}
            {style === "ieee" ? "single" : "double"} spacing already set.
          </p>

          <h3 className="mt-5 font-semibold">Download for a reference manager</h3>
          <div className="mt-2 flex flex-wrap gap-2">
            <button
              onClick={() =>
                download(toBibtexList(sorted), "references.bib", "text/plain")
              }
              className="btn-secondary btn-sm"
            >
              <Download className="h-3.5 w-3.5" aria-hidden />
              BibTeX (.bib)
            </button>
            <button
              onClick={() =>
                download(
                  sorted.map(toRis).join("\n\n"),
                  "references.ris",
                  "application/x-research-info-systems"
                )
              }
              className="btn-secondary btn-sm"
            >
              <Download className="h-3.5 w-3.5" aria-hidden />
              RIS (Zotero, Mendeley)
            </button>
          </div>
          <p className="field-hint">
            These formatters are simplified. For a graded bibliography, import the .bib or .ris into
            Zotero or Mendeley and apply the exact style your school requires.
          </p>
        </div>
      </div>
    </div>
  );
}
