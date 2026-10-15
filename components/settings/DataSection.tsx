"use client";

import { useEffect, useRef, useState } from "react";
import { Download, Upload } from "lucide-react";
import type { User } from "firebase/auth";
import { toast } from "@/components/Toaster";
import { Section } from "@/components/settings/parts";
import { allPapers, localPapers, moveLocalPapersToAccount, savePapers } from "@/lib/library/store";
import { parseBackup } from "@/lib/library/backup";
import { clearSearchHistory } from "@/lib/search/history";
import { downloadFile } from "@/lib/download";

/** Library backup and import, papers left in this browser, and search history. Works signed in or out. */
export function DataSection({ user }: { user: User | null }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [browserCount, setBrowserCount] = useState(0);
  useEffect(() => {
    localPapers().then((p) => setBrowserCount(p.length)).catch(() => setBrowserCount(0));
  }, []);

  async function downloadBackup() {
    try {
      const papers = await allPapers();
      downloadFile(
        JSON.stringify({ app: "Thesisweb", exportedAt: new Date().toISOString(), papers }, null, 2),
        `thesisweb-library-${new Date().toISOString().slice(0, 10)}.json`,
        "application/json"
      );
      toast(`Backup of ${papers.length} papers downloaded`, "success");
    } catch {
      toast("Could not read your library.", "error");
    }
  }

  async function importBackup(file: File) {
    setBusy(true);
    try {
      if (file.size > 20 * 1024 * 1024) throw new Error("That file is too large to be a library backup.");
      const papers = parseBackup(JSON.parse(await file.text()));
      if (papers.length === 0) throw new Error("No papers found in this file.");
      const saved = await savePapers(papers);
      if (saved < papers.length) {
        toast(`Imported ${saved} of ${papers.length} papers. The rest could not be saved.`, "error");
      } else {
        toast(`Imported ${saved} papers into your library`, "success");
      }
    } catch (err) {
      toast(err instanceof SyntaxError ? "This file isn't valid JSON." : err instanceof Error ? err.message : "Import failed", "error");
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function copyBrowserPapers() {
    setBusy(true);
    try {
      const moved = await moveLocalPapersToAccount();
      const left = browserCount - moved;
      setBrowserCount(Math.max(0, left));
      toast(
        left > 0
          ? `Copied ${moved} papers. ${left} could not be copied and are still in this browser.`
          : `Copied ${moved} papers to your account`,
        left > 0 ? "error" : "success"
      );
    } catch {
      toast("Could not copy the papers. Try again.", "error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Section title="Your data" description={user ? "Your library is stored in your account." : "Your library is stored in this browser only."}>
      <div className="space-y-4">
        <div className="flex flex-wrap gap-2">
          <button onClick={downloadBackup} className="btn-secondary btn-sm">
            <Download className="h-3.5 w-3.5" aria-hidden />
            Download library backup
          </button>
          <button onClick={() => fileRef.current?.click()} disabled={busy} className="btn-secondary btn-sm">
            <Upload className="h-3.5 w-3.5" aria-hidden />
            {busy ? "Working…" : "Import backup"}
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) importBackup(f);
            }}
          />
        </div>
        <p className="field-hint !mt-0">
          A backup is a .json file with every saved paper, its notes, collection and synthesis matrix.
          Importing adds to your library; papers already in it are updated.
        </p>

        {user && browserCount > 0 && (
          <div className="notice notice-info">
            <p>
              This browser also has <strong>{browserCount}</strong> paper{browserCount === 1 ? "" : "s"} you saved
              while signed out.
            </p>
            <button onClick={copyBrowserPapers} disabled={busy} className="btn-secondary btn-sm mt-3">
              Copy them to my account
            </button>
          </div>
        )}

        <button
          onClick={() => { clearSearchHistory(); toast("Search history cleared", "info"); }}
          className="btn-ghost btn-sm -ml-2.5"
        >
          Clear search history
        </button>
      </div>
    </Section>
  );
}
