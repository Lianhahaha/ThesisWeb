import { describe, expect, it } from "vitest";
import { clearAttempts, recordAttempt, retryAfterSeconds, waitMessage } from "@/lib/auth/throttle";

/** Unique keys keep the in-memory store out of the way of other tests. */
const key = (name: string) => `test:${name}:${Math.random().toString(36).slice(2)}`;

describe("auth throttle", () => {
  it("lets three attempts through, then asks for ten seconds", () => {
    const k = key("basic");
    const t = 1_000_000;
    expect(recordAttempt(k, t)).toBe(0);
    expect(recordAttempt(k, t + 1000)).toBe(0);
    expect(recordAttempt(k, t + 2000)).toBe(0);
    expect(recordAttempt(k, t + 3000)).toBe(10);
    expect(retryAfterSeconds(k, t + 3000)).toBe(10);
    expect(retryAfterSeconds(k, t + 8000)).toBe(5);
    expect(retryAfterSeconds(k, t + 13_000)).toBe(0);
  });

  it("escalates to a five-minute cap", () => {
    const k = key("escalate");
    let t = 2_000_000;
    expect(recordAttempt(k, (t += 1000))).toBe(0);
    expect(recordAttempt(k, (t += 1000))).toBe(0);
    expect(recordAttempt(k, (t += 1000))).toBe(0);
    expect(recordAttempt(k, (t += 1000))).toBe(10);
    expect(recordAttempt(k, (t += 1000))).toBe(30);
    expect(recordAttempt(k, (t += 1000))).toBe(60);
    expect(recordAttempt(k, (t += 1000))).toBe(300);
    expect(recordAttempt(k, (t += 1000))).toBe(300);
    expect(retryAfterSeconds(k, t)).toBe(300);
  });

  it("forgets a key after a successful sign-in", () => {
    const k = key("clear");
    const t = 3_000_000;
    for (let i = 0; i < 4; i++) recordAttempt(k, t);
    expect(retryAfterSeconds(k, t)).toBeGreaterThan(0);
    clearAttempts(k);
    expect(retryAfterSeconds(k, t)).toBe(0);
    expect(recordAttempt(k, t)).toBe(0);
  });

  it("counts each address separately", () => {
    const a = key("a");
    const b = key("b");
    const t = 4_000_000;
    for (let i = 0; i < 4; i++) recordAttempt(a, t);
    expect(retryAfterSeconds(a, t)).toBeGreaterThan(0);
    expect(retryAfterSeconds(b, t)).toBe(0);
    expect(recordAttempt(b, t)).toBe(0);
  });

  it("starts from zero once the key has been idle for a while", () => {
    const k = key("idle");
    const t = 5_000_000;
    for (let i = 0; i < 4; i++) recordAttempt(k, t);
    expect(retryAfterSeconds(k, t + 16 * 60_000)).toBe(0);
  });

  it("words the wait for the toast", () => {
    expect(waitMessage(1)).toBe("1 second");
    expect(waitMessage(30)).toBe("30 seconds");
  });
});
