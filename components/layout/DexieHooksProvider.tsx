"use client";

import { useEffect, useState } from "react";

/**
 * Dexie only exists in the browser (IndexedDB). We gate rendering of children
 * until the DB is reachable so any `useLiveQuery` hooks in the tree mount
 * against an initialized DB rather than throwing during SSR.
 */
export function DexieHooksProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let cancelled = false;
    // Imported on demand: the store also imports the Firebase-backed cloud
    // path, and the header is on every page, so this keeps that chunk out of
    // the first bundle until the browser is ready to use it.
    void import("@/lib/library/store")
      .then(({ getDb }) => {
        getDb();
        if (!cancelled) setReady(true);
      })
      .catch((e: unknown) => {
        console.error("Failed to initialize IndexedDB:", e);
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed to initialize local database");
        // Don't set ready=true — children won't mount, preventing silent useLiveQuery failures
      });
    return () => {
      cancelled = true;
    };
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
