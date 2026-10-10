"use client";

import { useRef, useState } from "react";
import { Upload } from "lucide-react";
import { savePapers } from "@/lib/library/store";
import { MAX_IMPORT_BYTES, parseReferenceFile } from "@/lib/library/import";
import { toast } from "@/components/Toaster";

/**
 * Brings references from Zotero, Mendeley or EndNote into the library: the
 * student exports a .bib or .ris file there and picks it here. Papers already
 * in the library are merged, not duplicated (savePapers).
 */
export function ImportReferencesButton({
  existingIds,
  className = "btn-secondary",
}: {
  /** Ids already saved, to tell new papers from merged ones. */
  existingIds: ReadonlySet<string>;
  className?: string;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  async function onFile(file: File) {
    if (file.size > MAX_IMPORT_BYTES) {
      toast("That file is over 5 MB. Export only the collection you need.", "error");
      return;
    }
    setBusy(true);
    try {
      const papers = parseReferenceFile(await file.text());
      const already = papers.filter((p) => existingIds.has(p.id)).length;
      const written = await savePapers(papers);
      const skipped = papers.length - written;
      toast(
        [
          `Imported ${written} reference${written === 1 ? "" : "s"}`,
          already > 0 ? `${already} already saved, merged` : "",
          skipped > 0 ? `${skipped} could not be saved` : "",
        ]
          .filter(Boolean)
          .join(" · "),
        skipped > 0 ? "error" : "success"
      );
    } catch (e) {
      toast(e instanceof Error ? e.message : "Could not read that file.", "error");
    } finally {
      setBusy(false);
      if (input.current) input.current.value = "";
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => input.current?.click()}
        disabled={busy}
        className={className}
        title="Import a .bib or .ris file exported from Zotero, Mendeley or EndNote"
      >
        <Upload className="h-4 w-4" aria-hidden />
        {busy ? "Importing…" : "Import .bib / .ris"}
      </button>
      <input
        ref={input}
        type="file"
        accept=".bib,.ris,.txt,application/x-bibtex,application/x-research-info-systems,text/plain"
        className="hidden"
        aria-label="Reference file to import"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onFile(file);
        }}
      />
    </>
  );
}
