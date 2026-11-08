"use client";

import { Suspense, useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";

/**
 * Firebase Analytics' automatic page_view only fires on a real page load.
 * This app navigates client-side (App Router), so every route change
 * (including the first) is logged here instead. getFirebaseAnalytics()
 * returns null until the isSupported() check in lib/firebase.ts resolves, or
 * forever if unsupported (private browsing, a blocker) — logEvent is skipped
 * either way.
 */
function PageViews() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    let cancelled = false;
    // Analytics is optional and is only needed after the page is interactive,
    // so Firebase is imported here rather than in the root bundle.
    void (async () => {
      try {
        const [{ getFirebaseAnalytics }, { logEvent }] = await Promise.all([
          import("@/lib/firebase"),
          import("firebase/analytics"),
        ]);
        const analytics = getFirebaseAnalytics();
        if (!analytics || cancelled) return;
        // Never send the query string: a search URL contains the student's
        // research topic. Only the route and page title are logged.
        logEvent(analytics, "page_view", {
          page_path: pathname,
          page_location: `${window.location.origin}${pathname}`,
          page_title: document.title,
        });
      } catch {
        // Analytics blocked or unsupported: the app works normally.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [pathname, searchParams]);

  return null;
}

export function FirebaseAnalytics() {
  return (
    <Suspense fallback={null}>
      <PageViews />
    </Suspense>
  );
}
