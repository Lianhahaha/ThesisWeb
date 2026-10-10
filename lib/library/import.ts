import { normalizePaper } from "@/lib/sources/normalize";
import { flipName } from "@/lib/text";
import { paperId } from "@/lib/utils";
import type { Paper, SavedPaper } from "@/lib/types";
import { MAX_IMPORT } from "@/lib/library/backup";

/**
 * Reading reference files exported from Zotero, Mendeley, EndNote or Google
 * Scholar (BibTeX .bib and RIS .ris) into the library. The files are
 * untrusted text, so every record goes through normalizePaper like a search
 * result, and records without a title are skipped.
 */

/** Source id shown for papers that came from a file rather than a database. */
export const IMPORT_SOURCE = "imported";

/** Largest file read, so a wrong file can't freeze the tab. */
export const MAX_IMPORT_BYTES = 5 * 1024 * 1024;

type Draft = Pick<Paper, "title" | "authors" | "year" | "venue" | "doi" | "abstract" | "url" | "keywords">;

// --- BibTeX ---------------------------------------------------------------

/** LaTeX accents and escapes that reference managers write into .bib files. */
const ACCENTS: Record<string, string> = { "'": "́", "`": "̀", '"': "̈", "^": "̂", "~": "̃", c: "̧" };

/** Plain text from a BibTeX value: accents decoded, braces and escapes removed. */
export function bibtexText(s: string): string {
  return s
    .replace(/\{?\\([`'"^~c])\s*\{?([a-zA-Z])\}?\}?/g, (_, mark: string, ch: string) => (ch + ACCENTS[mark]).normalize("NFC"))
    .replace(/\\(?:textit|textbf|emph|mkbibemph)\{([^{}]*)\}/g, "$1")
    .replace(/\\([&%$#_{}])/g, "$1")
    .replace(/[{}]/g, "")
    .replace(/~/g, " ")
    .replace(/---/g, "—")
    .replace(/--/g, "–")
    .replace(/\s+/g, " ")
    .trim();
}

/** The value starting at s[i] (after "="): {braced}, "quoted" or a bare word. Returns [value, next index]. */
function readValue(s: string, i: number): [string, number] {
  while (/\s/.test(s[i] ?? "")) i++;
  if (s[i] === "{") {
    let depth = 0;
    for (let j = i; j < s.length; j++) {
      if (s[j] === "{" && s[j - 1] !== "\\") depth++;
      else if (s[j] === "}" && s[j - 1] !== "\\" && --depth === 0) return [s.slice(i + 1, j), j + 1];
    }
    return [s.slice(i + 1), s.length];
  }
  if (s[i] === '"') {
    let depth = 0;
    for (let j = i + 1; j < s.length; j++) {
      if (s[j] === "{") depth++;
      else if (s[j] === "}") depth--;
      else if (s[j] === '"' && depth === 0 && s[j - 1] !== "\\") return [s.slice(i + 1, j), j + 1];
    }
    return [s.slice(i + 1), s.length];
  }
  const m = /^[^,}\s]+/.exec(s.slice(i));
  return [m ? m[0] : "", i + (m ? m[0].length : 0)];
}

/** The fields of one entry body ("key, title = {...}, year = 2020"). */
function bibtexFields(body: string): Record<string, string> {
  const fields: Record<string, string> = {};
  const re = /([A-Za-z][\w-]*)\s*=\s*/g;
  // Skip the cite key: everything up to the first comma.
  re.lastIndex = body.indexOf(",") + 1;
  let m: RegExpExecArray | null;
  while ((m = re.exec(body))) {
    const [value, next] = readValue(body, re.lastIndex);
    fields[m[1].toLowerCase()] = value;
    re.lastIndex = next;
  }
  return fields;
}

/** Entries of a .bib file as drafts. @comment, @string and @preamble blocks are skipped. */
export function parseBibtex(text: string): Draft[] {
  const drafts: Draft[] = [];
  const start = /@([A-Za-z]+)\s*[{(]/g;
  let m: RegExpExecArray | null;
  while ((m = start.exec(text))) {
    const type = m[1].toLowerCase();
    // The entry runs to the delimiter matching the one that opened it, so a
    // stray "(" inside a braced title doesn't swallow the next entry.
    const [open, close] = text[start.lastIndex - 1] === "(" ? ["(", ")"] : ["{", "}"];
    let depth = 1;
    let j = start.lastIndex;
    for (; j < text.length && depth > 0; j++) {
      if (text[j] === open && text[j - 1] !== "\\") depth++;
      else if (text[j] === close && text[j - 1] !== "\\") depth--;
    }
    const body = text.slice(start.lastIndex, j - 1);
    start.lastIndex = j;
    if (type === "comment" || type === "string" || type === "preamble") continue;

    const f = bibtexFields(body);
    const title = bibtexText(f.title ?? "");
    if (!title) continue;
    drafts.push({
      title,
      authors: (f.author ?? "")
        .split(/\s+and\s+/i)
        .map((a) => flipName(bibtexText(a)))
        .filter(Boolean),
      year: Number(/\d{4}/.exec(f.year ?? f.date ?? "")?.[0]) || null,
      venue: bibtexText(f.journal ?? f.journaltitle ?? f.booktitle ?? f.school ?? f.institution ?? f.publisher ?? "") || null,
      doi: bibtexText(f.doi ?? "") || null,
      abstract: bibtexText(f.abstract ?? "") || null,
      url: bibtexText(f.url ?? "") || null,
      keywords: bibtexText(f.keywords ?? f.keyword ?? "").split(/\s*[,;]\s*/).filter(Boolean),
    });
  }
  return drafts;
}

// --- RIS --------------------------------------------------------------------

/** Records of a .ris file as drafts. */
export function parseRis(text: string): Draft[] {
  const drafts: Draft[] = [];
  let tags: Record<string, string[]> = {};
  const first = (...keys: string[]) => keys.map((k) => tags[k]?.[0]).find(Boolean) ?? null;
  const flush = () => {
    const title = first("TI", "T1", "CT", "BT");
    if (title) {
      drafts.push({
        title: title.trim(),
        authors: [...(tags.AU ?? []), ...(tags.A1 ?? [])].map((a) => flipName(a.trim())).filter(Boolean),
        year: Number(/\d{4}/.exec(first("PY", "Y1", "DA") ?? "")?.[0]) || null,
        venue: first("T2", "JO", "JF", "JA", "J2", "PB"),
        doi: first("DO"),
        abstract: first("AB", "N2"),
        url: first("UR", "L1"),
        keywords: tags.KW ?? [],
      });
    }
    tags = {};
  };
  for (const line of text.split(/\r?\n/)) {
    const m = /^([A-Z][A-Z0-9])  -\s?(.*)$/.exec(line);
    if (!m) continue;
    const [, tag, value] = m;
    if (tag === "ER") flush();
    else if (tag === "TY") tags = {};
    else if (value.trim()) (tags[tag] ??= []).push(value.trim());
  }
  flush(); // a last record with no ER line
  return drafts;
}

// --- Both -----------------------------------------------------------------

/**
 * Papers from the text of a .bib or .ris file, ready for savePapers. The format
 * is told from the content, not the file name. Throws when the file holds no
 * readable references, so the UI can say so.
 */
export function parseReferenceFile(text: string, now = Date.now()): SavedPaper[] {
  const isRis = /^\s*TY  - /m.test(text);
  const drafts = isRis ? parseRis(text) : /@[A-Za-z]+\s*[{(]/.test(text) ? parseBibtex(text) : [];
  const out: SavedPaper[] = [];
  const seen = new Set<string>();
  for (const d of drafts.slice(0, MAX_IMPORT)) {
    const p = normalizePaper(
      { ...d, id: paperId(d.doi, d.title), sources: [IMPORT_SOURCE], isOpenAccess: false },
      IMPORT_SOURCE
    );
    if (!p || seen.has(p.id)) continue;
    seen.add(p.id);
    out.push({ ...p, savedAt: now, tags: [], readingStatus: "to-read" });
  }
  if (out.length === 0) {
    throw new Error("No references found. Export a .bib (BibTeX) or .ris file from Zotero, Mendeley or EndNote.");
  }
  return out;
}
