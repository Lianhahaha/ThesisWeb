import * as Sentry from "@sentry/nextjs";

/**
 * Error reporting for the server and the edge runtime.
 *
 * Off unless SENTRY_DSN is set, so local runs and previews without a Sentry
 * project pay nothing (no network calls, no warnings). Once the DSN exists,
 * every unhandled error in a route or page is captured with the request path.
 */
const dsn = process.env.SENTRY_DSN?.trim();

if (dsn) {
  Sentry.init({
    dsn,
    // Search fans out to ~118 databases; a sample of slow requests is enough
    // to find the slow ones without paying for every trace.
    // Error monitoring only: the Performance product is off, so a sampled
    // transaction here would be discarded on arrival. Raise this (and enable
    // Tracing in Sentry) to get timings.
    tracesSampleRate: 0,

    // Errors from the rate limiter are expected traffic, not bugs.
    ignoreErrors: [/Too many requests/],
    environment: process.env.VERCEL_ENV ?? process.env.NODE_ENV,
  });
}
