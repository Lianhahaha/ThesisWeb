"use client";

import { use, useState, useEffect } from "react";
import Link from "next/link";
import { useMutation } from "@tanstack/react-query";
import { useLiveQuery } from "dexie-react-hooks";
import { ArrowLeft, Check, ExternalLink, FileText } from "lucide-react";
import { getDb, savePaper, unsavePaper, updatePaper, getPaper } from "@/lib/db";
import { getRecentPaper, mergeRecentPapers } from "@/lib/recent-papers";
import { formatCitation, citationToText, inTextCitation, toBibtex, type CitationStyle } from "@/lib/citations";
import { toast } from "@/components/Toaster";
import type { Paper, SavedPaper } from "@/lib/types";
import { useAuth } from "@/lib/auth-store";
import { RelatedPapers } from "@/components/RelatedPapers";
import { sourceLabel } from "@/lib/sources/meta";
import { getPreferences } from "@/lib/preferences";

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

  // IndexedDB, for signed-out users. undefined = still loading, null = not
  // saved: Dexie answers a missing record with undefined, which would read as
  // "loading" forever.
  const savedLocal = useLiveQuery(
    async () => {
      if (typeof window === "undefined") return undefined;
      return (await getDb().papers.get(decodedId)) ?? null;
    },
    [decodedId],
    undefined
  );

  // Firestore, for signed-in users.
  const [cloudSaved, setCloudSaved] = useState<boolean | null>(null);
  const [cloudSavedData, setCloudSavedData] = useState<SavedPaper | null>(null);

  useEffect(() => {
    if (!user) { setCloudSaved(null); setCloudSavedData(null); return; }
    getPaper(decodedId)
      .then((p) => {
        setCloudSaved(!!p);
        setCloudSavedData(p ?? null);
      })
      .catch(() => {
        setCloudSaved(false);
        setCloudSavedData(null);
      });
  }, [user, decodedId]);

  const saved = user
    ? cloudSaved === true
      ? cloudSavedData ?? true
      : cloudSaved === false
      ? null
      : undefined
    : savedLocal;

  // Papers the user just saw in search results live in sessionStorage.
  const [recent, setRecent] = useState<Paper | null>(null);
  useEffect(() => {
    const found = getRecentPaper(decodedId);
    if (found) setRecent(found);
  }, [decodedId]);

  const paper: Paper | null = (saved && typeof saved === "object" ? saved : null) ?? recent;
  const isSaved = saved !== undefined && saved !== null;
  const isSavedData = isSaved && typeof saved === "object" ? (saved as SavedPaper) : null;

  const [style, setStyle] = useState<CitationStyle>("apa");
  useEffect(() => setStyle(getPreferences().citationStyle), []);
  const [notes, setNotes] = useState("");

  // Mirror the stored notes, including "none" — a truthy check used to leave the
  // previous paper's notes on screen.
  useEffect(() => {
    setNotes(isSavedData?.notes ?? "");
  }, [decodedId, isSavedData?.notes]);

  const dbLoading = saved === undefined;
  const noRecent = recent === null;
  const dbMissing = saved === null;

  // A copy found by "Find free PDF". Kept here so it shows whether or not
  // the paper is saved (it used to be written only into a saved record).
  const [foundUrl, setFoundUrl] = useState<string | null>(null);
  useEffect(() => setFoundUrl(null), [decodedId]);

  const findPdf = useMutation({
    mutationFn: async (doi: string) => {
      const res = await fetch(`/api/pdf?doi=${encodeURIComponent(doi)}`);
      if (!res.ok) throw new Error("Lookup failed");
      return res.json();
    },
    onSuccess: (data) => {
      if (data.found && data.url) {
        toast(`Found ${data.kind === "pdf" ? "a PDF" : "a landing page"}`, "success");
        setFoundUrl(data.url);
        if (isSavedData) {
          const changes = { openAccessUrl: data.url as string, isOpenAccess: true };
          updatePaper(decodedId, changes)
            .then(() => { if (user) setCloudSavedData((prev) => (prev ? { ...prev, ...changes } : prev)); })
            .catch(() => {});
        }
      } else {
        toast("No legal open-access copy found for this DOI.", "error");
      }
    },
    onError: () => toast("PDF lookup failed. Try again.", "error"),
  });

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
    onError: () => toast("Could not summarize this abstract.", "error"),
  });

  if (dbLoading && noRecent) {
    return <p role="status" className="py-20 text-center text-muted">Loading paper…</p>;
  }

  if (!dbLoading && dbMissing && noRecent) {
    return (
      <div className="panel mx-auto max-w-xl py-14 text-center">
        <h1 className="text-xl">Paper not found</h1>
        <p className="mx-auto mt-2 max-w-md text-sm text-muted">
          This paper is not in your library and is not in your latest search results. Search for it
          again and open it from there.
        </p>
        <Link href="/search" className="btn-primary mt-6">Go to search</Link>
      </div>
    );
  }

  if (!paper) return null;

  /** Fill in the fields a SavedPaper needs but a search result may not carry. */
  function toSaved(source: Paper, overrides?: Partial<SavedPaper>): SavedPaper {
    return {
      ...source,
      id: source.id || decodedId,
      title: source.title || "Untitled",
      authors: source.authors || [],
      year: source.year ?? null,
      sources: source.sources || [],
      savedAt: Date.now(),
      tags: [],
      readingStatus: "to-read",
      ...overrides,
    };
  }

  async function toggleSave() {
    try {
      if (isSavedData) {
        // Keep the paper on screen (and re-savable) once it leaves the library.
        mergeRecentPapers([isSavedData]);
        setRecent(isSavedData);
        await unsavePaper(decodedId);
        setCloudSaved(false);
        setCloudSavedData(null);
        toast("Removed from library", "info");
      } else if (paper) {
        const sp = toSaved(paper);
        await savePaper(sp);
        setCloudSaved(true);
        setCloudSavedData(sp);
        toast("Saved to library", "success");
      }
    } catch {
      toast("Could not reach your library. Check your connection and try again.", "error");
    }
  }

  async function saveNotes() {
    try {
      if (!isSavedData && paper) {
        const sp = toSaved(paper, { notes });
        await savePaper(sp);
        setCloudSaved(true);
        setCloudSavedData(sp);
      } else {
        await updatePaper(decodedId, { notes });
        // Signed-in users read from cloudSavedData, which updatePaper doesn't
        // touch — without this the button never re-disables.
        if (user) setCloudSavedData((prev) => (prev ? { ...prev, notes } : prev));
      }
      toast("Notes saved", "success");
    } catch {
      toast("Could not save your notes. Copy them somewhere safe and try again.", "error");
    }
  }

  const p: Paper = isSavedData ?? paper;
  const freeUrl = p.openAccessUrl || foundUrl;

  return (
    <article className="mx-auto max-w-3xl">
      <Link href="/search" className="btn-ghost btn-sm -ml-2.5 mb-4">
        <ArrowLeft className="h-4 w-4" aria-hidden />
        Back to search
      </Link>

      {p.retracted && (
        <p role="alert" className="notice notice-danger mb-5">
          <strong>This paper has been retracted.</strong>{" "}
          Its findings are no longer considered
          reliable. Do not cite it as supporting evidence.
        </p>
      )}

      <h1 className="display text-2xl leading-tight sm:text-3xl">{p.title}</h1>

      <p className="mt-3 text-muted">
        {p.authors.length > 0 ? p.authors.join(", ") : "Author not listed"}
        {p.year != null && ` · ${p.year}`}
        {p.venue && <> · <span className="italic">{p.venue}</span></>}
      </p>

      <div className="mt-3 flex flex-wrap gap-1.5">
        {p.isOpenAccess && (
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
        {(p.citedByCount ?? 0) > 0 && (
          <span className="chip">Cited {p.citedByCount!.toLocaleString()}</span>
        )}
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        <button
          onClick={toggleSave}
          aria-pressed={!!isSavedData}
          className={isSavedData ? "btn-secondary" : "btn-primary"}
        >
          {isSavedData ? "Saved to library" : "Save to library"}
        </button>

        {freeUrl ? (
          <a
            href={freeUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-secondary"
          >
            <FileText className="h-4 w-4" aria-hidden />
            Read free copy
          </a>
        ) : p.doi ? (
          <button
            onClick={() => findPdf.mutate(p.doi!)}
            disabled={findPdf.isPending}
            className="btn-secondary"
          >
            {findPdf.isPending ? "Looking…" : "Find free PDF"}
          </button>
        ) : null}

        {p.doi && (
          <a
            href={`https://doi.org/${p.doi}`}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-ghost"
          >
            <ExternalLink className="h-4 w-4" aria-hidden />
            Publisher page
          </a>
        )}
      </div>

      {!freeUrl && !p.doi && (
        <p className="field-hint">
          No DOI is listed, so a free copy cannot be looked up automatically.
        </p>
      )}

      {(p.tldr || p.abstract) && (
        <section className="mt-10" aria-labelledby="abstract">
          <h2 id="abstract" className="text-lg">Abstract</h2>

          {p.tldr && (
            <p className="notice notice-info mt-3">
              <strong>TL;DR:</strong> {p.tldr}
            </p>
          )}

          {p.abstract ? (
            <p className="prose-read mt-4 whitespace-pre-line text-base">{p.abstract}</p>
          ) : (
            <p className="mt-3 text-muted">No abstract is available for this paper.</p>
          )}

          {p.abstract && p.abstract.length > 400 && (
            <>
              <button
                onClick={() => summarize.mutate(p.abstract!)}
                disabled={summarize.isPending}
                className="btn-secondary btn-sm mt-4"
              >
                {summarize.isPending ? "Working…" : "Extract key points"}
              </button>
              {summarize.data && (
                <p className="notice notice-info mt-3">
                  <strong>Key points: </strong>
                  {summarize.data.text}
                </p>
              )}
            </>
          )}
        </section>
      )}

      <section className="mt-10" aria-labelledby="cite">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 id="cite" className="text-lg">Cite this paper</h2>
          <div className="seg" role="group" aria-label="Citation style">
            {STYLES.map((s) => (
              <button key={s.id} type="button" data-on={style === s.id} onClick={() => setStyle(s.id)}>
                {s.label}
              </button>
            ))}
          </div>
        </div>

        <div className="panel mt-3">
          <p
            className="prose-read text-[15px]"
            dangerouslySetInnerHTML={{ __html: formatCitation(p, style, 1) }}
          />
          <p className="mt-3 border-t border-border pt-3 text-sm text-muted">
            In text: <code>{inTextCitation(p, style, 1)}</code>
          </p>
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          <button
            onClick={() => {
              navigator.clipboard
                .writeText(citationToText(formatCitation(p, style, 1)))
                .then(() => toast("Citation copied", "success"))
                .catch(() => toast("Could not copy. Select the text instead.", "error"));
            }}
            className="btn-secondary btn-sm"
          >
            Copy citation
          </button>
          <button
            onClick={() => {
              navigator.clipboard
                .writeText(toBibtex(p))
                .then(() => toast("BibTeX copied", "success"))
                .catch(() => toast("Could not copy. Select the text instead.", "error"));
            }}
            className="btn-ghost btn-sm"
          >
            Copy BibTeX
          </button>
        </div>
        <p className="field-hint">
          Generated from database records. Check it against your school&apos;s style guide.
        </p>
      </section>

      {p.doi && <RelatedPapers key={p.doi} doi={p.doi} />}

      <section className="mt-10" aria-labelledby="notes">
        <h2 id="notes" className="text-lg">My notes</h2>
        <label htmlFor="notes-box" className="sr-only">Notes about this paper</label>
        <textarea
          id="notes-box"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Why this paper matters to your thesis, key quotes with page numbers…"
          rows={5}
          maxLength={20000}
          className="input prose-read mt-3 resize-y"
        />
        <button
          onClick={saveNotes}
          disabled={notes === (isSavedData?.notes || "")}
          className="btn-secondary btn-sm mt-2"
        >
          Save notes
        </button>
        {!isSavedData && (
          <p className="field-hint">Saving notes also adds this paper to your library.</p>
        )}
      </section>

      {p.keywords && p.keywords.length > 0 && (
        <section className="mt-10" aria-labelledby="keywords">
          <h2 id="keywords" className="text-lg">Keywords</h2>
          <ul className="mt-3 flex flex-wrap gap-1.5">
            {p.keywords.map((k) => (
              <li key={k} className="chip max-w-full" title={k}><span className="truncate">{k}</span></li>
            ))}
          </ul>
        </section>
      )}

      {p.sources.length > 0 && (
        <p className="mt-10 border-t border-border pt-4 text-sm text-subtle">
          Found in {p.sources.map(sourceLabel).join(", ")}.
        </p>
      )}
    </article>
  );
}
