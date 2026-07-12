"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import {
  Library as LibraryIcon,
  Download,
  Table2,
  FileText,
  Trash2,
  Search as SearchIcon,
  FolderPlus,
  Loader2,
} from "lucide-react";
import { getDb, unsavePaper, updatePaper, allPapers as loadAllPapers } from "@/lib/db";
import { PaperCard } from "@/components/PaperCard";
import { SynthesisMatrix } from "@/components/SynthesisMatrix";
import { ExportDialog } from "@/components/ExportDialog";
import { toast } from "@/components/Toaster";
import { cn } from "@/lib/utils";
import type { SavedPaper } from "@/lib/types";
import { useAuth } from "@/lib/auth-store";

type View = "list" | "matrix";

export default function LibraryPage() {
  const { user, initialized } = useAuth();

  // --- IndexedDB (for logged-out users) ---
  const localPapers = useLiveQuery(async () => {
    if (typeof window === "undefined") return [];
    return getDb().papers.toArray();
  }, []);

  // --- Firestore (for logged-in users) ---
  const [cloudPapers, setCloudPapers] = useState<SavedPaper[] | null>(null);
  const [cloudLoading, setCloudLoading] = useState(false);

  const refreshCloud = useCallback(async () => {
    if (!user) return;
    setCloudLoading(true);
    try {
      const results = await loadAllPapers();
      setCloudPapers(results);
    } catch {
      toast("Failed to load library from cloud", "error");
    } finally {
      setCloudLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      setCloudPapers(null);
      refreshCloud();
    } else {
      setCloudPapers(null);
    }
  }, [user, refreshCloud]);

  // Use Firestore papers when logged in, IndexedDB when not
  const papers: SavedPaper[] | undefined = user
    ? (cloudPapers ?? undefined)
    : (localPapers as SavedPaper[] | undefined);

  const isLoading = !initialized || (user ? cloudLoading && cloudPapers === null : localPapers === undefined);

  const [view, setView] = useState<View>("list");
  const [filter, setFilter] = useState("");
  const [collectionFilter, setCollectionFilter] = useState<string>("");
  const [exportOpen, setExportOpen] = useState(false);
  const [newCollection, setNewCollection] = useState("");

  // Derive distinct collections from the saved papers.
  const collections = useMemo(() => {
    const set = new Set<string>();
    (papers || []).forEach((p) => {
      if (p.collection) set.add(p.collection);
    });
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
    await updatePaper(id, { collection: collection || undefined });
    toast(collection ? `Moved to "${collection}"` : "Removed from collection", "info");
    if (user) refreshCloud();
  }

  async function remove(id: string) {
    await unsavePaper(id);
    toast("Removed from library", "info");
    if (user) refreshCloud();
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-6 w-6 animate-spin text-muted" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-6 py-8">
      <header className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Library</h1>
          <p className="mt-1 text-sm text-muted">
            {papers?.length || 0} saved paper{papers?.length === 1 ? "" : "s"} · organize, annotate,
            and export your RRL.
          </p>
        </div>
        {papers && papers.length > 0 && (
          <button onClick={() => setExportOpen(true)} className="btn-primary">
            <Download className="h-4 w-4" />
            Export
          </button>
        )}
      </header>

      {papers && papers.length === 0 && (
        <div className="card p-12 text-center">
          <LibraryIcon className="h-10 w-10 text-muted mx-auto opacity-50" />
          <p className="mt-3 font-medium">Your library is empty</p>
          <p className="text-sm text-muted mt-1">
            Search for papers and tap <strong>Save</strong> to build your review of related literature.
          </p>
          <a href="/search" className="btn-primary mt-4 inline-flex">
            <SearchIcon className="h-4 w-4" />
            Find papers
          </a>
        </div>
      )}

      {papers && papers.length > 0 && (
        <>
          {/* Toolbar */}
          <div className="card p-3 mb-4 flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted" />
              <input
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                placeholder="Filter by title, author, or note…"
                className="input pl-9 !py-1.5 !text-sm"
              />
            </div>

            {/* View toggle */}
            <div className="flex rounded-lg border border-border overflow-hidden">
              <button
                onClick={() => setView("list")}
                className={cn("px-3 py-1.5 text-xs font-medium", view === "list" ? "bg-brand-600 text-white" : "text-muted hover:bg-bg")}
              >
                <FileText className="h-3.5 w-3.5 inline mr-1" />
                List
              </button>
              <button
                onClick={() => setView("matrix")}
                className={cn("px-3 py-1.5 text-xs font-medium", view === "matrix" ? "bg-brand-600 text-white" : "text-muted hover:bg-bg")}
              >
                <Table2 className="h-3.5 w-3.5 inline mr-1" />
                Synthesis matrix
              </button>
            </div>
          </div>

          {/* Collection chips */}
          {collections.length > 0 && (
            <div className="mb-4 flex flex-wrap gap-1.5 items-center">
              <button
                onClick={() => setCollectionFilter("")}
                className={cn(
                  "badge border",
                  collectionFilter === "" ? "bg-brand-600 text-white border-brand-600" : "bg-surface text-muted border-border"
                )}
              >
                All
              </button>
              {collections.map((c) => (
                <button
                  key={c}
                  onClick={() => setCollectionFilter(c === collectionFilter ? "" : c)}
                  className={cn(
                    "badge border",
                    collectionFilter === c ? "bg-brand-600 text-white border-brand-600" : "bg-surface text-muted border-border"
                  )}
                >
                  {c}
                </button>
              ))}
            </div>
          )}

          {/* Views */}
          {view === "list" ? (
            <div className="space-y-3">
              {filtered.map((p) => (
                <LibraryItem
                  key={p.id}
                  paper={p}
                  collections={collections}
                  onAssign={assignCollection}
                  onRemove={remove}
                />
              ))}
              {filtered.length === 0 && (
                <p className="text-center text-sm text-muted py-8">No papers match your filter.</p>
              )}
            </div>
          ) : (
            <SynthesisMatrix papers={filtered as SavedPaper[]} />
          )}
        </>
      )}

      {exportOpen && papers && (
        <ExportDialog papers={papers as SavedPaper[]} onClose={() => setExportOpen(false)} />
      )}
    </div>
  );
}

function LibraryItem({
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
  const [showCollectionInput, setShowCollectionInput] = useState(false);
  const [newColl, setNewColl] = useState("");

  return (
    <div className="relative">
      <PaperCard paper={paper} />
      {/* Library-specific actions below the card */}
      <div className="mt-1.5 flex flex-wrap items-center justify-between gap-2 px-1 text-xs">
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={paper.collection || ""}
            onChange={(e) => onAssign(paper.id, e.target.value)}
            className="input !w-auto !py-1 !text-xs"
          >
            <option value="">No collection</option>
            {collections.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>

          {showCollectionInput ? (
            <div className="flex items-center gap-1">
              <input
                autoFocus
                value={newColl}
                onChange={(e) => setNewColl(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && newColl.trim()) {
                    onAssign(paper.id, newColl.trim());
                    setNewColl("");
                    setShowCollectionInput(false);
                  }
                }}
                placeholder="New collection name…"
                className="input !py-1 !text-xs !w-40"
              />
            </div>
          ) : (
            <button
              onClick={() => setShowCollectionInput(true)}
              className="btn-ghost !py-1 !text-xs"
            >
              <FolderPlus className="h-3 w-3" />
              New collection
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          <span className="badge bg-bg text-muted capitalize">
            {paper.readingStatus.replace("-", " ")}
          </span>
          <button onClick={() => onRemove(paper.id)} className="btn-ghost !py-1 !text-xs text-red-600 hover:text-red-700">
            <Trash2 className="h-3 w-3" />
            Remove
          </button>
        </div>
      </div>
    </div>
  );
}
