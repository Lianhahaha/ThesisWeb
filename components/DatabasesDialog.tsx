"use client";

import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { Dialog } from "@/components/Dialog";
import { SOURCE_COUNT, KINDS, SOURCE_META, type SourceMeta } from "@/lib/sources/meta";

const ALPHABETICAL: SourceMeta[] = Object.values(SOURCE_META).sort((a, b) =>
  a.label.localeCompare(b.label)
);

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
      <ul className="divide-y divide-border">
        {ALPHABETICAL.map((s) => (
          <li key={s.label} className="py-3">
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
            <span className="mt-0.5 block text-xs text-subtle">{KINDS[s.kind]}</span>
          </li>
        ))}
      </ul>
    </Dialog>
  );
}
