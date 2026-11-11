import * as Sentry from "@sentry/nextjs";

/** Same as sentry.server.config.ts, for the edge runtime Next uses for middleware and static pages. */
const dsn = process.env.SENTRY_DSN?.trim();

if (dsn) {
  Sentry.init({
    dsn,
    tracesSampleRate: 0.1,
    ignoreErrors: [/Too many requests/],
    environment: process.env.VERCEL_ENV ?? process.env.NODE_ENV,
  });
}
