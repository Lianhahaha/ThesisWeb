import { MATRIX_KEYS, type MatrixKey, type SavedPaper } from "@/lib/types";
import { SCOPE_LABELS, type Scope } from "@/lib/library/scope";
import { rtfDocument, rtfText, tableRtf } from "@/lib/library/rtf";

/**
 * The synthesis matrix as a table advisers can open: CSV for Excel and
 * Google Sheets, RTF for Word and Google Docs (landscape, bordered).
 */

export const MATRIX_COLUMN_LABELS: Record<MatrixKey, string> = {
  method: "Method",
  findings: "Findings",
  limitations: "Limitations",
  relevanceToTopic: "Relevance to my topic",
};

/** "Cruz (2023)", "Cruz & Reyes (2023)", "Cruz et al. (2023)": how a matrix row names its paper. */
export function shortCitation(p: SavedPaper): string {
  const surname = (name: string) => name.trim().split(/\s+/).pop() || name;
  const a = p.authors ?? [];
  const who = a.length === 0 ? p.title.slice(0, 40) : a.length === 1 ? surname(a[0]) : a.length === 2 ? `${surname(a[0])} & ${surname(a[1])}` : `${surname(a[0])} et al.`;
  return `${who} (${p.year ?? "n.d."})`;
}

/** Header row, then one row per paper. A Local/Foreign column is added when `scopeOf` is given. */
export function matrixRows(papers: SavedPaper[], scopeOf?: (p: SavedPaper) => Scope): string[][] {
  const header = ["No.", "Author and year", "Title", ...(scopeOf ? ["Local / foreign"] : []), ...MATRIX_KEYS.map((k) => MATRIX_COLUMN_LABELS[k])];
  const rows = papers.map((p, i) => [
    String(i + 1),
    shortCitation(p),
    p.title,
    ...(scopeOf ? [SCOPE_LABELS[scopeOf(p)]] : []),
    ...MATRIX_KEYS.map((k) => p.matrix?.[k] ?? ""),
  ]);
  return [header, ...rows];
}

/** CSV with a byte-order mark and CRLF lines, so Excel opens accented text and line breaks correctly. */
export function matrixCsv(rows: string[][]): string {
  const cell = (v: string) => {
    // A leading = + - @ would run as a formula in Excel.
    const safe = /^[=+\-@]/.test(v) ? `'${v}` : v;
    return /[",\r\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
  };
  return "﻿" + rows.map((r) => r.map(cell).join(",")).join("\r\n") + "\r\n";
}

/** A landscape Word document with a title and the matrix as a bordered table. */
export function matrixRtf(rows: string[][], title = "Synthesis matrix"): string {
  const [header, ...body] = rows;
  // 9 inches of landscape text width: narrow number column, wider text columns.
  const fixed = header.length === 8 ? [0.4, 1.1, 1.6, 0.8] : [0.4, 1.2, 1.8];
  const rest = (9 - fixed.reduce((a, b) => a + b, 0)) / (header.length - fixed.length);
  const widths = [...fixed, ...Array(header.length - fixed.length).fill(rest)];
  return rtfDocument(`\\pard\\qc\\b ${rtfText(title)}\\b0\\par\\pard\\par\n${tableRtf(header, body, widths)}\n\\pard\\par`, true);
}
