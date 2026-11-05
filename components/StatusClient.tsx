"use client";

import { useCallback, useEffect, useState } from "react";

interface Health {
  status: string;
  time: string;
  sources: number;
  configured: Record<string, boolean>;
}

const LABELS: Record<string, string> = {
  openalex: "OpenAlex key",
  semanticScholar: "Semantic Scholar key",
  core: "CORE key",
  ieee: "IEEE Xplore key",
  cinii: "CiNii Application ID",
  unpaywall: "Unpaywall email",
  appCheck: "App Check",
};

export function StatusClient() {
  const [health, setHealth] = useState<Health | null>(null);
  const [failed, setFailed] = useState(false);
  const [checking, setChecking] = useState(false);

  const check = useCallback(async () => {
    setChecking(true);
    try {
      const res = await fetch("/api/health", { cache: "no-store" });
      if (!res.ok) throw new Error("health check failed");
      setHealth((await res.json()) as Health);
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

  return (
    <div className="panel mt-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="font-semibold text-ok">Operational</p>
        <button onClick={check} disabled={checking} className="btn-ghost btn-sm">
          {checking ? "Checking…" : "Check again"}
        </button>
      </div>
      <p className="mt-1 text-sm text-muted">
        {health.sources} databases configured. Checked {new Date(health.time).toLocaleString("en-PH")}.
      </p>
      <dl className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
        {Object.entries(health.configured).map(([key, ok]) => (
          <div key={key} className="flex items-center justify-between gap-3 border-b border-border pb-1">
            <dt className="text-muted">{LABELS[key] ?? key}</dt>
            <dd className={ok ? "text-ok" : "text-subtle"}>{ok ? "configured" : "not configured"}</dd>
          </div>
        ))}
      </dl>
      <p className="mt-4 text-xs text-subtle">
        Individual databases are checked daily by GitHub Actions. A missing key means that source
        is skipped or falls back to its anonymous limit; the rest of the app still works.
      </p>
    </div>
  );
}
