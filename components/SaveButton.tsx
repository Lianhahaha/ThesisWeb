"use client";

import { Bookmark, BookmarkCheck } from "lucide-react";
import { useLiveQuery } from "dexie-react-hooks";
import { getDb, savePaper, unsavePaper, isSaved } from "@/lib/db";
import type { Paper, SavedPaper } from "@/lib/types";
import { toast } from "@/components/Toaster";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth-store";
import { useState, useEffect } from "react";

interface Props {
  paper: Paper;
  className?: string;
}

/**
 * Toggle save/unsave a paper into the local library.
 * Uses a live query (IndexedDB) for logged-out users,
 * and a polled check (Firestore) for logged-in users.
 */
export function SaveButton({ paper, className }: Props) {
  const { user } = useAuth();

  // IndexedDB live query (always runs — used by logged-out users)
  const localSaved = useLiveQuery(async () => {
    if (typeof window === "undefined") return false;
    return (await getDb().papers.get(paper.id)) !== undefined;
  }, [paper.id]);

  // Firestore check (for logged-in users)
  const [cloudSaved, setCloudSaved] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!user) { setCloudSaved(null); return; }
    // A failed lookup must not become an unhandled rejection; treat as "not saved".
    isSaved(paper.id).then(setCloudSaved).catch(() => setCloudSaved(false));
  }, [user, paper.id]);

  // Merge: prefer Firestore when logged in
  const saved = user ? (cloudSaved ?? false) : (localSaved ?? false);

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
      // Firestore/IndexedDB writes can fail (offline, rules, quota). Tell the
      // user instead of leaving the button in a state that looks successful.
      toast("Couldn't update your library — please try again.", "error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      onClick={toggle}
      disabled={busy}
      className={cn(
        saved ? "btn-secondary !py-1.5 !text-xs text-brand-600" : "btn-ghost !py-1.5 !text-xs",
        className
      )}
      aria-pressed={saved}
    >
      {saved ? <BookmarkCheck className="h-3.5 w-3.5" /> : <Bookmark className="h-3.5 w-3.5" />}
      {saved ? "Saved" : "Save"}
    </button>
  );
}
