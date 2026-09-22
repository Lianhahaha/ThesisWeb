"use client";

import { useState, useEffect } from "react";
import { Bookmark, BookmarkCheck } from "lucide-react";
import { useLiveQuery } from "dexie-react-hooks";
import { getDb, savePaper, unsavePaper, isSaved } from "@/lib/db";
import type { Paper, SavedPaper } from "@/lib/types";
import { toast } from "@/components/Toaster";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth-store";

interface Props {
  paper: Paper;
  className?: string;
}

/**
 * Toggle a paper in the library: IndexedDB when signed out, Firestore when
 * signed in.
 */
export function SaveButton({ paper, className }: Props) {
  const { user } = useAuth();

  const localSaved = useLiveQuery(async () => {
    if (typeof window === "undefined") return false;
    return (await getDb().papers.get(paper.id)) !== undefined;
  }, [paper.id]);

  const [cloudSaved, setCloudSaved] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!user) { setCloudSaved(null); return; }
    // A failed lookup must not become an unhandled rejection; treat as "not saved".
    isSaved(paper.id).then(setCloudSaved).catch(() => setCloudSaved(false));
  }, [user, paper.id]);

  const saved = user ? cloudSaved ?? false : localSaved ?? false;

  async function toggle() {
    if (busy) return; // ignore double-clicks while a write is in flight
    setBusy(true);
    try {
      if (saved) {
        await unsavePaper(paper.id);
        if (user) setCloudSaved(false);
        toast("Removed from library", "info");
      } else {
        const entry: SavedPaper = {
          ...paper,
          savedAt: Date.now(),
          tags: [],
          readingStatus: "to-read",
        };
        await savePaper(entry);
        if (user) setCloudSaved(true);
        toast("Saved to library", "success");
      }
    } catch {
      // Writes fail offline, on quota, or against Firestore rules. Say so rather
      // than leaving a button that looks like it worked.
      toast("Could not update your library. Try again.", "error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      onClick={toggle}
      disabled={busy}
      aria-pressed={saved}
      className={cn(saved ? "btn-secondary btn-sm" : "btn-primary btn-sm", className)}
    >
      {saved ? (
        <BookmarkCheck className="h-3.5 w-3.5" aria-hidden />
      ) : (
        <Bookmark className="h-3.5 w-3.5" aria-hidden />
      )}
      {saved ? "Saved" : "Save"}
    </button>
  );
}
