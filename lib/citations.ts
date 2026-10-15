import type { Paper, WorkType } from "@/lib/types";
import { SOURCE_META } from "@/lib/sources/meta";
import { containerCase, sentenceCase, titleCase } from "@/lib/title-case";

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
 * Each kind of work (journal article, thesis, report, book, chapter,
 * conference paper, preprint) gets its own pattern, with volume, issue and
 * pages where the record has them. Records still lack some details (editors,
 * a report's number, a book's edition), so students should check the result
 * against their school's style guide.
 */

export type CitationStyle = "apa" | "mla" | "ieee" | "chicago";

/** The styles offered everywhere a style is picked, in display order. */
export const CITATION_STYLES: { id: CitationStyle; label: string }[] = [
  { id: "apa", label: "APA 7" },
  { id: "mla", label: "MLA 9" },
  { id: "ieee", label: "IEEE" },
  { id: "chicago", label: "Chicago" },
];

/** Year as a string, with "n.d." fallback for APA/MLA. */
function yr(p: Paper, fallback = "n.d."): string {
  return p.year ? String(p.year) : fallback;
}

/** Words that mark an organisation, not a person, as the author. */
const GROUP_WORDS =
  /\b(?:organi[sz]ation|department|institute|university|college|ministry|council|agency|bank|cent(?:er|re)|association|society|commission|office|program(?:me)?|foundation|group|committee|network|authority|bureau|board|fund|union|corporation|consortium|collaboration|alliance|federation|secretariat|laborator(?:y|ies)|services|nations|government|republic)\b/i;

/**
 * True for an organisation as author ("World Health Organization", "UNICEF",
 * "DOST-PCHRD"): every style gives its name as written, never as
 * "Organization, W. H.".
 */
export function isGroupAuthor(name: string): boolean {
  const n = name.trim();
  return GROUP_WORDS.test(n) || /^[A-Z]{2,}(?:[-\s][A-Z]{2,})*$/.test(n);
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
    if (parts.length === 1 || isGroupAuthor(a)) return { last: a.trim(), initials: "" };
    if (parts.length === 1) return { last: parts[0], initials: "" };
    const last = parts.pop()!;
    return { last, initials: initialsOf(parts) };
  });
  // 21 or more: the first 19, an ellipsis, then the last author (APA 7, 9.8).
  if (parsed.length > 20) {
    const name = (a: { last: string; initials: string }) => (a.initials ? `${a.last}, ${a.initials}` : a.last);
    return `${parsed.slice(0, 19).map(name).join(", ")}, . . . ${name(parsed[parsed.length - 1])}`;
  }
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
 * "Smith, John, and Jane Doe." (MLA 9)
 *
 * Inverts the first author and spells out a second one; "et al." starts
 * only at three authors.
 */
function authorsMla(authors: string[]): string {
  if (!authors.length) return "";
  const inv = invertFirst(authors[0]);
  if (authors.length === 1) return `${inv}.`;
  if (authors.length === 2) return `${inv}, and ${authors[1]}.`;
  return `${inv}, et al.`;
}

/**
 * "Smith, John, Jane Doe, and Ann Roe." (Chicago 17 bibliography) — every
 * author up to ten; beyond ten, the first seven then "et al."
 */
function authorsChicago(authors: string[]): string {
  if (authors.length <= 2) return authorsMla(authors);
  if (authors.length > 10) return `${[invertFirst(authors[0]), ...authors.slice(1, 7)].join(", ")}, et al.`;
  const [first, ...others] = authors;
  const last = others.pop();
  return `${[invertFirst(first), ...others].join(", ")}, and ${last}.`;
}

function invertFirst(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1 || isGroupAuthor(name)) return name.trim();
  const last = parts.pop();
  return `${last}, ${parts.join(" ")}`;
}

/**
 * IEEE authors: "J. Smith", "J. Smith and A. Doe", "J. Smith, A. Doe, and
 * B. Roe"; more than six becomes the first author plus "et al."
 */
function authorsIeee(authors: string[]): string {
  if (!authors.length) return "";
  const fmt = (a: string) => {
    if (isGroupAuthor(a)) return a.trim();
    const parts = a.trim().split(/\s+/);
    const last = parts.pop();
    return `${initialsOf(parts)} ${last}`.trim();
  };
  if (authors.length > 6) return `${fmt(authors[0])} et al.`;
  const f = authors.map(fmt);
  if (f.length === 1) return f[0];
  if (f.length === 2) return `${f[0]} and ${f[1]}`;
  return `${f.slice(0, -1).join(", ")}, and ${f[f.length - 1]}`;
}

/**
 * Title followed by `mark`, unless the title already ends in its own
 * punctuation: "Does homework work?" must not become "work?." or "work?,".
 */
function withMark(title: string, mark: string): string {
  return /[.?!]$/.test(title) ? title : title + mark;
}

/**
 * Venues some sources give that only name the kind of record ("Master's
 * thesis", "Report"), not where it appeared; a citation leaves them out.
 */
const KIND_LABEL =
  /^(?:(?:master'?s?|doctoral|bachelor'?s?|habilitation|undergraduate)\s+)?(?:thesis|dissertation)$|^(?:thesis|report|book|book chapter|conference paper|preprint|journal article|publications?)$/i;

/**
 * The journal, book or series a work appeared in, in title case if the
 * source sent it lowercased; empty when the venue is only a kind label.
 */
function container(p: Paper): string {
  const v = (p.venue ?? "").trim();
  return KIND_LABEL.test(v) || /\(thesis\)$/i.test(v) ? "" : containerCase(v);
}

/**
 * What kind of work a paper is: what its source said (Paper.type), otherwise
 * a guess from the kind of database it came from and its venue. Each kind is
 * cited differently.
 */
export function workType(p: Paper): WorkType {
  if (p.type) return p.type;
  if (p.preprint === true) return "preprint";
  const kinds = new Set(p.sources.map((s) => SOURCE_META[s]?.kind));
  const venue = p.venue ?? "";
  if (kinds.has("theses") || /thesis|dissertation/i.test(venue)) return "thesis";
  if (kinds.has("preprints") && p.preprint !== false) return "preprint";
  if (kinds.has("books")) return "book";
  if (kinds.has("reports") || /\breport\b|working paper|discussion paper|policy (?:note|brief)/i.test(venue)) return "report";
  if (/conference|proceedings|symposium/i.test(venue)) return "conference";
  if (kinds.has("journals") || p.volume || p.issue || venue) return "article";
  return "other";
}

type Degree = "doctoral" | "masters" | "bachelors" | "unknown";

/** The degree a thesis was written for, as far as its venue says. */
function degree(p: Paper): Degree {
  const v = p.venue ?? "";
  // "Thesis / Dissertation" (UP Diliman) names both, so it says nothing.
  if (/thesis\s*\/\s*dissertation/i.test(v)) return "unknown";
  if (/doctor|ph\.?\s?d|habilitation|dissertation/i.test(v)) return "doctoral";
  if (/master/i.test(v)) return "masters";
  if (/bachelor|undergraduate/i.test(v)) return "bachelors";
  return "unknown";
}

const DEGREE_LABELS: Record<CitationStyle, Record<Degree, string>> = {
  apa: { doctoral: "Doctoral dissertation", masters: "Master's thesis", bachelors: "Bachelor's thesis", unknown: "Thesis" },
  mla: { doctoral: "PhD dissertation", masters: "MA thesis", bachelors: "BA thesis", unknown: "Thesis" },
  chicago: { doctoral: "PhD diss.", masters: "Master's thesis", bachelors: "Bachelor's thesis", unknown: "Thesis" },
  ieee: { doctoral: "Ph.D. dissertation", masters: "M.S. thesis", bachelors: "B.S. thesis", unknown: "Thesis" },
};

/** The university behind a thesis: its publisher, or a venue that names one ("McGill University (thesis)"). */
function institution(p: Paper): string {
  if (p.publisher) return p.publisher;
  const v = (p.venue ?? "").replace(/\s*\(thesis\)$/i, "").trim();
  return KIND_LABEL.test(v) || /thesis|dissertation/i.test(v) ? "" : v;
}

/** The publisher, unless it is also the author (an agency report): APA and Chicago then name it once. */
function publisherOf(p: Paper): string {
  const pub = p.publisher?.trim() ?? "";
  return pub && !p.authors.some((a) => a.trim().toLowerCase() === pub.toLowerCase()) ? pub : "";
}

/** Page ranges take an en dash: "45-67" -> "45–67". */
const dash = (pages: string) => pages.replace(/\s*[-–—]\s*/g, "–");

/** An article number ("e2331", "103778") rather than a page or page range. */
const isArticleNumber = (pages: string) => /^e\d+$/i.test(pages) || /^\d{5,}$/.test(pages);

/** Title in italics, then `mark` unless the title ends in its own punctuation. */
const italic = (title: string, mark = ".") => `<i>${title}</i>${/[.?!]$/.test(title) ? "" : mark}`;

/** The parts that exist, joined: no stray commas for a missing year or volume. */
const join = (parts: (string | null | undefined | false)[], sep = ", ") => parts.filter(Boolean).join(sep);

/** The DOI as a link, else (if `allowUrl`) the record's own page or free copy. */
function linkOf(p: Paper, allowUrl: boolean): string {
  if (p.doi) return `https://doi.org/${esc(p.doi)}`;
  return allowUrl ? esc(p.url || p.openAccessUrl || "") : "";
}

function apa(p: Paper): string {
  const type = workType(p);
  const title = esc(sentenceCase(p.title || "Untitled"));
  const venue = esc(container(p));
  const pub = esc(publisherOf(p));
  const pages = p.pages ? esc(dash(p.pages)) : "";
  // The author element ends in a period, also for an organisation ("UNICEF.").
  const authors = p.authors.length ? esc(withMark(authorsApa(p.authors), ".")) : "";
  const date = `(${yr(p)}).`;
  // Without an author, the title moves to the author's place, before the date.
  const lead = (titlePart: string) => (authors ? `${authors} ${date} ${titlePart}` : `${titlePart} ${date}`);

  let body: string;
  switch (type) {
    case "article": {
      const volume = p.volume ? `, <i>${esc(p.volume)}</i>${p.issue ? `(${esc(p.issue)})` : ""}` : "";
      const where = pages ? `, ${isArticleNumber(p.pages!) ? `Article ${pages}` : pages}` : "";
      body = lead(withMark(title, ".")) + (venue ? ` <i>${venue}</i>${volume}${where}.` : "");
      break;
    }
    case "chapter":
    case "conference":
      body = lead(withMark(title, ".")) + (venue ? ` In <i>${venue}</i>${pages ? ` (pp. ${pages})` : ""}.` : "") + (pub ? ` ${pub}.` : "");
      break;
    case "thesis": {
      const inst = esc(institution(p));
      body = lead(`<i>${title}</i> [${join([DEGREE_LABELS.apa[degree(p)], inst])}].`);
      break;
    }
    case "preprint":
      body = lead(`<i>${title}</i> [Preprint].`) + (venue ? ` ${venue}.` : "");
      break;
    case "report": {
      // A series or report number goes in brackets after the title: "(PIDS DP 2022-08)".
      // Not when it only repeats the publisher ("Washington, DC: World Bank") or an author.
      const named = [esc(p.publisher ?? ""), ...p.authors.map(esc)].filter(Boolean);
      const series = venue && !named.some((n) => venue.endsWith(n) || n.includes(venue)) ? ` (${venue})` : "";
      body = lead(`<i>${title}</i>${series}${series || !/[.?!]$/.test(title) ? "." : ""}`) + (pub ? ` ${pub}.` : "");
      break;
    }
    case "book":
      body = lead(italic(title)) + (pub ? ` ${pub}.` : "");
      break;
    default:
      body = lead(italic(title)) + (venue ? ` ${venue}.` : "");
  }
  // APA leaves out the database link of a journal article that has no DOI.
  const link = linkOf(p, type !== "article");
  return link ? `${body} ${link}` : body;
}

function mla(p: Paper): string {
  const type = workType(p);
  const title = esc(titleCase(p.title || "Untitled"));
  const venue = esc(container(p));
  const pub = esc(p.publisher ?? "");
  const year = yr(p, "");
  // An organisation that is both author and publisher is named once, as publisher (MLA 9, 5.21).
  const authorIsPublisher = p.authors.length === 1 && !!p.publisher && p.authors[0].trim().toLowerCase() === p.publisher.trim().toLowerCase();
  const authors = authorIsPublisher ? "" : esc(authorsMla(p.authors));
  const lead = authors ? `${authors} ` : "";
  const quoted = `"${withMark(title, ".")}"`;
  const pages = p.pages ? (/[-–]/.test(p.pages) ? `pp. ${esc(dash(p.pages))}` : `p. ${esc(p.pages)}`) : "";

  let body: string;
  switch (type) {
    case "book":
    case "report":
      body = `${lead}${italic(title)} ${join([pub, year])}.`;
      break;
    case "thesis":
      body = `${lead}${italic(title)} ${join([year && `${year}.`, join([esc(institution(p)), DEGREE_LABELS.mla[degree(p)]])], " ")}.`;
      break;
    case "chapter":
    case "conference":
      body = `${lead}${quoted} ${join([venue && `<i>${venue}</i>`, pub, year, pages])}.`;
      break;
    default:
      // Article, preprint (its server is the container) and anything else.
      body = `${lead}${quoted} ${join([venue && `<i>${venue}</i>`, p.volume && `vol. ${esc(p.volume)}`, p.issue && `no. ${esc(p.issue)}`, year, pages])}.`;
  }
  body = body.replace(/ \.$/, "");
  const link = linkOf(p, true);
  return link ? `${body} ${link}.` : body;
}

function chicago(p: Paper): string {
  const type = workType(p);
  const title = esc(titleCase(p.title || "Untitled"));
  const venue = esc(container(p));
  const pub = esc(publisherOf(p));
  const year = yr(p, "");
  const authors = esc(authorsChicago(p.authors));
  const lead = authors ? `${authors} ` : "";
  const quoted = `"${withMark(title, ".")}"`;
  const pages = p.pages ? esc(dash(p.pages)) : "";

  let body: string;
  switch (type) {
    case "article": {
      const issue = join([p.volume && esc(p.volume), p.issue && `no. ${esc(p.issue)}`]);
      body = venue
        ? `${lead}${quoted} <i>${venue}</i>${issue ? ` ${issue}` : ""}${year ? ` (${year})` : ""}${pages ? `: ${pages}` : ""}.`
        : `${lead}${quoted} ${year}.`;
      break;
    }
    case "chapter":
    case "conference":
      body = `${lead}${quoted} ${join([venue && `In <i>${venue}</i>`, pages])}. ${join([pub, year])}.`;
      break;
    case "book":
    case "report":
      body = `${lead}${italic(title)} ${join([pub, year])}.`;
      break;
    case "thesis":
      body = `${lead}${quoted} ${join([DEGREE_LABELS.chicago[degree(p)], esc(institution(p)), year])}.`;
      break;
    default:
      body = `${lead}${quoted} ${join([venue && `<i>${venue}</i>`, year])}.`;
  }
  body = body.replace(/ \.( |$)/g, "$1").replace(/\. \.$/, ".");
  const link = linkOf(p, true);
  return link ? `${body} ${link}.` : body;
}

function ieee(p: Paper, n: number): string {
  const type = workType(p);
  const title = esc(p.title || "Untitled");
  const venue = esc(container(p));
  const pub = esc(p.publisher ?? "");
  const year = yr(p, "");
  const authors = esc(authorsIeee(p.authors));
  const pages = p.pages
    ? isArticleNumber(p.pages)
      ? `Art. no. ${esc(p.pages)}`
      : /[-–]/.test(p.pages)
      ? `pp. ${esc(dash(p.pages))}`
      : `p. ${esc(p.pages)}`
    : "";
  const doi = p.doi ? `doi: ${esc(p.doi)}` : "";

  if (type === "book") {
    return `[${n}] ${join([authors, italic(title)])} ${join([pub, year])}.`.replace(/ \.$/, "");
  }

  let rest: string[];
  let online = false;
  switch (type) {
    case "article":
      rest = [venue && `<i>${venue}</i>`, p.volume && `vol. ${esc(p.volume)}`, p.issue && `no. ${esc(p.issue)}`, pages, year, doi].filter(Boolean) as string[];
      break;
    case "conference":
    case "chapter":
      rest = [venue && `in <i>${venue}</i>`, type === "chapter" && pub, year, pages, doi].filter(Boolean) as string[];
      break;
    case "thesis":
      rest = [DEGREE_LABELS.ieee[degree(p)], esc(institution(p)), year].filter(Boolean);
      online = true;
      break;
    case "report":
      rest = [pub, "Tech. Rep.", year].filter(Boolean);
      online = true;
      break;
    default:
      rest = [venue && `<i>${venue}</i>`, year, doi].filter(Boolean) as string[];
      online = !doi;
  }
  // IEEE puts the comma inside the quotes: "Title," Journal, 2023.
  const head = join([authors, `"${withMark(title, rest.length ? "," : ".")}"`]);
  const url = online && !p.doi ? esc(p.url || p.openAccessUrl || "") : "";
  return `[${n}] ${head}${rest.length ? ` ${rest.join(", ")}.` : ""}${url ? ` [Online]. Available: ${url}` : ""}`;
}

export function formatCitation(p: Paper, style: CitationStyle, refNum?: number): string {
  switch (style) {
    case "apa":
      return apa(p);
    case "mla":
      return mla(p);
    case "ieee":
      return ieee(p, refNum ?? 1);
    case "chicago":
      return chicago(p);
  }
}

/** Short in-text citation, e.g. "(Smith & Doe, 2023)" or "[1]". */
export function inTextCitation(p: Paper, style: CitationStyle, refNum?: number): string {
  if (style === "ieee") return `[${refNum ?? 1}]`;
  let authors: string;
  const surname = (name: string) => (isGroupAuthor(name) ? name.trim() : name.trim().split(/\s+/).pop());
  if (!p.authors.length) {
    // No author: the first words of the title stand in, in quotation marks.
    const words = (p.title || "Untitled").split(/\s+/);
    const short = `${words.slice(0, 4).join(" ")}${words.length > 4 ? "…" : ""}`;
    // APA puts the comma inside the quotation marks: ("Short title," 2024).
    if (style === "apa") return `("${short}," ${yr(p, "n.d.")})`;
    authors = `"${short}"`;
  } else if (p.authors.length === 1) authors = surname(p.authors[0])!;
  else if (p.authors.length === 2) {
    // "&" is APA's; MLA and Chicago spell out "and".
    authors = `${surname(p.authors[0])} ${style === "apa" ? "&" : "and"} ${surname(p.authors[1])}`;
  } else authors = `${surname(p.authors[0])} et al.`;
  if (style === "apa") return `(${authors}, ${yr(p, "n.d.")})`;
  // MLA in-text is author (and page) only; a missing year used to leave
  // "(Smith et al. )".
  if (style === "mla") return `(${authors})`;
  return `(${authors} ${yr(p, "n.d.")})`;
}

/** Escape special BibTeX characters in field values. */
function bibtexEscape(s: string): string {
  return s.replace(/[&%#_${}\\]/g, (c) => `\\${c}`);
}

/**
 * A whole .bib file. Two papers by the same first author in the same year
 * with the same first title word share a cite key ("smith2023the"), and
 * BibTeX/biber silently drops the second; suffix repeats with b, c, ...
 */
export function toBibtexList(papers: Paper[]): string {
  const seen = new Map<string, number>();
  return papers
    .map((p) => {
      const entry = toBibtex(p);
      const key = entry.slice(entry.indexOf("{") + 1, entry.indexOf(","));
      const n = seen.get(key) ?? 0;
      seen.set(key, n + 1);
      if (n === 0) return entry;
      // b, c, ... z, then numbers.
      const suffix = n < 25 ? String.fromCharCode(97 + n) : String(n + 1);
      return entry.replace(`{${key},`, `{${key}${suffix},`);
    })
    .join("\n\n");
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
