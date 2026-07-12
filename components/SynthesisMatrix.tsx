"use client";

import { useState } from "react";
import { Table2 } from "lucide-react";
import type { SavedPaper } from "@/lib/types";
import { updatePaper } from "@/lib/db";
import { toast } from "@/components/Toaster";

/**
 * The synthesis matrix — THE tool that turns a search tool into an RRL writer.
 * For each saved paper, the student fills in: method, findings, limitations,
 * and (most importantly) how it relates to their own topic. These columns are
 * exactly what a thesis advisor wants to see in a review of related literature.
 *
 * Cells auto-save to IndexedDB on blur; no save button needed.
 */

type Field = "method" | "findings" | "limitations" | "relevanceToTopic";

const FIELDS: { key: Field; label: string; placeholder: string }[] = [
  { key: "method", label: "Method", placeholder: "Quantitative, survey of 200 students…" },
  { key: "findings", label: "Findings", placeholder: "X significantly predicts Y…" },
  { key: "limitations", label: "Limitations", placeholder: "Small sample, single country…" },
  { key: "relevanceToTopic", label: "Relevance to my topic", placeholder: "Supports my hypothesis that…" },
];

export function SynthesisMatrix({ papers }: { papers: SavedPaper[] }) {
  if (papers.length === 0) {
    return (
      <div className="card p-12 text-center">
        <Table2 className="h-10 w-10 text-muted mx-auto opacity-50" />
        <p className="mt-3 font-medium">Nothing to synthesize yet</p>
        <p className="text-sm text-muted mt-1">Save some papers first, then fill in the matrix.</p>
      </div>
    );
  }

  return (
    <div className="card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="border-b border-border bg-bg">
              <th className="text-left p-3 font-semibold min-w-[200px] sticky left-0 bg-bg z-10">
                Paper
              </th>
              {FIELDS.map((f) => (
                <th key={f.key} className="text-left p-3 font-semibold min-w-[220px]">
                  {f.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {papers.map((p) => (
              <tr key={p.id} className="border-b border-border last:border-0 hover:bg-bg/50">
                <td className="p-3 align-top sticky left-0 bg-surface z-10">
                  <div className="font-medium leading-snug line-clamp-3">{p.title}</div>
                  <div className="mt-1 text-xs text-muted">
                    {p.authors[0] || "—"}
                    {p.authors.length > 1 ? " et al." : ""} ({p.year || "n.d."})
                  </div>
                </td>
                {FIELDS.map((f) => (
                  <td key={f.key} className="p-1 align-top">
                    <Cell paper={p} field={f} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Cell({ paper, field }: { paper: SavedPaper; field: { key: Field; label: string; placeholder: string } }) {
  const [value, setValue] = useState(paper.matrix?.[field.key] || "");
  const [dirty, setDirty] = useState(false);

  async function commit() {
    if (!dirty) return;
    const updated = { ...paper.matrix, [field.key]: value } as SavedPaper["matrix"];
    await updatePaper(paper.id, { matrix: updated });
    setDirty(false);
  }

  return (
    <textarea
      value={value}
      onChange={(e) => {
        setValue(e.target.value);
        setDirty(true);
      }}
      onBlur={() => {
        commit();
      }}
      placeholder={field.placeholder}
      rows={3}
      className="w-full resize-y rounded border border-transparent bg-transparent p-2 text-xs leading-relaxed focus:border-brand-400 focus:bg-surface focus:outline-none focus:ring-1 focus:ring-brand-400"
    />
  );
}
