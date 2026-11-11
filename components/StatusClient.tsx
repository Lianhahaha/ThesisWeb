"use client";

import { useCallback, useEffect, useState } from "react";
import { sourceLabel } from "@/lib/sources/meta";

interface Health {
  status: string;
  time: string;
  sources: number;
  configured: Record<string, boolean>;
  reachable?: Record<string, boolean>;
}

interface SourceHealth {
  id: string;
  status: "working" | "empty" | "unavailable" | "failed" | "skipped" | "not-run";
  count?: number;
  detail?: string;
}

interface HealthReport {
  checkedAt: string | null;
  results: SourceHealth[];
}

const STATUS_LABEL: Record<SourceHealth["status"], string> = {
  working: "working",
  empty: "no results",
  unavailable: "unavailable",
  failed: "failed",
  skipped: "not configured",
  "not-run": "not checked",
};

const STATUS_WEIGHT: Record<SourceHealth["status"], number> = {
  failed: 0,
  unavailable: 1,
  empty: 2,
  "not-run": 3,
  skipped: 4,
  working: 5,
};

const LABELS: Record<string, string> = {
  openalex: "OpenAlex key",
  semanticScholar: "Semantic Scholar key",
  googleBooks: "Google Books key",
  core: "CORE key",
  ieee: "IEEE Xplore key",
  cinii: "CiNii Application ID",
  unpaywall: "Unpaywall email",
  appCheck: "App Check",
  redis: "Shared rate limits (Redis)",
};

export function StatusClient() {
  const [health, setHealth] = useState<Health | null>(null);
  const [report, setReport] = useState<HealthReport | null>(null);
  const [failed, setFailed] = useState(false);
  const [checking, setChecking] = useState(false);

  const check = useCallback(async () => {
    setChecking(true);
    try {
      const [res, reportRes] = await Promise.all([
        fetch("/api/health", { cache: "no-store" }),
        fetch("/source-health.json", { cache: "no-store" }),
      ]);
      if (!res.ok) throw new Error("health check failed");
      setHealth((await res.json()) as Health);
      if (reportRes.ok) setReport((await reportRes.json()) as HealthReport);
      setFailed(false);
    } catch {
      setFailed(true);
    } finally {
      setChecking(false);
    }
  }, []);

  useEffect(() => {
    check();
    const timer = setInterval(check, 60_000);
    return () => clearInterval(timer);
  }, [check]);

  if (failed) {
    return (
      <div className="panel mt-6">
        <p className="font-semibold text-danger">The app is not responding to health checks.</p>
        <p className="mt-1 text-sm text-muted">Try again in a moment, or check Vercel’s deployment status.</p>
        <button onClick={check} disabled={checking} className="btn-secondary btn-sm mt-4">
          {checking ? "Checking…" : "Check again"}
        </button>
      </div>
    );
  }

  if (!health) {
    return <p role="status" className="mt-6 text-muted">Checking the service…</p>;
  }

  // The daily report is a snapshot; it can predate sources added since it ran.
  const covered = report?.results.length ?? 0;
  const missing = Math.max(0, health.sources - covered);
  // "empty" still means the database answered; it just had nothing for the probe topic.
  const answering = report
    ? report.results.filter((r) => r.status === "working" || r.status === "empty").length
    : null;
  const failing = report
    ? report.results.filter((r) => r.status === "unavailable" || r.status === "failed").length
    : 0;

  return (
    <div className="panel mt-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="font-semibold text-ok">Operational</p>
        <button onClick={check} disabled={checking} className="btn-ghost btn-sm">
          {checking ? "Checking…" : "Check again"}
        </button>
      </div>
      <p className="mt-1 text-sm text-muted">
        {health.sources} databases configured
        {answering != null ? ` · ${answering} answered today's check` : ""}. Checked{" "}
        {new Date(health.time).toLocaleString("en-PH")}.
      </p>
      <dl className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
        {Object.entries(health.configured).map(([key, ok]) => {
          const unreachable = ok && key === "redis" && health.reachable?.redis === false;
          return (
            <div key={key} className="flex items-center justify-between gap-3 border-b border-border pb-1">
              <dt className="text-muted">{LABELS[key] ?? key}</dt>
              <dd className={unreachable ? "text-danger" : ok ? "text-ok" : "text-subtle"}>
                {unreachable ? "unreachable" : ok ? "configured" : "not configured"}
              </dd>
            </div>
          );
        })}
      </dl>
      <p className="mt-4 text-xs text-subtle">
        Individual databases are checked daily by GitHub Actions. A missing key means that source
        is skipped or falls back to its anonymous limit; the rest of the app still works.
      </p>

      <section className="mt-6 border-t border-border pt-4" aria-labelledby="db-health-h">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 id="db-health-h" className="font-semibold">Database health</h2>
          <span className="text-xs text-subtle">
            {report?.checkedAt
              ? `Last checked ${new Date(report.checkedAt).toLocaleString("en-PH")}`
              : "No daily report yet"}
          </span>
        </div>

        {!report?.checkedAt || report.results.length === 0 ? (
          <p className="mt-2 text-sm text-muted">
            The first automated check will appear after the next scheduled run.
          </p>
        ) : (
          <>
            <p className="mt-1 text-sm text-muted">
              {answering ?? 0} answering, {failing} unavailable,{" "}
              {report.results.filter((r) => r.status === "skipped").length} not tested here
              {covered > 0 && covered !== health.sources ? ` — report covers ${covered} of ${health.sources} databases` : ""}.
            </p>
            <p className="mt-1 text-xs text-subtle">
              &ldquo;Not tested here&rdquo; means the checker has no key for that source, not that this
              deployment cannot use it. The keys panel above is what the app is running with; IEEE
              Xplore is only listed as unavailable when its own key is rejected.
            </p>
            {missing > 0 && (
              <p className="mt-1 text-xs text-subtle">
                This report predates the newest {missing} source{missing === 1 ? "" : "s"}. Searches already use all{" "}
                {health.sources}; the next daily check will include them.
              </p>
            )}
            <ul className="mt-3 grid gap-1.5 text-sm sm:grid-cols-2">
              {[...report.results]
                .sort((a, b) => STATUS_WEIGHT[a.status] - STATUS_WEIGHT[b.status])
                .map((item) => (
                  <li
                    key={item.id}
                    className="flex items-center justify-between gap-3 border-b border-border pb-1"
                    title={item.detail}
                  >
                    <span className="truncate text-muted">{sourceLabel(item.id)}</span>
                    <span className="flex shrink-0 items-center gap-1.5">
                      <span aria-hidden className="text-subtle">|</span>
                      <span
                        className={
                          item.status === "working"
                            ? "text-ok"
                            : item.status === "failed" || item.status === "unavailable"
                            ? "text-danger"
                            : "text-subtle"
                        }
                      >
                        {STATUS_LABEL[item.status]}
                        {item.status === "working" && item.count != null ? ` (${item.count})` : ""}
                      </span>
                    </span>
                  </li>
                ))}
            </ul>
          </>
        )}
      </section>
    </div>
  );
}
