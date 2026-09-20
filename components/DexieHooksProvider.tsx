"use client";

import { useEffect, useState } from "react";
import { getDb } from "@/lib/db";

/**
 * Dexie only exists in the browser (IndexedDB). We gate rendering of children
 * until the DB is reachable so any `useLiveQuery` hooks in the tree mount
 * against an initialized DB rather than throwing during SSR.
 */
export function DexieHooksProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    try {
      getDb();
      setReady(true);
    } catch (e) {
      console.error("Failed to initialize IndexedDB:", e);
      setError(e instanceof Error ? e.message : "Failed to initialize local database");
      // Don't set ready=true — children won't mount, preventing silent useLiveQuery failures
    }
  }, []);
  if (!ready) return null;
  if (error) {
    return (
      <div className="p-4 text-sm text-amber-600 bg-amber-50 dark:bg-amber-950/30 dark:text-amber-400 rounded-lg m-4">
        <strong>Warning:</strong> Local storage unavailable. Library features may not work. {error}
      </div>
    );
  }
  return <>{children}</>;
}
