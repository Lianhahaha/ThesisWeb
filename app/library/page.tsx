"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import Link from "next/link";
import { useLiveQuery } from "dexie-react-hooks";
import { Download, Search as SearchIcon, Trash2 } from "lucide-react";
import {
  getDb,
  unsavePaper,
  updatePaper,
  savePapers,
  allPapers as loadAllPapers,
  applyPaperUpdate,
  PAPER_UPDATED_EVENT,
  type PaperUpdate,
} from "@/lib/db";
import { PaperCard } from "@/components/PaperCard";
import { SynthesisMatrix } from "@/components/SynthesisMatrix";
import { ExportDialog } from "@/components/ExportDialog";
import { toast } from "@/components/Toaster";
import type { SavedPaper } from "@/lib/types";
import { useAuth } from "@/lib/auth-store";

type View = "list" | "matrix";

export default function LibraryPage() {
  const { user, initialized } = useAuth();

  // IndexedDB, for signed-out users.
  const localPapers = useLiveQuery(async () => {
    if (typeof window === "undefined") return [];
    return getDb().papers.toArray();
  }, []);

  // Firestore, for signed-in users.
  const [cloudPapers, setCloudPapers] = useState<SavedPaper[] | null>(null);
  const [cloudLoading, setCloudLoading] = useState(false);

  const refreshCloud = useCallback(async () => {
    if (!user) return;
    setCloudLoading(true);
    try {
      setCloudPapers(await loadAllPapers());
    } catch {
      toast("Could not load your library from the cloud.", "error");
    } finally {
      setCloudLoading(false);
    }
  }, [user]);

  useEffect(() => {
    setCloudPapers(null);
    if (user) refreshCloud();
  }, [user, refreshCloud]);

  // Keep the cloud copy in step with edits (matrix cells, collections) without
  // re-reading every paper from Firestore after each change.
  useEffect(() => {
    function onUpdate(e: Event) {
      const { id, changes } = (e as CustomEvent<PaperUpdate>).detail;
      setCloudPapers((prev) => prev?.map((p) => (p.id === id ? applyPaperUpdate(p, changes) : p)) ?? prev);
    }
    window.addEventListener(PAPER_UPDATED_EVENT, onUpdate);
    return () => window.removeEventListener(PAPER_UPDATED_EVENT, onUpdate);
  }, []);

  const papers: SavedPaper[] | undefined = user
    ? cloudPapers ?? undefined
    : (localPapers as SavedPaper[] | undefined);

  const isLoading =
    !initialized || (user ? cloudLoading && cloudPapers === null : localPapers === undefined);

  const [view, setView] = useState<View>("list");
  const [filter, setFilter] = useState("");
  const [collectionFilter, setCollectionFilter] = useState("");
  const [exportOpen, setExportOpen] = useState(false);

  const collections = useMemo(() => {
    const set = new Set<string>();
    (papers || []).forEach((p) => p.collection && set.add(p.collection));
    return Array.from(set).sort();
  }, [papers]);

  const filtered = useMemo(() => {
    let list = (papers || []).slice().sort((a, b) => b.savedAt - a.savedAt);
    if (collectionFilter) list = list.filter((p) => p.collection === collectionFilter);
    if (filter.trim()) {
      const q = filter.toLowerCase();
      list = list.filter(
        (p) =>
          p.title.toLowerCase().includes(q) ||
          p.authors.some((a) => a.toLowerCase().includes(q)) ||
          (p.notes || "").toLowerCase().includes(q)
      );
    }
    return list;
  }, [papers, filter, collectionFilter]);

  async function assignCollection(id: string, collection: string) {
    try {
      await updatePaper(id, { collection: collection.trim().slice(0, 100) || undefined });
      toast(collection ? `Moved to “${collection}”` : "Removed from collection", "info");
    } catch {
      toast("Could not change the collection. Try again.", "error");
    }
  }

  // Papers saved while signed out stay in this browser; offer to bring them along.
  const browserOnly = user ? ((localPapers as SavedPaper[] | undefined) ?? []) : [];
  const [copying, setCopying] = useState(false);
  async function copyBrowserPapers() {
    setCopying(true);
    try {
      await savePapers(browserOnly);
      toast(`Copied ${browserOnly.length} papers to your account`, "success");
      refreshCloud();
    } catch {
      toast("Could not copy the papers. Try again.", "error");
    } finally {
      setCopying(false);
    }
  }

  async function remove(id: string) {
    if (!confirm("Remove this paper from your library?")) return;
    try {
      await unsavePaper(id);
    } catch {
      toast("Could not remove the paper. Try again.", "error");
      return;
    }
    toast("Removed from library", "info");
    if (user) setCloudPapers((prev) => prev?.filter((p) => p.id !== id) ?? prev);
  }

  if (isLoading) {
    return <p role="status" className="py-20 text-center text-muted">Loading your library…</p>;
  }

  const total = papers?.length ?? 0;

  return (
    <div className="mx-auto max-w-4xl">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">Your sources</p>
          <h1 className="display mt-3 text-3xl sm:text-4xl">Library</h1>
          <p className="mt-2 text-muted">
            {total} saved {total === 1 ? "paper" : "papers"}
            {user ? " · synced to your account" : " · stored in this browser only"}
          </p>
        </div>
        {total > 0 && (
          <button onClick={() => setExportOpen(true)} className="btn-primary">
            <Download className="h-4 w-4" aria-hidden />
            Export references
          </button>
        )}
      </header>

      {!user && total > 0 && (
        <p className="notice notice-info mb-4">
          You are not signed in, so these papers live only in this browser. Clearing site data
          deletes them. <Link href="/login" className="text-accent underline">Sign in</Link>{" "}
          to keep
          them on every device.
        </p>
      )}

      {user && browserOnly.length > 0 && (
        <div className="notice notice-info mb-4 flex flex-wrap items-center justify-between gap-3">
          <p>
            This browser has <strong>{browserOnly.length}</strong> paper
            {browserOnly.length === 1 ? "" : "s"} you saved before signing in.
          </p>
          <button onClick={copyBrowserPapers} disabled={copying} className="btn-secondary btn-sm">
            {copying ? "Copying…" : "Copy to my account"}
          </button>
        </div>
      )}

      {total === 0 ? (
        <div className="panel py-16 text-center">
          <h2 className="text-lg">Your library is empty</h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-muted">
            Search for papers and press <strong className="text-text">Save</strong>. Saved papers can
            be grouped by chapter, annotated, compared in a synthesis matrix and exported as
            citations.
          </p>
          <Link href="/search" className="btn-primary mt-6">
            <SearchIcon className="h-4 w-4" aria-hidden />
            Find papers
          </Link>
        </div>
      ) : (
        <>
          <div className="panel flex flex-wrap items-center gap-3">
            <div className="relative min-w-[200px] flex-1">
              <label htmlFor="lib-filter" className="sr-only">Filter saved papers</label>
              <SearchIcon
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-subtle"
                aria-hidden
              />
              <input
                id="lib-filter"
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                placeholder="Filter by title, author or note…"
                className="input pl-9"
              />
            </div>

            <div className="seg" role="group" aria-label="View">
              <button type="button" data-on={view === "list"} onClick={() => setView("list")}>
                List
              </button>
              <button type="button" data-on={view === "matrix"} onClick={() => setView("matrix")}>
                Synthesis matrix
              </button>
            </div>
          </div>

          {collections.length > 0 && (
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <span className="text-xs text-subtle">Collection</span>
              <button
                onClick={() => setCollectionFilter("")}
                aria-pressed={collectionFilter === ""}
                className={`chip-btn ${collectionFilter === "" ? "chip-on" : ""}`}
              >
                All
              </button>
              {collections.map((c) => (
                <button
                  key={c}
                  onClick={() => setCollectionFilter(c === collectionFilter ? "" : c)}
                  aria-pressed={collectionFilter === c}
                  className={`chip-btn ${collectionFilter === c ? "chip-on" : ""}`}
                >
                  {c}
                </button>
              ))}
            </div>
          )}

          <div className="mt-4">
            {view === "list" ? (
              filtered.length > 0 ? (
                <ul className="space-y-3">
                  {filtered.map((p) => (
                    <li key={p.id} className="card">
                      <PaperCard paper={p} />
                      <LibraryControls
                        paper={p}
                        collections={collections}
                        onAssign={assignCollection}
                        onRemove={remove}
                      />
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="panel text-center text-sm text-muted">
                  No saved papers match this filter.
                </p>
              )
            ) : (
              <SynthesisMatrix papers={filtered} />
            )}
          </div>
        </>
      )}

      {exportOpen && papers && (
        <ExportDialog papers={filtered} onClose={() => setExportOpen(false)} />
      )}
    </div>
  );
}

function LibraryControls({
  paper,
  collections,
  onAssign,
  onRemove,
}: {
  paper: SavedPaper;
  collections: string[];
  onAssign: (id: string, c: string) => void;
  onRemove: (id: string) => void;
}) {
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");

  return (
    <div className="flex flex-wrap items-center gap-2 border-t border-border px-4 py-3 sm:px-5">
      <label htmlFor={`coll-${paper.id}`} className="text-xs text-subtle">Collection</label>
      <select
        id={`coll-${paper.id}`}
        value={paper.collection || ""}
        onChange={(e) => onAssign(paper.id, e.target.value)}
        className="input !min-h-[32px] !w-auto !py-1 text-xs"
      >
        <option value="">None</option>
        {collections.map((c) => (
          <option key={c} value={c}>{c}</option>
        ))}
      </select>

      {adding ? (
        <input
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          onBlur={() => { setAdding(false); setName(""); }}
          onKeyDown={(e) => {
            if (e.key === "Enter" && name.trim()) {
              onAssign(paper.id, name.trim());
              setName("");
              setAdding(false);
            }
            if (e.key === "Escape") { setAdding(false); setName(""); }
          }}
          placeholder="New collection, then Enter"
          aria-label="New collection name"
          className="input !min-h-[32px] !w-[200px] !py-1 text-xs"
        />
      ) : (
        <button onClick={() => setAdding(true)} className="btn-ghost btn-sm">
          New collection
        </button>
      )}

      <span className="chip ml-auto capitalize">{paper.readingStatus.replace("-", " ")}</span>

      <button onClick={() => onRemove(paper.id)} className="btn-ghost btn-sm !text-danger">
        <Trash2 className="h-3.5 w-3.5" aria-hidden />
        Remove
      </button>
    </div>
  );
}
