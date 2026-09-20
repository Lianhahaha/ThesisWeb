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

  useEffect(() => {
    if (!user) { setCloudSaved(null); return; }
    isSaved(paper.id).then(setCloudSaved);
  }, [user, paper.id]);

  // Merge: prefer Firestore when logged in
  const saved = user ? (cloudSaved ?? false) : (localSaved ?? false);

  async function toggle() {
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
  }

  return (
    <button
      onClick={toggle}
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
