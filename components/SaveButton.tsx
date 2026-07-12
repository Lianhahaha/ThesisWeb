"use client";

import { Bookmark, BookmarkCheck } from "lucide-react";
import { useLiveQuery } from "dexie-react-hooks";
import { getDb, savePaper, unsavePaper } from "@/lib/db";
import type { Paper, SavedPaper } from "@/lib/types";
import { toast } from "@/components/Toaster";
import { cn } from "@/lib/utils";

interface Props {
  paper: Paper;
  className?: string;
}

/**
 * Toggle save/unsave a paper into the local library.
 * Uses a live query so the bookmark icon updates instantly across the app.
 */
export function SaveButton({ paper, className }: Props) {
  const saved = useLiveQuery(async () => {
    if (typeof window === "undefined") return false;
    return (await getDb().papers.get(paper.id)) !== undefined;
  }, [paper.id]);

  async function toggle() {
    if (saved) {
      await unsavePaper(paper.id);
      toast("Removed from library", "info");
    } else {
      const entry: SavedPaper = {
        ...paper,
        savedAt: Date.now(),
        tags: [],
        readingStatus: "to-read",
      };
      await savePaper(entry);
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
