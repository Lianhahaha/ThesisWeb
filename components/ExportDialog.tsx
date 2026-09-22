"use client";

import { useEffect, useRef, useState } from "react";
import { X, Download } from "lucide-react";
import type { SavedPaper } from "@/lib/types";
import {
  formatCitation,
  citationToText,
  inTextCitation,
  toBibtex,
  toRis,
  type CitationStyle,
} from "@/lib/citations";

const STYLES: { id: CitationStyle; label: string }[] = [
  { id: "apa", label: "APA 7" },
  { id: "mla", label: "MLA 9" },
  { id: "ieee", label: "IEEE" },
  { id: "chicago", label: "Chicago" },
];

export function ExportDialog({ papers, onClose }: { papers: SavedPaper[]; onClose: () => void }) {
  const [style, setStyle] = useState<CitationStyle>("apa");
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

  // Bibliographies are ordered by first-author surname. Names are stored
  // "Given Family", so compare the last word. Author-less papers sort last.
  const surname = (p: SavedPaper) => p.authors?.[0]?.trim().split(/\s+/).pop() || "";
  const sorted = [...papers].sort((a, b) => {
    const sa = surname(a);
    const sb = surname(b);
    if (!sa || !sb) return sa ? -1 : sb ? 1 : 0;
    return sa.localeCompare(sb, undefined, { sensitivity: "base" });
  });

  // formatCitation() returns HTML; this is shown in a <pre> and copied, so it
  // has to be plain text.
  const refList = sorted.map((p, i) => citationToText(formatCitation(p, style, i + 1))).join("\n\n");

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
    navigator.clipboard.writeText(text);
    setCopied(field);
    setTimeout(() => setCopied(null), 1500);
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-text/40 p-0 sm:items-center sm:p-4"
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
            {STYLES.map((s) => (
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

          <h3 className="mt-5 font-semibold">Download for a reference manager</h3>
          <div className="mt-2 flex flex-wrap gap-2">
            <button
              onClick={() =>
                download(sorted.map(toBibtex).join("\n\n"), "references.bib", "text/plain")
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
