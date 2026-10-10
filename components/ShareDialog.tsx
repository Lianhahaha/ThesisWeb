"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Copy, ExternalLink, Trash2, X } from "lucide-react";
import type { SavedPaper } from "@/lib/types";
import { useAuth } from "@/lib/auth/store";
import { getCachedUsername } from "@/lib/auth/username-cache";
import { deleteShare, listMyShares, publishShare, shareUrl } from "@/lib/library/share";
import { MAX_SHARED, type SharedLibrary } from "@/lib/library/shared-copy";
import { toast } from "@/components/Toaster";

/** Readable message for a failed share write. */
function shareError(e: unknown): string {
  const code = (e as { code?: string })?.code;
  if (code === "permission-denied") {
    return "Sharing isn't switched on yet: the site owner needs to publish the updated Firestore rules.";
  }
  return e instanceof Error ? e.message : "Could not share. Try again.";
}

/**
 * Share the papers on screen with group mates by link: they can read them,
 * export the references and copy them into their own library.
 */
export function ShareDialog({
  papers,
  defaultName,
  onClose,
}: {
  papers: SavedPaper[];
  /** The collection being viewed, if any. */
  defaultName: string;
  onClose: () => void;
}) {
  const { user } = useAuth();
  const closeRef = useRef<HTMLButtonElement>(null);
  const [name, setName] = useState(defaultName || "Our RRL");
  const [includeNotes, setIncludeNotes] = useState(true);
  const [mine, setMine] = useState<SharedLibrary[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [link, setLink] = useState<string | null>(null);

  useEffect(() => {
    closeRef.current?.focus();
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const loadMine = useCallback(() => {
    if (!user) return;
    listMyShares(user.uid).then(setMine, () => setMine([]));
  }, [user]);
  useEffect(loadMine, [loadMine]);

  const existing = mine?.find((s) => s.name.trim().toLowerCase() === name.trim().toLowerCase());

  async function publish() {
    if (!user) return;
    setBusy(true);
    try {
      const id = await publishShare({
        id: existing?.id,
        createdAt: existing?.createdAt,
        owner: user.uid,
        ownerName: getCachedUsername(user.uid) || user.displayName || user.email?.split("@")[0] || "A Thesisweb user",
        name,
        papers,
        includeNotes,
      });
      setLink(shareUrl(id));
      toast(existing ? "Shared copy updated" : "Link created. Send it to your group.", "success");
      loadMine();
    } catch (e) {
      toast(shareError(e), "error");
    } finally {
      setBusy(false);
    }
  }

  function copy(url: string) {
    navigator.clipboard
      .writeText(url)
      .then(() => toast("Link copied", "success"))
      .catch(() => toast("Could not copy. Select the link instead.", "error"));
  }

  async function stop(share: SharedLibrary) {
    if (!confirm(`Stop sharing “${share.name}”? The link will stop working.`)) return;
    try {
      await deleteShare(share.id);
      if (link === shareUrl(share.id)) setLink(null);
      toast("Link removed", "info");
      loadMine();
    } catch (e) {
      toast(shareError(e), "error");
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="share-title"
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[92vh] w-full max-w-xl flex-col rounded-t-2xl border border-border bg-surface text-left sm:rounded-2xl"
      >
        <header className="flex items-center justify-between border-b border-border p-4">
          <h2 id="share-title" className="text-lg">Share with your group</h2>
          <button ref={closeRef} onClick={onClose} className="btn-ghost btn-sm !px-2" aria-label="Close">
            <X className="h-4 w-4" aria-hidden />
          </button>
        </header>

        <div className="overflow-y-auto p-4">
          {!user ? (
            <p className="text-sm text-muted">
              <Link href="/login" className="text-accent underline">Sign in</Link> to share papers by link.
              Group mates don&apos;t need an account to open it.
            </p>
          ) : (
            <>
              <p className="text-sm text-muted">
                Anyone with the link can read these {papers.length} papers, export the references and copy
                them into their own library. It is a copy: press <em>Update</em> after you add papers.
              </p>
              {papers.length > MAX_SHARED && (
                <p className="notice notice-danger mt-3">
                  Up to {MAX_SHARED} papers can be shared at once. Pick one collection first.
                </p>
              )}

              <label htmlFor="share-name" className="field-label mt-4">Name your group mates will see</label>
              <input
                id="share-name"
                value={name}
                maxLength={100}
                onChange={(e) => setName(e.target.value)}
                className="input"
              />
              <label className="mt-3 flex cursor-pointer items-center gap-2 text-sm text-muted">
                <input
                  type="checkbox"
                  checked={includeNotes}
                  onChange={(e) => setIncludeNotes(e.target.checked)}
                  className="h-4 w-4 rounded"
                  style={{ accentColor: "rgb(var(--accent))" }}
                />
                Include my notes and synthesis matrix
              </label>

              <button
                onClick={publish}
                disabled={busy || !name.trim() || papers.length === 0 || papers.length > MAX_SHARED}
                className="btn-primary mt-4 w-full sm:w-auto"
              >
                {busy ? "Saving…" : existing ? `Update “${existing.name}”` : "Create link"}
              </button>

              {link && (
                <div className="mt-4 flex gap-2">
                  <label htmlFor="share-link" className="sr-only">Share link</label>
                  <input id="share-link" readOnly value={link} onFocus={(e) => e.target.select()} className="input flex-1 text-xs" />
                  <button onClick={() => copy(link)} className="btn-secondary">
                    <Copy className="h-4 w-4" aria-hidden />
                    Copy
                  </button>
                </div>
              )}

              {mine && mine.length > 0 && (
                <section className="mt-6 border-t border-border pt-4" aria-labelledby="my-shares">
                  <h3 id="my-shares" className="eyebrow">Your shared libraries</h3>
                  <ul className="mt-2 divide-y divide-border">
                    {mine.map((s) => (
                      <li key={s.id} className="flex flex-wrap items-center gap-2 py-2">
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium">{s.name}</p>
                          <p className="text-xs text-subtle">
                            {s.papers.length} papers · updated{" "}
                            {new Date(s.updatedAt).toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" })}
                          </p>
                        </div>
                        <button onClick={() => copy(shareUrl(s.id))} className="btn-ghost btn-sm" aria-label={`Copy link to ${s.name}`}>
                          <Copy className="h-3.5 w-3.5" aria-hidden />
                          Link
                        </button>
                        <a href={`/shared/${s.id}`} target="_blank" rel="noopener noreferrer" className="btn-ghost btn-sm" aria-label={`Open ${s.name}`}>
                          <ExternalLink className="h-3.5 w-3.5" aria-hidden />
                          Open
                        </a>
                        <button onClick={() => stop(s)} className="btn-ghost btn-sm !text-danger" aria-label={`Stop sharing ${s.name}`}>
                          <Trash2 className="h-3.5 w-3.5" aria-hidden />
                          Stop
                        </button>
                      </li>
                    ))}
                  </ul>
                </section>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
