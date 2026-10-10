"use client";

import { useEffect } from "react";

/**
 * Registers public/sw.js so the installed app opens offline. Production only:
 * a service worker in development would serve stale pages between edits.
 */
export function ServiceWorker() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js").catch(() => {
      // Not supported here (private mode, some in-app browsers): the site works without it.
    });
  }, []);
  return null;
}
