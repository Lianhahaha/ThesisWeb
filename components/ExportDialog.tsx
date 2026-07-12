"use client";

import { useState } from "react";
import { X, Copy, Download, Check } from "lucide-react";
import type { SavedPaper } from "@/lib/types";
import {
  formatCitation,
  inTextCitation,
  toBibtex,
  toRis,
  type CitationStyle,
  type ExportFormat,
} from "@/lib/citations";
import { cn } from "@/lib/utils";

const STYLES: { id: CitationStyle; label: string }[] = [
  { id: "apa", label: "APA 7" },
  { id: "mla", label: "MLA 9" },
  { id: "ieee", label: "IEEE" },
  { id: "chicago", label: "Chicago" },
];

export function ExportDialog({ papers, onClose }: { papers: SavedPaper[]; onClose: () => void }) {
  const [style, setStyle] = useState<CitationStyle>("apa");
  const [copied, setCopied] = useState(false);

  // Sort saved papers by first-author surname for a cleaner bibliography.
  const sorted = [...papers].sort((a, b) =>
    (a.authors[0] || "").localeCompare(b.authors[0] || "")
  );

  const refList = sorted
    .map((p, i) => formatCitation(p, style, i + 1))
    .join("\n\n");

  const inTextList = sorted
    .map((p, i) => `${inTextCitation(p, style, i + 1)} — ${p.title.slice(0, 60)}…`)
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

  function copy(text: string) {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className="fixed inset-0 z-40 bg-black/50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="card w-full max-w-2xl max-h-[85vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex items-center justify-between p-4 border-b border-border">
          <h2 className="font-semibold">Export references</h2>
          <button onClick={onClose} className="btn-ghost !p-1.5">
            <X className="h-4 w-4" />
          </button>
        </header>

        <div className="p-4 overflow-y-auto">
          {/* Style tabs */}
          <div className="flex flex-wrap gap-1.5 mb-4">
            {STYLES.map((s) => (
              <button
                key={s.id}
                onClick={() => setStyle(s.id)}
                className={cn(
                  "badge border px-3 py-1",
                  style === s.id ? "bg-brand-600 text-white border-brand-600" : "bg-surface text-muted border-border"
                )}
              >
                {s.label}
              </button>
            ))}
          </div>

          {/* Reference list */}
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-medium">Reference list ({sorted.length})</h3>
            <button onClick={() => copy(refList)} className="btn-ghost !py-1 !text-xs">
              {copied ? <Check className="h-3.5 w-3.5 text-green-600" /> : <Copy className="h-3.5 w-3.5" />}
              {copied ? "Copied" : "Copy"}
            </button>
          </div>
          <pre className="card p-3 text-xs font-serif whitespace-pre-wrap break-words max-h-48 overflow-y-auto leading-relaxed">
            {refList}
          </pre>

          {/* In-text citations */}
          <h3 className="text-sm font-medium mt-4 mb-2">In-text citations</h3>
          <pre className="card p-3 text-xs whitespace-pre-wrap break-words max-h-32 overflow-y-auto">
            {inTextList}
          </pre>

          {/* Manager export */}
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              onClick={() => download(sorted.map(toBibtex).join("\n\n"), "references.bib", "text/plain")}
              className="btn-secondary !py-1.5 !text-xs"
            >
              <Download className="h-3.5 w-3.5" />
              BibTeX (.bib)
            </button>
            <button
              onClick={() => download(sorted.map(toRis).join("\n\n"), "references.ris", "application/x-research-info-systems")}
              className="btn-secondary !py-1.5 !text-xs"
            >
              <Download className="h-3.5 w-3.5" />
              RIS (Zotero/Mendeley)
            </button>
          </div>
          <p className="mt-3 text-xs text-muted">
            For a polished bibliography, import the .bib/.ris into Zotero or Mendeley and let it
            apply the exact style your school requires.
          </p>
        </div>
      </div>
    </div>
  );
}
