import * as Sentry from "@sentry/nextjs";

/** Same as sentry.server.config.ts, for the edge runtime Next uses for middleware and static pages. */
const dsn = process.env.SENTRY_DSN?.trim();

if (dsn) {
  Sentry.init({
    dsn,
    // Error monitoring only: the Performance product is off, so a sampled
    // transaction here would be discarded on arrival. Raise this (and enable
    // Tracing in Sentry) to get timings.
    tracesSampleRate: 0,

    ignoreErrors: [/Too many requests/],
    environment: process.env.VERCEL_ENV ?? process.env.NODE_ENV,
  });
}
