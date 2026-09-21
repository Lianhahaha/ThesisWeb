/**
 * Small text helpers shared by the source adapters. Every academic API returns
 * slightly different markup, so normalizing it in one place keeps the adapters
 * short and the results consistent.
 */

/** Decode the common named and numeric HTML/XML entities. */
export function decodeEntities(s: string): string {
  return s
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;|&#0?39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    // Common Latin-1 named entities that show up in repository abstracts.
    .replace(/&([aeiouAEIOU])(acute|grave|uml|circ|tilde);/g, (_, v, kind) => {
      const marks: Record<string, string> = { acute: "́", grave: "̀", uml: "̈", circ: "̂", tilde: "̃" };
      return (v + marks[kind]).normalize("NFC");
    })
    .replace(/&ccedil;/g, "ç")
    .replace(/&ntilde;/g, "ñ")
    .replace(/&amp;/g, "&"); // last, so "&amp;lt;" stays a literal "&lt;"
}

/** Strip HTML/JATS tags and collapse whitespace; returns plain text. */
export function stripHtml(s: string): string {
  return decodeEntities(s.replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim();
}

/**
 * Many APIs list authors "Family, Given"; the rest of the app stores
 * "Given Family". Names without a comma are returned unchanged.
 */
export function flipName(name: string): string {
  const i = name.indexOf(",");
  if (i === -1) return name.trim();
  const family = name.slice(0, i).trim();
  const given = name.slice(i + 1).trim();
  return given ? `${given} ${family}` : family;
}

/** Pull a bare DOI ("10.1234/abc") out of a URL or free text; null if none. */
export function extractDoi(s: string | null | undefined): string | null {
  if (!s) return null;
  const m = s.match(/\b(10\.\d{4,9}\/[^\s"<>]+)/i);
  // Trailing punctuation is almost never part of the DOI.
  return m ? m[1].replace(/[.,;)\]]+$/, "") : null;
}

/** First 4-digit year (1500-2100) found in a string, or null. */
export function extractYear(s: string | null | undefined): number | null {
  const m = s?.match(/\b(1[5-9]\d\d|20\d\d|2100)\b/);
  return m ? Number(m[1]) : null;
}
