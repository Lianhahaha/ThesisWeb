"use client";

import { use, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Download, LibraryBig } from "lucide-react";
import { PaperCard } from "@/components/PaperCard";
import { ExportDialog } from "@/components/ExportDialog";
import { toast } from "@/components/Toaster";
import { getShare } from "@/lib/library/share";
import { fromShared, type SharedLibrary } from "@/lib/library/shared-copy";
import { savePapers } from "@/lib/library/store";
import { mergeRecentPapers } from "@/lib/search/recent-papers";
import { useAuth } from "@/lib/auth/store";
import { MATRIX_KEYS } from "@/lib/types";

const MATRIX_LABELS: Record<(typeof MATRIX_KEYS)[number], string> = {
  method: "Method",
  findings: "Findings",
  limitations: "Limitations",
  relevanceToTopic: "Relevance",
};

/** A group library opened from a share link. Anyone with the link can read it. */
export default function SharedLibraryPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { user, initialized } = useAuth();
  const [share, setShare] = useState<SharedLibrary | null | undefined>(undefined);
  const [failed, setFailed] = useState(false);
  const [copying, setCopying] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);

  useEffect(() => {
    getShare(id).then(setShare, () => setFailed(true));
  }, [id]);

  // Library-shaped records: for the paper pages, export and "Copy to my library".
  const papers = useMemo(() => (share ? fromShared(share) : []), [share]);
  useEffect(() => {
    if (papers.length) mergeRecentPapers(papers);
  }, [papers]);

  async function copyAll() {
    if (!share) return;
    setCopying(true);
    try {
      const n = await savePapers(papers);
      toast(`Copied ${n} papers into your library, in the collection “${share.name.slice(0, 100)}”`, "success");
    } catch {
      toast("Could not copy the papers. Try again.", "error");
    } finally {
      setCopying(false);
    }
  }

  if (failed) {
    return (
      <div className="panel mx-auto max-w-xl py-14 text-center">
        <h1 className="text-xl">Could not open this shared library</h1>
        <p className="mx-auto mt-2 max-w-md text-sm text-muted">Check your connection and reload the page.</p>
      </div>
    );
  }
  if (share === undefined) {
    return <p role="status" className="py-20 text-center text-muted">Loading shared library…</p>;
  }
  if (share === null) {
    return (
      <div className="panel mx-auto max-w-xl py-14 text-center">
        <h1 className="text-xl">This link no longer works</h1>
        <p className="mx-auto mt-2 max-w-md text-sm text-muted">
          The person who shared it may have stopped sharing. Ask them for a new link.
        </p>
        <Link href="/search" className="btn-primary mt-6">Search for papers</Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <p className="eyebrow">Shared library</p>
          <h1 className="display mt-3 break-words text-3xl sm:text-4xl">{share.name}</h1>
          <p className="mt-2 text-muted">
            {papers.length} papers · shared by {share.ownerName} · updated{" "}
            {new Date(share.updatedAt).toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" })}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={() => setExportOpen(true)} disabled={papers.length === 0} className="btn-secondary">
            <Download className="h-4 w-4" aria-hidden />
            Export references
          </button>
          <button onClick={copyAll} disabled={copying || !initialized || papers.length === 0} className="btn-primary">
            <LibraryBig className="h-4 w-4" aria-hidden />
            {copying ? "Copying…" : "Copy all to my library"}
          </button>
        </div>
      </header>

      {initialized && !user && (
        <p className="notice notice-info mb-4">
          Copied papers are kept in this browser.{" "}
          <Link href="/login" className="text-accent underline">Sign in</Link> first to keep them in your account.
        </p>
      )}

      <ul className="space-y-3">
        {papers.map((p) => (
          <li key={p.id} className="card">
            <PaperCard paper={p} />
            {(p.notes || p.matrix) && (
              <div className="space-y-2 border-t border-border px-4 py-3 text-sm sm:px-5">
                {p.notes && (
                  <p className="whitespace-pre-wrap text-muted">
                    <span className="font-semibold text-text">Notes: </span>
                    {p.notes}
                  </p>
                )}
                {p.matrix && (
                  <dl className="grid gap-x-4 gap-y-1 sm:grid-cols-2">
                    {MATRIX_KEYS.filter((k) => p.matrix?.[k]).map((k) => (
                      <div key={k}>
                        <dt className="text-xs font-semibold text-subtle">{MATRIX_LABELS[k]}</dt>
                        <dd className="text-muted">{p.matrix?.[k]}</dd>
                      </div>
                    ))}
                  </dl>
                )}
              </div>
            )}
          </li>
        ))}
      </ul>

      {exportOpen && <ExportDialog papers={papers} onClose={() => setExportOpen(false)} />}
    </div>
  );
}
