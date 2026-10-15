"use client";

import { useState, useEffect } from "react";
import { Bookmark, BookmarkCheck } from "lucide-react";
import { useLiveQuery } from "dexie-react-hooks";
import { getDb, savePaper, unsavePaper } from "@/lib/library/store";
import { requestSavedState, useSavedState } from "@/lib/library/saved-ids";
import type { Paper, SavedPaper } from "@/lib/types";
import { toast } from "@/components/Toaster";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth/store";

interface Props {
  paper: Paper;
  className?: string;
}

/**
 * Toggle a paper in the library: IndexedDB when signed out, Firestore when
 * signed in (saved state from lib/library/saved-ids.ts).
 */
export function SaveButton({ paper, className }: Props) {
  const { user, initialized } = useAuth();

  const localSaved = useLiveQuery(async () => {
    if (typeof window === "undefined") return false;
    return (await getDb().papers.get(paper.id)) !== undefined;
  }, [paper.id]);

  // Signed in: shared with every other Save button, looked up in batches.
  const cloudSaved = useSavedState((s) => (user && s.uid === user.uid ? s.saved[paper.id] : undefined));
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (user) requestSavedState(user.uid, paper.id);
  }, [user, paper.id]);

  const saved = user ? cloudSaved ?? false : localSaved ?? false;
  // Until sign-in state and the lookup are known, "Save" could be wrong, and a
  // click before sign-in loads would save to this browser instead of the account.
  const unknown = !initialized || (user ? cloudSaved === undefined : localSaved === undefined);

  async function toggle() {
    if (busy) return; // ignore double-clicks while a write is in flight
    setBusy(true);
    try {
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
      disabled={busy || unknown}
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
