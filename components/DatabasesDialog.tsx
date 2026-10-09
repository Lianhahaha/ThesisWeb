"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { ExternalLink, X } from "lucide-react";
import { SOURCE_COUNT, KINDS, SOURCE_META, type SourceMeta } from "@/lib/sources/meta";

const ASIA = ["Japan", "Thailand", "Singapore", "India"];

/** Local sources first, then the rest of Asia, then everything else. */
const GROUPS: { title: string; match: (region: string) => boolean }[] = [
  { title: "Philippines", match: (r) => r === "Philippines" },
  { title: "Rest of Asia", match: (r) => ASIA.includes(r) },
  { title: "Global", match: (r) => r.startsWith("Global") },
  { title: "Other countries", match: () => true },
];

function grouped() {
  const left = Object.values(SOURCE_META);
  return GROUPS.map((g) => {
    const list = left.filter((s) => g.match(s.region)).sort((a, b) => a.label.localeCompare(b.label));
    for (const s of list) left.splice(left.indexOf(s), 1);
    return { title: g.title, list };
  }).filter((g) => g.list.length > 0);
}

const GROUPED: { title: string; list: SourceMeta[] }[] = grouped();

/** Every database a search goes to, opened from the home page. */
export function DatabasesDialog({ onClose }: { onClose: () => void }) {
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    closeRef.current?.focus();
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="databases-title"
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[85vh] w-full max-w-2xl flex-col rounded-t-2xl border border-border bg-surface text-left sm:rounded-2xl"
      >
        <header className="flex items-center justify-between border-b border-border p-4">
          <h2 id="databases-title" className="text-lg">{SOURCE_COUNT} databases searched</h2>
          <button ref={closeRef} onClick={onClose} className="btn-ghost btn-sm !px-2" aria-label="Close">
            <X className="h-4 w-4" aria-hidden />
          </button>
        </header>

        <div className="overflow-y-auto p-4">
          {GROUPED.map((g) => (
            <section key={g.title} className="mb-5 last:mb-0" aria-labelledby={`db-${g.title}`}>
              <h3 id={`db-${g.title}`} className="eyebrow">
                {g.title} · {g.list.length}
              </h3>
              <ul className="mt-2 grid gap-x-4 sm:grid-cols-2">
                {g.list.map((s) => (
                  <li key={s.label} className="border-t border-border py-2">
                    <a
                      href={s.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      title={s.blurb}
                      className="text-sm font-medium hover:underline"
                    >
                      {s.label}
                      <ExternalLink className="ml-1 inline h-3 w-3 align-[-1px] text-subtle" aria-hidden />
                    </a>
                    <span className="block text-xs text-subtle">{KINDS[s.kind]}</span>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>

        <footer className="border-t border-border p-4 text-sm">
          <Link href="/databases" className="text-accent underline" onClick={onClose}>
            What each database covers
          </Link>
        </footer>
      </div>
    </div>
  );
}
