"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { toast } from "@/components/Toaster";
import type { AiCheckResult, FlaggedWord } from "@/lib/ai-detector";

const MIN_CHARS = 80;

const BANDS = {
  high: {
    heading: "Reads as likely AI-generated",
    toast: "Reads as likely AI. See the fixes below.",
    color: "rgb(var(--danger))",
  },
  moderate: {
    heading: "Some AI-like patterns found",
    toast: "A few AI-like patterns. Small edits will help.",
    color: "rgb(var(--accent))",
  },
  low: {
    heading: "Reads as human-written",
    toast: "Reads naturally. Low AI-likeness.",
    color: "rgb(var(--ok))",
  },
} as const;

export default function AiCheckPage() {
  const [text, setText] = useState("");
  const [result, setResult] = useState<AiCheckResult | null>(null);

  const check = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/ai-check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Check failed" }));
        throw new Error(err.error || "Check failed");
      }
      return (await res.json()) as AiCheckResult;
    },
    onSuccess: (data) => {
      setResult(data);
      toast(
        BANDS[data.band].toast,
        data.band === "high" ? "error" : data.band === "moderate" ? "info" : "success"
      );
    },
    onError: (e: Error) => toast(e.message, "error"),
  });

  const words = text.trim().split(/\s+/).filter(Boolean).length;
  const canCheck = text.trim().length >= MIN_CHARS && !check.isPending;

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (canCheck) check.mutate();
  }

  return (
    <div className="mx-auto max-w-3xl">
      <header className="mb-6">
        <p className="overline">Before you submit</p>
        <h1 className="display mt-3 text-3xl sm:text-4xl">AI self-check</h1>
        <p className="mt-2 text-muted">
          Paste a paragraph of your thesis. ThesisWeb names the writing patterns that make text read
          as AI-generated, and what to change.
        </p>
      </header>

      <p className="notice notice-info mb-5">
        <strong>A writing coach, not an evasion tool.</strong>{" "}
        This measures writing style with
        fixed rules. It is not a trained classifier and cannot predict what Turnitin or your
        school&apos;s tool will report. Use it on your own writing, not to disguise AI text.
      </p>

      {!result ? (
        <form onSubmit={onSubmit} className="panel">
          <label htmlFor="text" className="field-label">Your text</label>
          <textarea
            id="text"
            autoFocus
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Paste at least one full paragraph."
            rows={10}
            className="input prose-serif resize-y"
          />
          <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
            <span className="text-sm text-muted" aria-live="polite">
              {words} {words === 1 ? "word" : "words"}
              {text.trim().length > 0 && text.trim().length < MIN_CHARS &&
                ` · ${MIN_CHARS - text.trim().length} more characters needed`}
            </span>
            <button type="submit" disabled={!canCheck} className="btn-primary">
              {check.isPending ? "Checking…" : "Check text"}
            </button>
          </div>
        </form>
      ) : (
        <section className="panel" aria-label="Your text with flagged words">
          <p className="prose-serif whitespace-pre-wrap">
            <HighlightedText text={text} flagged={result.flaggedWords} />
          </p>

          {result.flaggedWords.length > 0 && (
            <p className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-border pt-3 text-sm text-muted">
              <span>Highlights:</span>
              <Legend kind="ai-vocab">AI-typical word</Legend>
              <Legend kind="transition">transition</Legend>
              <Legend kind="opener">stock opener</Legend>
            </p>
          )}

          <div className="mt-4 flex flex-wrap gap-2 border-t border-border pt-3">
            <button onClick={() => setResult(null)} className="btn-secondary btn-sm">
              Edit this text
            </button>
            <button
              onClick={() => { setResult(null); setText(""); }}
              className="btn-ghost btn-sm"
            >
              Check different text
            </button>
          </div>
        </section>
      )}

      {result && (
        <div className="mt-5 space-y-5">
          <section className="panel" aria-labelledby="score">
            <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
              <p className="text-5xl font-bold tabular-nums" style={{ color: BANDS[result.band].color }}>
                {result.aiLikelihood}
                <span className="text-lg font-medium text-muted"> / 100</span>
              </p>
              <h2 id="score" className="text-lg">{BANDS[result.band].heading}</h2>
            </div>
            <p className="mt-2 text-sm text-muted">
              From {result.stats.words} words across {result.stats.sentences} sentences. Higher means
              more AI-like.
            </p>

            <dl className="mt-6 grid gap-x-8 gap-y-5 sm:grid-cols-2">
              <Signal
                label="Sentence length uniformity"
                value={result.signals.burstiness}
                hint="AI writes sentences of similar length. Mix short and long ones."
              />
              <Signal
                label="Vocabulary repetition"
                value={result.signals.lexicalRichness}
                hint="AI reuses the same words. Vary your wording."
              />
              <Signal
                label="Transition-word density"
                value={result.signals.transitionDensity}
                hint="“Moreover”, “furthermore” and “however” are overused by AI."
              />
              <Signal
                label="Formulaic openers"
                value={result.signals.formulaicDensity}
                hint="Openers like “This shows that…” read as templated."
              />
              <Signal
                label="AI-typical vocabulary"
                value={result.signals.aiVocab}
                hint="Words AI uses far more than people, such as “delve” or “tapestry”."
              />
              <Signal
                label="Predictability"
                value={result.signals.predictability}
                hint="Very common word pairs make writing generic."
              />
            </dl>
          </section>

          <section className="panel" aria-labelledby="fixes">
            {result.issues.length > 0 ? (
              <>
                <h2 id="fixes" className="text-lg">What to fix ({result.issues.length})</h2>
                <ul className="mt-4 space-y-5">
                  {result.issues.map((issue, i) => (
                    <li key={i}>
                      <p className="flex flex-wrap items-baseline gap-2">
                        <span
                          className="chip"
                          style={
                            issue.severity === "high"
                              ? {
                                  color: "rgb(var(--danger))",
                                  borderColor: "rgb(var(--danger) / 0.45)",
                                  backgroundColor: "rgb(var(--danger-d))",
                                }
                              : issue.severity === "warn"
                              ? {
                                  color: "rgb(var(--accent))",
                                  borderColor: "rgb(var(--accent) / 0.45)",
                                  backgroundColor: "rgb(var(--accent-d))",
                                }
                              : undefined
                          }
                        >
                          {issue.severity === "high" ? "Important" : issue.severity === "warn" ? "Worth fixing" : "Tip"}
                        </span>
                        <span className="flex-1">{issue.message}</span>
                      </p>
                      {issue.excerpt && (
                        <p className="prose-serif mt-2 border-l-2 border-border2 pl-3 text-sm italic text-muted">
                          {issue.excerpt}
                        </p>
                      )}
                      {issue.suggestion && (
                        <p className="mt-2 text-sm">
                          <strong>Try:</strong> {issue.suggestion}
                        </p>
                      )}
                    </li>
                  ))}
                </ul>
              </>
            ) : (
              <>
                <h2 id="fixes" className="text-lg">No major issues found</h2>
                <p className="mt-2 text-muted">
                  Your sentence lengths vary, your transitions read naturally, and you avoid stock
                  openers.
                </p>
              </>
            )}
          </section>

          <section className="panel" aria-labelledby="stats">
            <h2 id="stats" className="text-lg">Text statistics</h2>
            <dl className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
              <Stat label="Average sentence" value={`${result.stats.avgSentenceLen.toFixed(1)} words`} />
              <Stat label="Length variation" value={`±${result.stats.sentenceLenStd.toFixed(1)} words`} />
              <Stat label="Unique-word ratio" value={result.stats.uniqueWordsRatio.toFixed(2)} />
              <Stat label="Transition phrases" value={String(result.stats.transitionCount)} />
            </dl>
          </section>
        </div>
      )}
    </div>
  );
}

const MARK_STYLES: Record<FlaggedWord["type"], { bg: string; line: string }> = {
  "ai-vocab": { bg: "rgb(var(--danger-d))", line: "rgb(var(--danger))" },
  transition: { bg: "rgb(var(--accent-d))", line: "rgb(var(--accent))" },
  opener: { bg: "rgb(var(--ok-d))", line: "rgb(var(--ok))" },
};

function Legend({ kind, children }: { kind: FlaggedWord["type"]; children: string }) {
  const s = MARK_STYLES[kind];
  return (
    <span
      className="rounded px-1 text-text"
      style={{ backgroundColor: s.bg, boxShadow: `inset 0 -2px 0 ${s.line}` }}
    >
      {children}
    </span>
  );
}

function Signal({ label, value, hint }: { label: string; value: number; hint: string }) {
  const level = value >= 65 ? "High" : value >= 40 ? "Medium" : "Low";
  const color =
    value >= 65 ? "rgb(var(--danger))" : value >= 40 ? "rgb(var(--accent))" : "rgb(var(--ok))";
  return (
    <div>
      <dt className="flex items-baseline justify-between gap-2 text-sm font-medium">
        <span>{label}</span>
        {/* Level is spelled out, so the bar colour is never the only signal. */}
        <span className="tabular-nums text-muted">{level} · {value}</span>
      </dt>
      <dd>
        <div
          className="mt-2 h-2 overflow-hidden rounded-full bg-surface3"
          role="img"
          aria-label={`${label}: ${value} out of 100, ${level}`}
        >
          <div className="h-full" style={{ width: `${Math.max(2, value)}%`, backgroundColor: color }} />
        </div>
        <p className="mt-1.5 text-sm text-muted">{hint}</p>
      </dd>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-sm text-muted">{label}</dt>
      <dd className="font-semibold">{value}</dd>
    </div>
  );
}

/** Wraps every flagged word in a <mark>, colour plus underline. */
function HighlightedText({ text, flagged }: { text: string; flagged: FlaggedWord[] }) {
  const words = [...new Set(flagged.map((f) => f.word))].sort((a, b) => b.length - a.length);
  if (words.length === 0) return <>{text}</>;

  const escaped = words.map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  const parts = text.split(new RegExp(`\\b(${escaped.join("|")})\\b`, "gi"));

  const styleFor = (word: string) => {
    const hit = flagged.find((f) => f.word.toLowerCase() === word.toLowerCase());
    return MARK_STYLES[hit?.type ?? "transition"];
  };

  return (
    <>
      {parts.map((part, i) => {
        // With one capture group, odd indexes are the matched words.
        if (i % 2 === 0) return <span key={i}>{part}</span>;
        const s = styleFor(part);
        return (
          <mark
            key={i}
            className="rounded px-0.5 text-text"
            style={{ backgroundColor: s.bg, boxShadow: `inset 0 -2px 0 ${s.line}` }}
          >
            {part}
          </mark>
        );
      })}
    </>
  );
}
