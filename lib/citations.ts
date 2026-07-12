import type { Paper } from "@/lib/types";

/**
 * Citation formatting for the styles thesis students actually use.
 * APA 7, MLA 9, IEEE, Chicago (notes), plus BibTeX and RIS for reference managers.
 *
 * These are intentionally simplified single-paper formatters — they cover the
 * common case (journal article / conference paper) well and degrade gracefully
 * for theses, books, and preprints. For a polished bibliography, students
 * should still verify against the official style guide.
 */

export type CitationStyle = "apa" | "mla" | "ieee" | "chicago";
export type ExportFormat = "bibtex" | "ris";

/** Year as a string, with "n.d." fallback for APA/MLA. */
function yr(p: Paper, fallback = "n.d."): string {
  return p.year ? String(p.year) : fallback;
}

/** "Smith, J., & Doe, A." (APA in-text authors) */
function authorsApa(authors: string[]): string {
  if (!authors.length) return "";
  const parsed = authors.map((a) => {
    const parts = a.trim().split(/\s+/);
    if (parts.length === 1) return { last: parts[0], initials: "" };
    const last = parts.pop()!;
    const initials = parts.map((p) => p[0]?.toUpperCase() + ".").join(" ");
    return { last, initials };
  });
  return parsed
    .map((a, i) => {
      const name = `${a.last}, ${a.initials}`.trim();
      const sep = i === parsed.length - 1 ? "" : i === parsed.length - 2 ? " & " : ", ";
      return name + sep;
    })
    .join("");
}

/** "Smith, John, and Jane Doe." (MLA / Chicago) */
function authorsMla(authors: string[], style: "mla" | "chicago"): string {
  if (!authors.length) return "";
  if (authors.length === 1) return authors[0] + ".";
  const first = authors[0];
  const rest = authors.slice(1);
  if (style === "mla") {
    return `${first}, et al.`;
  }
  // Chicago: first author inverted, others normal, "and"
  const inv = invertFirst(first);
  if (rest.length === 1) return `${inv}, and ${rest[0]}.`;
  return `${inv}, et al.`;
}

function invertFirst(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0];
  const last = parts.pop();
  return `${last}, ${parts.join(" ")}`;
}

/** "[1] J. Smith, …" (IEEE numeric) */
function authorsIeee(authors: string[]): string {
  if (!authors.length) return "";
  const formatted = authors.slice(0, 6).map((a) => {
    const parts = a.trim().split(/\s+/);
    const last = parts.pop();
    const initials = parts.map((p) => p[0]?.toUpperCase() + ".").join(" ");
    return `${initials} ${last}`.trim();
  });
  let str = formatted.join(", ");
  if (authors.length > 6) str += ", et al.";
  return str;
}

export function formatCitation(p: Paper, style: CitationStyle, refNum?: number): string {
  const title = p.title || "Untitled";
  const venue = p.venue || "";
  const doi = p.doi ? `https://doi.org/${p.doi}` : "";

  switch (style) {
    case "apa": {
      const a = authorsApa(p.authors) || "Anonymous";
      const v = venue ? ` <i>${venue}</i>` : "";
      const doiPart = doi ? ` ${doi}` : "";
      return `${a} (${yr(p)}). ${title}.${v}.${doiPart}`.replace(/\s+\./g, ".").trim();
    }
    case "mla": {
      const a = authorsMla(p.authors, "mla");
      const v = venue ? ` <i>${venue},</i>` : "";
      return `${a} "${title}." ${v} ${yr(p, "")}.`.replace(/\s+\./g, ".").replace(/\s+/g, " ").trim();
    }
    case "ieee": {
      const n = refNum ?? 1;
      const a = authorsIeee(p.authors);
      const v = venue ? `, <i>${venue}</i>` : "";
      const doiPart = doi ? `, doi: ${p.doi}` : "";
      return `[${n}] ${a}, "${title}"${v}, ${yr(p, "")}${doiPart}.`;
    }
    case "chicago": {
      const a = authorsMla(p.authors, "chicago");
      const v = venue ? ` <i>${venue},</i>` : "";
      return `${a} "${title}."${v} ${yr(p, "")}.`.replace(/\s+\./g, ".").replace(/\s+/g, " ").trim();
    }
  }
}

/** Short in-text citation, e.g. "(Smith & Doe, 2023)" or "[1]". */
export function inTextCitation(p: Paper, style: CitationStyle, refNum?: number): string {
  if (style === "ieee") return `[${refNum ?? 1}]`;
  const firstAuthor = p.authors[0] || "Anonymous";
  const last = firstAuthor.trim().split(/\s+/).pop();
  let authors: string;
  if (!p.authors.length) authors = "Anonymous";
  else if (p.authors.length === 1) authors = last!;
  else if (p.authors.length === 2) {
    const last2 = p.authors[1].trim().split(/\s+/).pop();
    authors = `${last} & ${last2}`;
  } else authors = `${last} et al.`;
  return style === "apa" ? `(${authors}, ${yr(p, "n.d.")})` : `(${authors} ${yr(p, "")})`;
}

/** Make a BibTeX entry. */
export function toBibtex(p: Paper): string {
  const key = (p.authors[0]?.split(/\s+/).pop() || "anon").toLowerCase() + (p.year || "nd") + (p.title.split(/\s+/)[0]?.toLowerCase() || "");
  const fields = [
    `  author = {${p.authors.join(" and ") || "Anonymous"}}`,
    `  title = {${p.title}}`,
    p.year ? `  year = {${p.year}}` : null,
    p.venue ? `  journal = {${p.venue}}` : null,
    p.doi ? `  doi = {${p.doi}}` : null,
    p.openAccessUrl ? `  url = {${p.openAccessUrl}}` : null,
  ]
    .filter(Boolean)
    .join(",\n");
  return `@article{${key},\n${fields}\n}`;
}

/** Make an RIS entry for import into Zotero/Mendeley/EndNote. */
export function toRis(p: Paper): string {
  const lines = [
    "TY  - JOUR",
    `TI  - ${p.title}`,
    ...p.authors.map((a) => `AU  - ${a}`),
    p.year ? `PY  - ${p.year}` : null,
    p.venue ? `JO  - ${p.venue}` : null,
    p.doi ? `DO  - ${p.doi}` : null,
    p.abstract ? `AB  - ${p.abstract}` : null,
    p.openAccessUrl ? `UR  - ${p.openAccessUrl}` : null,
    "ER  -",
  ].filter(Boolean);
  return lines.join("\n");
}
