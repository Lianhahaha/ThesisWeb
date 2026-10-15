import { AsyncLocalStorage } from "node:async_hooks";

/**
 * HTTP helpers for the server: the API routes and the database adapters.
 * Server only (node:async_hooks), so they live apart from lib/utils.ts,
 * which the browser also loads.
 */

/**
 * The abort signal of the search source being run, if any. metaSearch runs
 * each adapter inside withAbortSignal(); every fetchWithTimeout and sleep
 * underneath picks the signal up from here, so when a source passes its
 * deadline its requests and retry waits stop too, instead of running on in
 * the background and using up the function's time and the API's rate limit.
 * Adapters don't need to pass anything along.
 */
const currentSignal = new AsyncLocalStorage<AbortSignal>();

/** Run `fn` so that all its requests and waits stop when `signal` aborts. */
export function withAbortSignal<T>(signal: AbortSignal, fn: () => Promise<T>): Promise<T> {
  return currentSignal.run(signal, fn);
}

/**
 * Fetch with a timeout — external academic APIs can hang.
 * Aborts and throws after `ms`, so the meta-search can fall back to other
 * sources. The limit covers reading the body as well as the headers: a
 * server that sends headers quickly and then trickles the body is cut off too.
 * Also stops when the current source's deadline passes (withAbortSignal).
 */
export async function fetchWithTimeout(
  url: string,
  options: RequestInit = {},
  ms = 8000
): Promise<Response> {
  const signals = [AbortSignal.timeout(ms), options.signal, currentSignal.getStore()].filter(
    (s): s is AbortSignal => !!s
  );
  return fetch(url, { ...options, signal: signals.length === 1 ? signals[0] : AbortSignal.any(signals) });
}

/** Promise that resolves after `ms` milliseconds, or rejects when the current source's deadline passes. */
export function sleep(ms: number): Promise<void> {
  const signal = currentSignal.getStore();
  return new Promise((resolve, reject) => {
    if (signal?.aborted) return reject(signal.reason);
    const onAbort = () => {
      clearTimeout(timer);
      reject(signal?.reason);
    };
    const timer = setTimeout(() => {
      signal?.removeEventListener("abort", onAbort);
      resolve();
    }, ms);
    signal?.addEventListener("abort", onAbort, { once: true });
  });
}

/** When each paced API may next be called, by name. Per server instance. */
const nextSlot = new Map<string, number>();

/**
 * Wait for `api`'s next free slot, `gapMs` after the previous call, so
 * concurrent searches queue for a rate-limited API (NCBI, Semantic Scholar,
 * arXiv) instead of being refused. The slot is taken before waiting, so
 * callers line up in order; a source past its deadline stops waiting (sleep).
 */
export async function waitTurn(api: string, gapMs: number): Promise<void> {
  const now = Date.now();
  const slot = Math.max(now, (nextSlot.get(api) ?? 0) + gapMs);
  nextSlot.set(api, slot);
  if (slot > now) await sleep(slot - now);
}

/** Error for a failed call to an outside service, worded for the person using the app. */
export function upstreamError(service: string, status: number): Error {
  return new Error(
    status === 429 || status === 503
      ? `${service} is busy right now. Try again in a minute.`
      : `${service} answered with an error (HTTP ${status}). Try again later.`
  );
}

/**
 * The JSON body of a response. Throws when the body isn't JSON: a database
 * that answers with a captcha, a block page or a maintenance notice must show
 * as failed (with the reason), not as "no results". `whenEmpty` is returned
 * for a blank body, for an API that answers "no matches" with nothing at all.
 */
export async function readJson<T = unknown>(res: Response, whenEmpty?: T): Promise<T> {
  const text = await res.text();
  if (!text.trim()) {
    if (whenEmpty !== undefined) return whenEmpty;
    throw new Error("sent an empty answer");
  }
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error(
      /^\s*</.test(text) ? "sent a web page instead of data (blocked or down)" : "sent data that could not be read"
    );
  }
}
