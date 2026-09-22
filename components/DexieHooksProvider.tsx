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
  // Check the error first: on failure `ready` stays false, so testing `ready`
  // first would return null forever and the warning would never render.
  if (error) {
    return (
      <div role="alert" className="notice notice-info m-4">
        <strong>Browser storage is unavailable.</strong>{" "}
        Saving papers will not work. Turn off
        private browsing or allow site data, then reload. ({error})
      </div>
    );
  }
  if (!ready) return null;
  return <>{children}</>;
}
