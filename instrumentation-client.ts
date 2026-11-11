import type * as SentrySdk from "@sentry/nextjs";

/**
 * Browser-side reporting. Needs the public DSN (it is shipped to the browser,
 * which is fine: a DSN only allows submitting events, not reading them).
 *
 * The SDK is imported only when a DSN exists: without one it was still a
 * ~450 KB chunk downloaded by every visitor for nothing.
 */
const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN?.trim();

if (dsn) {
  void import("@sentry/nextjs").then((Sentry: typeof SentrySdk) => {
    Sentry.init({
      dsn,
    // Error monitoring only: the Performance product is off, so a sampled
    // transaction here would be discarded on arrival. Raise this (and enable
    // Tracing in Sentry) to get timings.
    tracesSampleRate: 0,

      // The ad blockers and in-app browsers some students use fail requests all
      // day; those are noise, not bugs.
      ignoreErrors: [/Too many requests/, /Failed to fetch/, /NetworkError/],
    });
  });
}
