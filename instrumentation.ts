import * as Sentry from "@sentry/nextjs";

/**
 * Next calls register() once per server runtime at boot, and onRequestError for
 * every unhandled error in a route handler, page or server action. Without this
 * file a 500 in /api/search leaves no trace anywhere.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") await import("./sentry.server.config");
  if (process.env.NEXT_RUNTIME === "edge") await import("./sentry.edge.config");
}

export const onRequestError = Sentry.captureRequestError;
