import type { Paper } from "@/lib/types";

/** Escape HTML special characters to prevent XSS in citation rendering. */
function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

/**
 * Plain-text version of a formatCitation() result, for the clipboard and
 * anywhere the citation is rendered as text rather than as HTML.
 * Drops the <i> markup and reverses esc().
 */
export function citationToText(html: string): string {
  return html
    .replace(/<\/?i>/g, "")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, "&"); // last, mirroring esc() which escapes it first
}

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

/**
 * Initials for the given names: "John Paul" -> "J. P.", and a run of
 * capitals as PubMed and Europe PMC give it ("FP") -> "F. P.".
 */
function initialsOf(given: string[]): string {
  return given
    .flatMap((g) => (/^[A-Z]{2,3}$/.test(g) ? g.split("") : [g]))
    .map((g) => g[0]?.toUpperCase() + ".")
    .join(" ");
}

/** "Smith, J., & Doe, A." (APA in-text authors) */
function authorsApa(authors: string[]): string {
  if (!authors.length) return "";
  const parsed = authors.map((a) => {
    const parts = a.trim().split(/\s+/);
    if (parts.length === 1) return { last: parts[0], initials: "" };
    const last = parts.pop()!;
    return { last, initials: initialsOf(parts) };
  });
  return parsed
    .map((a, i) => {
      // Single-name authors (organizations, mononyms) have no initials —
      // don't leave a dangling comma ("WHO," instead of "WHO").
      const name = a.initials ? `${a.last}, ${a.initials}` : a.last;
      // APA 7 keeps the comma before the ampersand: "Smith, J., & Doe, A."
      const sep = i === parsed.length - 1 ? "" : i === parsed.length - 2 ? ", & " : ", ";
      return name + sep;
    })
    .join("");
}

/**
 * "Smith, John, and Jane Doe." (MLA 9 / Chicago bibliography)
 *
 * Both styles invert the first author and spell out a second one; "et al."
 * starts only at three authors.
 */
function authorsMla(authors: string[]): string {
  if (!authors.length) return "";
  const inv = invertFirst(authors[0]);
  if (authors.length === 1) return `${inv}.`;
  if (authors.length === 2) return `${inv}, and ${authors[1]}.`;
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
    return `${initialsOf(parts)} ${last}`.trim();
  });
  let str = formatted.join(", ");
  if (authors.length > 6) str += ", et al.";
  return str;
}

/**
 * Title followed by `mark`, unless the title already ends in its own
 * punctuation: "Does homework work?" must not become "work?." or "work?,".
 */
function withMark(title: string, mark: string): string {
  return /[.?!]$/.test(title) ? title : title + mark;
}

/**
 * " <i>Journal</i>, 2023." for MLA and Chicago, joining only the parts that
 * exist: a missing year used to leave "Journal,." behind.
 */
function venueYear(venue: string, p: Paper): string {
  const tail = [venue ? `<i>${esc(venue)}</i>` : "", yr(p, "")].filter(Boolean).join(", ");
  return tail ? ` ${tail}.` : "";
}

export function formatCitation(p: Paper, style: CitationStyle, refNum?: number): string {
  const title = esc(p.title || "Untitled");
  const venue = p.venue || "";
  const doi = p.doi ? `https://doi.org/${esc(p.doi)}` : "";

  switch (style) {
    case "apa": {
      const a = esc(authorsApa(p.authors) || "Anonymous");
      const v = venue ? ` <i>${esc(venue)}</i>` : "";
      const doiPart = doi ? ` ${doi}` : "";
      return `${a} (${yr(p)}). ${withMark(title, ".")}${v}.${doiPart}`.replace(/\.\./g, ".").replace(/\s+\./g, ".").trim();
    }
    case "mla": {
      const a = esc(authorsMla(p.authors));
      return `${a} "${withMark(title, ".")}"${venueYear(venue, p)}`.trim();
    }
    case "ieee": {
      const n = refNum ?? 1;
      const a = esc(authorsIeee(p.authors));
      // Join only the parts that exist — a missing author or year used to
      // leave stray commas ('[1] , "Title", .').
      const parts = [
        a,
        `"${title}"`,
        venue ? `<i>${esc(venue)}</i>` : "",
        yr(p, ""),
        doi ? `doi: ${esc(p.doi || "")}` : "",
      ].filter(Boolean);
      return `[${n}] ${parts.join(", ")}.`;
    }
    case "chicago": {
      const a = esc(authorsMla(p.authors));
      return `${a} "${withMark(title, ".")}"${venueYear(venue, p)}`.trim();
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

/** Escape special BibTeX characters in field values. */
function bibtexEscape(s: string): string {
  return s.replace(/[&%#_${}\\]/g, (c) => `\\${c}`);
}

/** Make a BibTeX entry. */
export function toBibtex(p: Paper): string {
  // Cite keys must be plain ASCII with no punctuation: "O'Brien", "Müller" or a
  // title starting with '"Deep:' otherwise yields a .bib that fails to parse.
  const keyPart = (s: string) =>
    s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]/g, "");
  const key =
    (keyPart(p.authors[0]?.trim().split(/\s+/).pop() || "") || "anon") +
    (p.year || "nd") +
    keyPart(p.title.trim().split(/\s+/)[0] || "");
  const fields = [
    `  author = {${bibtexEscape(p.authors.join(" and ") || "Anonymous")}}`,
    `  title = {${bibtexEscape(p.title)}}`,
    p.year ? `  year = {${p.year}}` : null,
    p.venue ? `  journal = {${bibtexEscape(p.venue)}}` : null,
    // DOIs and URLs carry _, &, % and # constantly; unescaped they break the
    // .bib for LaTeX just as a title would.
    p.doi ? `  doi = {${bibtexEscape(p.doi)}}` : null,
    p.openAccessUrl ? `  url = {${bibtexEscape(p.openAccessUrl)}}` : null,
  ]
    .filter(Boolean)
    .join(",\n");
  return `@article{${key},\n${fields}\n}`;
}

/** Make an RIS entry for import into Zotero/Mendeley/EndNote. */
export function toRis(p: Paper): string {
  // A RIS field ends at the newline, so an abstract containing one would have
  // its remainder parsed as a tag and dropped by Zotero/Mendeley.
  const oneLine = (s: string) => s.replace(/\s*\n+\s*/g, " ").trim();
  const lines = [
    "TY  - JOUR",
    `TI  - ${oneLine(p.title)}`,
    ...p.authors.map((a) => `AU  - ${oneLine(a)}`),
    p.year ? `PY  - ${p.year}` : null,
    p.venue ? `JO  - ${oneLine(p.venue)}` : null,
    p.doi ? `DO  - ${oneLine(p.doi)}` : null,
    p.abstract ? `AB  - ${oneLine(p.abstract)}` : null,
    p.openAccessUrl ? `UR  - ${oneLine(p.openAccessUrl)}` : null,
    "ER  -",
  ].filter(Boolean);
  return lines.join("\n");
}
