"use client";

import { Suspense, useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { logEvent } from "firebase/analytics";
import { getFirebaseAnalytics } from "@/lib/firebase";

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
    const analytics = getFirebaseAnalytics();
    if (!analytics) return;
    const query = searchParams.toString();
    logEvent(analytics, "page_view", {
      page_path: query ? `${pathname}?${query}` : pathname,
      page_location: window.location.href,
      page_title: document.title,
    });
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
