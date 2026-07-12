"use client";

import { use, useState, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import {
  ArrowLeft,
  FileText,
  ExternalLink,
  Quote,
  Loader2,
  Users,
  Calendar,
  Building2,
  Bookmark,
  BookmarkCheck,
  Download,
  Wand2,
  AlertCircle,
} from "lucide-react";
import Link from "next/link";
import { useLiveQuery } from "dexie-react-hooks";
import { getDb, savePaper, unsavePaper, updatePaper, isSaved as checkSaved } from "@/lib/db";
import { getRecentPaper } from "@/lib/recent-papers";
import { formatCitation, inTextCitation, toBibtex, type CitationStyle } from "@/lib/citations";
import { toast } from "@/components/Toaster";
import type { Paper, SavedPaper } from "@/lib/types";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth-store";

const STYLES: { id: CitationStyle; label: string }[] = [
  { id: "apa", label: "APA" },
  { id: "mla", label: "MLA" },
  { id: "ieee", label: "IEEE" },
  { id: "chicago", label: "Chicago" },
];

export default function PaperDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const decodedId = decodeURIComponent(id);

  const { user } = useAuth();

  // IndexedDB live query (for logged-out users)
  const savedLocal = useLiveQuery(
    async () => {
      if (typeof window === "undefined") return undefined;
      return getDb().papers.get(decodedId);
    },
    [decodedId],
    undefined
  );

  // Firestore saved state (for logged-in users)
  const [cloudSaved, setCloudSaved] = useState<boolean | null>(null);
  const [cloudSavedData, setCloudSavedData] = useState<SavedPaper | null>(null);

  useEffect(() => {
    if (!user) { setCloudSaved(null); setCloudSavedData(null); return; }
    checkSaved(decodedId).then(s => setCloudSaved(s));
  }, [user, decodedId]);

  // Merge saved state: prefer Firestore when logged in
  const saved = user ? (cloudSaved === true ? (cloudSavedData ?? true) : cloudSaved === false ? null : undefined) : savedLocal;

  // Check sessionStorage (search results the user just clicked).
  const [recent, setRecent] = useState<Paper | null>(null);
  useEffect(() => {
    const found = getRecentPaper(decodedId);
    if (found) setRecent(found);
  }, [decodedId]);

  const paper: Paper | null = (saved && typeof saved === "object" ? saved : null) ?? recent;
  const isSaved = saved !== undefined && saved !== null;
  const isSavedData = isSaved && typeof saved === "object" ? (saved as SavedPaper) : null;

  const [style, setStyle] = useState<CitationStyle>("apa");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (isSavedData?.notes) setNotes(isSavedData.notes);
  }, [isSavedData?.notes]);

  // --- Loading state: only show spinner while IndexedDB is still booting ---
  // and we don't have a recent copy either.
  const dbLoading = saved === undefined;
  const noRecent = recent === null;
  const dbMissing = saved === null;

  // --- Find PDF via Unpaywall ---
  const findPdf = useMutation({
    mutationFn: async (doi: string) => {
      const res = await fetch(`/api/pdf?doi=${encodeURIComponent(doi)}`);
      if (!res.ok) throw new Error("Lookup failed");
      return res.json();
    },
    onSuccess: (data) => {
      if (data.found && data.url) {
        toast(
          `Found ${data.kind === "pdf" ? "a PDF" : "a landing page"} (${data.status || "OA"})`,
          "success"
        );
        if (isSavedData) updatePaper(decodedId, { openAccessUrl: data.url, isOpenAccess: true });
      } else {
        toast("No legal open-access copy found for this DOI.", "error");
      }
    },
    onError: () => toast("PDF lookup failed — try again.", "error"),
  });

  // --- Extractive summarizer ---
  const summarize = useMutation({
    mutationFn: async (text: string) => {
      const res = await fetch("/api/summarize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, sentences: 3 }),
      });
      if (!res.ok) throw new Error("Summarize failed");
      return res.json();
    },
    onError: () => toast("Summarize failed", "error"),
  });

  if (dbLoading && noRecent) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-5 w-5 animate-spin text-muted" />
      </div>
    );
  }

  if (!dbLoading && dbMissing && noRecent) {
    return (
      <div className="mx-auto max-w-2xl px-6 py-16 text-center">
        <AlertCircle className="h-10 w-10 text-muted mx-auto opacity-50" />
        <p className="mt-3 font-medium">Paper not found</p>
        <p className="text-sm text-muted mt-1">
          This paper isn&apos;t saved in your library and isn&apos;t in your recent search
          results. Search for it and open its details from there.
        </p>
        <Link href="/search" className="btn-primary mt-4 inline-flex">
          Go to search
        </Link>
      </div>
    );
  }

  if (!paper) return null; // should not happen, but guard



  // Helper to safely promote a Paper (with optional fields) to a SavedPaper
  // (with required fields). The search-result sources always populate these,
  // so defaults are just a safety net.
  function toSaved(paper_: Paper, overrides?: Partial<SavedPaper>): SavedPaper {
    return {
      ...paper_,
      id: paper_.id || decodedId,
      title: paper_.title || "Untitled",
      authors: paper_.authors || [],
      year: paper_.year ?? null,
      sources: paper_.sources || [],
      savedAt: Date.now(),
      tags: [],
      readingStatus: "to-read",
      ...overrides,
    };
  }

  async function toggleSave() {
    if (isSavedData) {
      await unsavePaper(decodedId);
      setCloudSaved(false);
      setCloudSavedData(null);
      toast("Removed from library", "info");
    } else if (paper) {
      const sp = toSaved(paper);
      await savePaper(sp);
      setCloudSaved(true);
      setCloudSavedData(sp);
      toast("Saved to library ✓", "success");
    }
  }

  async function saveNotes() {
    if (!isSavedData && paper) {
      await savePaper(toSaved(paper, { notes }));
    } else {
      await updatePaper(decodedId, { notes });
    }
    toast("Notes saved", "success");
  }

  const p: Paper = isSavedData ?? paper;

  return (
    <div className="mx-auto max-w-3xl px-6 py-8 pb-24 sm:pb-8">
      <Link href="/search" className="btn-ghost !px-2 mb-4 inline-flex items-center gap-1">
        <ArrowLeft className="h-4 w-4" />
        Back to search
      </Link>

      {/* Title + meta */}
      <h1 className="text-2xl font-bold leading-snug">{p.title}</h1>
      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted">
        {p.authors.length > 0 && (
          <span className="inline-flex items-center gap-1">
            <Users className="h-3.5 w-3.5" />
            {p.authors.join(", ")}
          </span>
        )}
        {p.year && (
          <span className="inline-flex items-center gap-1">
            <Calendar className="h-3.5 w-3.5" />
            {p.year}
          </span>
        )}
        {p.venue && (
          <span className="inline-flex items-center gap-1 italic">
            <Building2 className="h-3.5 w-3.5" />
            {p.venue}
          </span>
        )}
      </div>

      {/* Action row */}
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <button
          onClick={toggleSave}
          className={cn(isSavedData ? "btn-secondary" : "btn-primary")}
        >
          {isSavedData ? (
            <BookmarkCheck className="h-4 w-4" />
          ) : (
            <Bookmark className="h-4 w-4" />
          )}
          {isSavedData ? "In library" : "Save to library"}
        </button>

        {p.openAccessUrl ? (
          <a
            href={p.openAccessUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-secondary"
          >
            <FileText className="h-4 w-4" />
            Open PDF
          </a>
        ) : p.doi ? (
          <button
            onClick={() => findPdf.mutate(p.doi!)}
            disabled={findPdf.isPending}
            className="btn-secondary"
          >
            {findPdf.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Download className="h-4 w-4" />
            )}
            Find free PDF
          </button>
        ) : null}

        {p.doi && (
          <a
            href={`https://doi.org/${p.doi}`}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-ghost"
          >
            <ExternalLink className="h-4 w-4" />
            DOI
          </a>
        )}
      </div>

      {/* TLDR / abstract */}
      {(p.tldr || p.abstract) && (
        <section className="mt-6">
          <h2 className="text-sm font-semibold mb-2">{p.tldr ? "TL;DR" : "Abstract"}</h2>
          <p className="card p-4 text-sm leading-relaxed text-text font-serif">
            {p.tldr || p.abstract}
          </p>
          {p.abstract && p.abstract.length > 400 && (
            <button
              onClick={() => summarize.mutate(p.abstract!)}
              disabled={summarize.isPending}
              className="btn-ghost !py-1.5 !text-xs mt-2"
            >
              {summarize.isPending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Wand2 className="h-3.5 w-3.5" />
              )}
              {summarize.isPending ? "Summarizing…" : "Extract key points"}
            </button>
          )}
          {summarize.data && (
            <div className="card p-3 mt-2 text-xs bg-brand-50/50 dark:bg-brand-950/30 border-brand-200 dark:border-brand-900">
              <strong className="text-brand-700 dark:text-brand-300">Key points: </strong>
              {summarize.data.text}
            </div>
          )}
        </section>
      )}

      {/* Citation */}
      <section className="mt-6">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-sm font-semibold">Citation</h2>
          <div className="flex gap-1">
            {STYLES.map((s) => (
              <button
                key={s.id}
                onClick={() => setStyle(s.id)}
                className={cn(
                  "badge border px-2 py-0.5 cursor-pointer",
                  style === s.id
                    ? "bg-brand-600 text-white border-brand-600"
                    : "bg-surface text-muted border-border"
                )}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>
        <div className="card p-3 font-serif text-sm leading-relaxed">
          <p dangerouslySetInnerHTML={{ __html: formatCitation(p, style, 1) }} />
          <p className="mt-2 pt-2 border-t border-border text-xs text-muted">
            In-text: <code className="font-mono">{inTextCitation(p, style, 1)}</code>
          </p>
        </div>
        <div className="mt-2 flex gap-2">
          <button
            onClick={() => {
              navigator.clipboard.writeText(toBibtex(p));
              toast("BibTeX copied", "success");
            }}
            className="btn-ghost !py-1.5 !text-xs"
          >
            <Quote className="h-3.5 w-3.5" />
            Copy BibTeX
          </button>
        </div>
      </section>

      {/* Notes */}
      <section className="mt-6">
        <h2 className="text-sm font-semibold mb-2">My notes</h2>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Jot down why this paper matters to your thesis, key quotes with page numbers, etc."
          rows={5}
          className="input resize-y text-sm font-serif"
        />
        <button
          onClick={saveNotes}
          disabled={notes === (isSavedData?.notes || "")}
          className="btn-secondary mt-2 !text-xs"
        >
          Save notes
        </button>
      </section>

      {/* Keywords */}
      {p.keywords && p.keywords.length > 0 && (
        <section className="mt-6">
          <h2 className="text-sm font-semibold mb-2">Keywords</h2>
          <div className="flex flex-wrap gap-1.5">
            {p.keywords.map((k) => (
              <span key={k} className="badge bg-bg text-muted">
                {k}
              </span>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
