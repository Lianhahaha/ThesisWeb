"use client";

import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { Dialog } from "@/components/Dialog";
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
  return (
    <Dialog
      title={`${SOURCE_COUNT} databases searched`}
      onClose={onClose}
      className="max-h-[85vh] max-w-2xl"
      footer={
        <Link href="/databases" className="text-accent underline" onClick={onClose}>
          What each database covers
        </Link>
      }
    >
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
    </Dialog>
  );
}
