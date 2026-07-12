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
  useEffect(() => {
    try {
      getDb();
      setReady(true);
    } catch {
      // Shouldn't happen in a browser, but guard anyway.
      setReady(true);
    }
  }, []);
  if (!ready) return null;
  return <>{children}</>;
}
