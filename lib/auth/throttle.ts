/**
 * Progressive cooldown for repeated sign-in and reset attempts in this browser.
 *
 * Firebase enforces its own limits per account and per IP, so this is only the
 * first line: it stops the page from sending the next attempt at all, which
 * keeps a stuck key or a naive script from burning the project's email/auth
 * quota and from tripping Firebase's much longer cooldown. It is per browser:
 * someone calling the Auth API directly bypasses it, and App Check plus
 * Firestore rules are what guard that side.
 *
 * sessionStorage keeps the count across a reload of the tab but not across a
 * new browser session, so a shared school computer doesn't lock the next
 * person out. Without storage (private mode, server render) it counts in
 * memory for the life of the page.
 */

const STORAGE_KEY = "tw:auth:cooldown:v1";

/** Most entries kept, newest kept when the list grows. */
const MAX_ENTRIES = 6;
/** A key idle this long starts from zero again. */
const FORGET_MS = 15 * 60_000;
/** Never count past this: the last delay repeats. */
const MAX_ATTEMPTS = 12;

/** Delay after the Nth attempt in the window; the last entry repeats. */
const DELAYS_MS = [0, 0, 0, 10_000, 30_000, 60_000, 300_000];
interface Entry {
  attempts: number;
  /** Epoch ms before which the next attempt is refused; 0 when nothing is pending. */
  until: number;
  /** When the last attempt was counted, for the idle reset. */
  last: number;
}

type State = Record<string, Entry>;

const memory: State = {};

function storage(): Storage | null {
  try {
    return typeof sessionStorage === "undefined" ? null : sessionStorage;
  } catch {
    // Storage can throw when cookies are blocked outright.
    return null;
  }
}

function read(now: number): State {
  let state: State = {};
  const store = storage();
  if (store) {
    try {
      const raw = JSON.parse(store.getItem(STORAGE_KEY) ?? "{}") as unknown;
      if (raw && typeof raw === "object") state = raw as State;
    } catch {
      state = {};
    }
  } else {
    Object.assign(state, memory);
  }
  for (const [key, entry] of Object.entries(state)) {
    if (!entry || typeof entry.last !== "number" || now - entry.last > FORGET_MS) delete state[key];
  }
  return state;
}

function write(state: State): void {
  const keys = Object.keys(state);
  if (keys.length > MAX_ENTRIES) {
    keys
      .sort((a, b) => state[b].last - state[a].last)
      .slice(MAX_ENTRIES)
      .forEach((key) => delete state[key]);
  }
  const store = storage();
  if (!store) {
    for (const key of Object.keys(memory)) delete memory[key];
    Object.assign(memory, state);
    return;
  }
  try {
    store.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Quota or a blocked store: the in-memory copy still applies this page.
    Object.assign(memory, state);
  }
}

/** Seconds the caller must wait before trying `key` again, or 0. */
export function retryAfterSeconds(key: string, now = Date.now()): number {
  const entry = read(now)[key];
  if (!entry || entry.until <= now) return 0;
  return Math.ceil((entry.until - now) / 1000);
}

/** Count one attempt, and return the seconds it now imposes (0 when still allowed). */
export function recordAttempt(key: string, now = Date.now()): number {
  const state = read(now);
  const attempts = Math.min((state[key]?.attempts ?? 0) + 1, MAX_ATTEMPTS);
  const delay = DELAYS_MS[Math.min(attempts, DELAYS_MS.length) - 1];
  state[key] = { attempts, until: delay ? now + delay : 0, last: now };
  write(state);
  return delay ? Math.ceil(delay / 1000) : 0;
}

/** Forget a key, for a successful sign-in. */
export function clearAttempts(key: string): void {
  const state = read(Date.now());
  delete state[key];
  write(state);
}

/** "1 second" / "12 seconds", for the toast. */
export function waitMessage(seconds: number): string {
  return `${seconds} second${seconds === 1 ? "" : "s"}`;
}
