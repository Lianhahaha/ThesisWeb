/**
 * Small load probe for /api/search.
 *
 * Usage:
 *   node scripts/load-test.mjs [baseUrl] [concurrency] [requests] [query]
 *
 * Defaults: http://localhost:3002 5 25 "climate change"
 *
 * It hits the real databases, so run it against a local server and a query
 * that is safe to spend quota on. Never run it against production without
 * expecting rate limits and API-key usage.
 */
const base = (process.argv[2] || "http://localhost:3002").replace(/\/$/, "");
const concurrency = Number(process.argv[3] || 5);
const requests = Number(process.argv[4] || 25);
const query = process.argv[5] || "climate change";

const url = `${base}/api/search?q=${encodeURIComponent(query)}&from=2024&stream=1`;
const times = [];
const statuses = new Map();

let next = 0;
async function worker() {
  while (next < requests) {
    next++;
    const started = Date.now();
    try {
      const res = await fetch(url);
      statuses.set(res.status, (statuses.get(res.status) ?? 0) + 1);
      // Read the stream so the server can finish the search.
      await res.text();
    } catch {
      statuses.set("network", (statuses.get("network") ?? 0) + 1);
    }
    times.push(Date.now() - started);
  }
}

const started = Date.now();
await Promise.all(Array.from({ length: concurrency }, worker));
times.sort((a, b) => a - b);

const pct = (p) => times[Math.min(times.length - 1, Math.floor(times.length * p))] ?? 0;
console.log({
  url,
  requests,
  concurrency,
  wallMs: Date.now() - started,
  status: Object.fromEntries(statuses),
  latencyMs: {
    min: times[0] ?? 0,
    p50: pct(0.5),
    p95: pct(0.95),
    max: times.at(-1) ?? 0,
  },
});
