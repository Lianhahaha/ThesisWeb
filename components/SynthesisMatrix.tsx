"use client";

import { useState, useEffect } from "react";
import type { SavedPaper } from "@/lib/types";
import { updatePaper } from "@/lib/db";
import { toast } from "@/components/Toaster";

/**
 * The synthesis matrix: one row per saved paper, with the four columns a
 * supervisor expects in a review of related literature. Cells save when they
 * lose focus.
 *
 * On phones the table becomes one card per paper, because a four-column table
 * at 390px is unusable.
 */

type Field = "method" | "findings" | "limitations" | "relevanceToTopic";

const FIELDS: { key: Field; label: string; placeholder: string }[] = [
  { key: "method", label: "Method", placeholder: "Quantitative, survey of 200 students…" },
  { key: "findings", label: "Findings", placeholder: "X significantly predicts Y…" },
  { key: "limitations", label: "Limitations", placeholder: "Small sample, single school…" },
  { key: "relevanceToTopic", label: "Relevance to my topic", placeholder: "Supports my hypothesis that…" },
];

export function SynthesisMatrix({ papers }: { papers: SavedPaper[] }) {
  if (papers.length === 0) {
    return (
      <div className="panel py-12 text-center">
        <h2 className="text-lg">Nothing to synthesise yet</h2>
        <p className="mt-2 text-sm text-muted">
          Save some papers first, then fill in this matrix to turn them into a written review.
        </p>
      </div>
    );
  }

  return (
    <>
      <p className="mb-3 text-sm text-muted">
        Fill a row per paper. Entries save when you click out of a box.
      </p>

      {/* Phones: one card per paper. */}
      <ul className="space-y-3 md:hidden">
        {papers.map((p) => (
          <li key={p.id} className="panel">
            <h3 className="text-sm font-semibold leading-snug">{p.title}</h3>
            <p className="mt-1 text-xs text-muted">
              {p.authors[0] || "Unknown author"}
              {p.authors.length > 1 && " et al."} ({p.year || "n.d."})
            </p>
            <div className="mt-3 space-y-3">
              {FIELDS.map((f) => (
                <div key={f.key}>
                  <label htmlFor={`m-${p.id}-${f.key}`} className="field-label">{f.label}</label>
                  <Cell idPrefix="m" paper={p} field={f} />
                </div>
              ))}
            </div>
          </li>
        ))}
      </ul>

      {/* Tablet and up: the real matrix. */}
      <div className="card hidden overflow-x-auto md:block">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-border">
              <th scope="col" className="w-[220px] p-3 text-left font-semibold">Paper</th>
              {FIELDS.map((f) => (
                <th key={f.key} scope="col" className="min-w-[200px] p-3 text-left font-semibold">
                  {f.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {papers.map((p) => (
              <tr key={p.id} className="border-b border-border last:border-0">
                <th scope="row" className="p-3 text-left align-top font-medium">
                  <span className="line-clamp-3 leading-snug">{p.title}</span>
                  <span className="mt-1 block text-xs font-normal text-muted">
                    {p.authors[0] || "Unknown author"}
                    {p.authors.length > 1 && " et al."} ({p.year || "n.d."})
                  </span>
                </th>
                {FIELDS.map((f) => (
                  <td key={f.key} className="p-2 align-top">
                    <label htmlFor={`t-${p.id}-${f.key}`} className="sr-only">
                      {f.label} for {p.title}
                    </label>
                    <Cell idPrefix="t" paper={p} field={f} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

function Cell({
  idPrefix,
  paper,
  field,
}: {
  /** The phone and desktop layouts both render; keeps element ids unique. */
  idPrefix: string;
  paper: SavedPaper;
  field: { key: Field; label: string; placeholder: string };
}) {
  const [value, setValue] = useState(paper.matrix?.[field.key] || "");
  const [dirty, setDirty] = useState(false);

  // Re-sync when the row's stored value changes and the user isn't mid-edit.
  useEffect(() => {
    if (!dirty) setValue(paper.matrix?.[field.key] || "");
  }, [paper.matrix, field.key, dirty]);

  async function commit() {
    if (!dirty) return;
    try {
      // Update only this cell ("matrix.method"). Writing the whole matrix from
      // this row's copy could overwrite a neighbouring cell saved moments ago.
      // Dexie and Firestore both accept dotted paths.
      await updatePaper(paper.id, { [`matrix.${field.key}`]: value } as Partial<SavedPaper>);
      setDirty(false);
    } catch {
      // Keep it dirty so the next blur retries.
      toast(`Could not save “${field.label}”. Check your connection and click out of the box again.`, "error");
    }
  }

  return (
    <textarea
      id={`${idPrefix}-${paper.id}-${field.key}`}
      value={value}
      onChange={(e) => { setValue(e.target.value); setDirty(true); }}
      onBlur={commit}
      placeholder={field.placeholder}
      rows={3}
      className="input resize-y text-sm"
    />
  );
}
