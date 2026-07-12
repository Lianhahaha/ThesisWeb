"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import {
  Sparkles,
  Loader2,
  Gauge,
  AlertTriangle,
  Lightbulb,
  Activity,
  Type,
  Repeat,
  Wand2,
} from "lucide-react";
import { toast } from "@/components/Toaster";
import type { AiCheckResult, FlaggedWord } from "@/lib/ai-detector";
import { cn } from "@/lib/utils";

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
        data.band === "high"
          ? "This reads as likely AI — see the fixes below."
          : data.band === "moderate"
          ? "A few AI-like patterns — small edits will help."
          : "Reads naturally — low AI-likeness.",
        data.band === "high" ? "error" : data.band === "moderate" ? "info" : "success"
      );
    },
    onError: (e: Error) => toast(e.message, "error"),
  });

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (text.trim().length < 80) return;
    check.mutate();
  }

  return (
    <div className="mx-auto max-w-4xl px-6 py-8">
      <header className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <Sparkles className="h-6 w-6 text-brand-600" />
          AI self-check
        </h1>
        <p className="mt-1 text-sm text-muted">
          Paste a paragraph or section of your thesis. We&apos;ll flag the patterns that make text
          read as AI-generated and suggest concrete edits — so an honest paper doesn&apos;t get
          flagged by a strict detector.
        </p>
      </header>

      {/* Ethical framing banner */}
      <div className="card p-3 mb-4 border-brand-200 dark:border-brand-900 bg-brand-50/50 dark:bg-brand-950/30 text-xs text-muted">
        <strong className="text-text">This is a writing coach, not an evasion tool.</strong> It helps
        you write more authentically. It won&apos;t magically defeat Turnitin — and using it that way
        isn&apos;t what it&apos;s for. The goal is a genuinely human paper that passes honestly.
      </div>

      {/* Input or Highlighted Result */}
      {!result ? (
        <form onSubmit={onSubmit} className="card p-4 mb-4">
          <textarea
            autoFocus
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Paste your text here… (at least 80 characters, ideally a full paragraph)"
            rows={8}
            className="input resize-y font-serif text-sm leading-relaxed"
          />
          <div className="mt-3 flex items-center justify-between">
            <span className="text-xs text-muted">{text.trim().split(/\s+/).filter(Boolean).length} words</span>
            <button type="submit" disabled={check.isPending || text.trim().length < 80} className="btn-primary">
              {check.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
              Analyze text
            </button>
          </div>
        </form>
      ) : (
        <div className="card p-4 mb-4 font-serif text-sm leading-relaxed whitespace-pre-wrap">
          <HighlightedText text={text} flagged={result.flaggedWords} />
          <div className="mt-4 pt-3 border-t border-border flex justify-end">
             <button onClick={() => setResult(null)} className="btn-secondary">
               Analyze another
             </button>
          </div>
        </div>
      )}

      {/* Result */}
      {result && (
        <div className="space-y-4">
          {/* Overall score gauge */}
          <div className="card p-5">
            <div className="flex items-center gap-5">
              <ScoreGauge score={result.aiLikelihood} band={result.band} />
              <div className="flex-1">
                <h2 className="font-semibold">
                  {result.band === "high"
                    ? "Reads as likely AI-generated"
                    : result.band === "moderate"
                    ? "Some AI-like patterns detected"
                    : "Reads as human-written"}
                </h2>
                <p className="mt-1 text-sm text-muted">
                  Based on {result.stats.words} words across {result.stats.sentences} sentences.
                  This is a heuristic estimate, not a real classifier — treat it as a heads-up, not
                  a verdict.
                </p>
              </div>
            </div>

            {/* Signal bars */}
            <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3">
              <SignalBar
                icon={Activity}
                label="Sentence length uniformity"
                value={result.signals.burstiness}
                hint="Lower is better. AI writes uniform-length sentences."
              />
              <SignalBar
                icon={Type}
                label="Lexical richness"
                value={result.signals.lexicalRichness}
                hint="Lower is better. AI reuses the same vocabulary."
              />
              <SignalBar
                icon={Repeat}
                label="Transition-word density"
                value={result.signals.transitionDensity}
                hint="Lower is better. LLMs overuse signposts like 'moreover'."
              />
              <SignalBar
                icon={AlertTriangle}
                label="Formulaic openers"
                value={result.signals.formulaicDensity}
                hint="Lower is better. 'This shows that…' is robotic."
              />
              <SignalBar
                icon={Wand2}
                label="AI Vocabulary Footprint"
                value={result.signals.aiVocab}
                hint="Lower is better. Flags words statistically overused by AI (e.g. 'delve', 'tapestry')."
              />
              <SignalBar
                icon={Gauge}
                label="Predictability (common word pairs)"
                value={result.signals.predictability}
                hint="Lower is better. AI text favours generic collocations."
              />
            </div>
          </div>

          {/* Issues */}
          {result.issues.length > 0 ? (
            <div className="card p-5">
              <h2 className="font-semibold flex items-center gap-2 mb-3">
                <Lightbulb className="h-5 w-5 text-amber-500" />
                What to fix ({result.issues.length})
              </h2>
              <ul className="space-y-3">
                {result.issues.map((issue, i) => (
                  <li key={i} className="flex gap-3 text-sm">
                    <span
                      className={cn(
                        "mt-0.5 h-2 w-2 rounded-full shrink-0",
                        issue.severity === "high" ? "bg-red-500" : issue.severity === "warn" ? "bg-amber-500" : "bg-blue-500"
                      )}
                    />
                    <div>
                      <p className="text-text">{issue.message}</p>
                      {issue.excerpt && (
                        <p className="mt-1 text-xs italic text-muted border-l-2 border-border pl-2">
                          {issue.excerpt}
                        </p>
                      )}
                      {issue.suggestion && (
                        <p className="mt-1 text-xs text-brand-700 dark:text-brand-300">
                          <strong>Fix:</strong> {issue.suggestion}
                        </p>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <div className="card p-5 text-center">
              <p className="font-medium text-green-600">No major issues detected.</p>
              <p className="text-sm text-muted mt-1">
                Your text varied sentence length, used natural transitions, and avoided stock
                openers. Nice.
              </p>
            </div>
          )}

          {/* Stats */}
          <div className="card p-5">
            <h3 className="text-sm font-semibold mb-2">Statistics</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
              <Stat label="Avg sentence length" value={`${result.stats.avgSentenceLen.toFixed(1)} words`} />
              <Stat label="Length variation" value={`±${result.stats.sentenceLenStd.toFixed(1)}`} />
              <Stat label="Unique-word ratio" value={result.stats.uniqueWordsRatio.toFixed(2)} />
              <Stat label="Transition phrases" value={String(result.stats.transitionCount)} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ScoreGauge({ score, band }: { score: number; band: "low" | "moderate" | "high" }) {
  const color =
    band === "high" ? "#ef4444" : band === "moderate" ? "#f59e0b" : "#22c55e";
  const r = 38;
  const circ = 2 * Math.PI * r;
  const offset = circ - (score / 100) * circ;
  return (
    <div className="relative h-24 w-24 shrink-0">
      <svg className="h-24 w-24 -rotate-90" viewBox="0 0 96 96">
        <circle cx="48" cy="48" r={r} fill="none" stroke="currentColor" strokeWidth="8" className="text-bg opacity-50" />
        <circle
          cx="48"
          cy="48"
          r={r}
          fill="none"
          stroke={color}
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 0.5s ease" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-bold" style={{ color }}>
          {score}
        </span>
        <span className="text-[10px] uppercase tracking-wide text-muted">AI-like</span>
      </div>
    </div>
  );
}

function SignalBar({
  icon: Icon,
  label,
  value,
  hint,
}: {
  icon: React.ElementType;
  label: string;
  value: number;
  hint: string;
}) {
  const color = value >= 65 ? "bg-red-500" : value >= 40 ? "bg-amber-500" : "bg-green-500";
  return (
    <div>
      <div className="flex items-center gap-1.5 text-xs font-medium">
        <Icon className="h-3.5 w-3.5 text-muted" />
        {label}
        <span className="ml-auto text-muted">{value}/100</span>
      </div>
      <div className="mt-1 h-1.5 rounded-full bg-bg overflow-hidden">
        <div className={cn("h-full rounded-full transition-all", color)} style={{ width: `${value}%` }} />
      </div>
      <p className="mt-1 text-[11px] text-muted leading-snug">{hint}</p>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs text-muted">{label}</div>
      <div className="font-medium">{value}</div>
    </div>
  );
}

// Helper component to render text with AI words highlighted
function HighlightedText({ text, flagged }: { text: string; flagged: FlaggedWord[] }) {
  if (flagged.length === 0) return <>{text}</>;

  // Build a giant regex for all flagged words (sorted by length desc to match longest first)
  const sortedWords = [...new Set(flagged.map((f) => f.word))].sort((a, b) => b.length - a.length);
  
  if (sortedWords.length === 0) return <>{text}</>;
  
  const escapedWords = sortedWords.map(w => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  const regex = new RegExp(`\\b(${escapedWords.join('|')})\\b`, 'gi');

  const parts = text.split(regex);

  // Map to apply specific styles based on why it was flagged
  const getStyle = (word: string) => {
    const f = flagged.find(x => x.word.toLowerCase() === word.toLowerCase());
    if (f?.type === 'ai-vocab') return "bg-[#e06060]/20 text-[#e06060] font-medium px-0.5 rounded";
    if (f?.type === 'transition') return "bg-amber-500/20 text-amber-500 font-medium px-0.5 rounded";
    if (f?.type === 'opener') return "bg-blue-500/20 text-blue-500 font-medium px-0.5 rounded";
    return "bg-amber-500/20 text-amber-500 font-medium px-0.5 rounded";
  };

  return (
    <>
      {parts.map((part, i) => {
        // Since we split with a capture group, every odd index is a matched word
        if (i % 2 === 1) {
          return (
            <span key={i} className={getStyle(part)} title="Flagged as AI-like">
              {part}
            </span>
          );
        }
        return <span key={i}>{part}</span>;
      })}
    </>
  );
}
