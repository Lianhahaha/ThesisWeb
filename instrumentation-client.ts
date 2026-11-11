import * as Sentry from "@sentry/nextjs";

/**
 * Browser-side reporting. Needs the public DSN (it is shipped to the browser,
 * which is fine: a DSN only allows submitting events, not reading them).
 */
const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN?.trim();

if (dsn) {
  Sentry.init({
    dsn,
    tracesSampleRate: 0.1,
    // The ad blockers and in-app browsers some students use fail requests all
    // day; those are noise, not bugs.
    ignoreErrors: [/Too many requests/, /Failed to fetch/, /NetworkError/],
  });
}
