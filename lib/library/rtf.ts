import { citationToText } from "@/lib/citations";

/**
 * Rich Text Format (.rtf) output: Word, Google Docs, LibreOffice and WPS all
 * open it, and unlike pasted text it keeps hanging indents, italics, line
 * spacing and tables. No library is needed: RTF is plain text with a few
 * control words.
 */

/** Text for an RTF body: \ { } escaped, non-ASCII as \uN? escapes, line breaks as \line. */
export function rtfText(s: string): string {
  let out = "";
  for (const ch of s) {
    const code = ch.codePointAt(0)!;
    if (ch === "\\" || ch === "{" || ch === "}") out += `\\${ch}`;
    else if (ch === "\n") out += "\\line ";
    else if (code < 128) out += ch;
    else {
      // RTF takes signed 16-bit units, so characters past U+FFFF go as a surrogate pair.
      for (const unit of ch.length === 2 ? [ch.charCodeAt(0), ch.charCodeAt(1)] : [code]) {
        out += `\\u${unit > 32767 ? unit - 65536 : unit}?`;
      }
    }
  }
  return out;
}

/** A formatCitation() result (HTML with <i> for titles) as RTF, italics kept. */
export function citationToRtf(html: string): string {
  return html
    .split(/(<\/?i>)/)
    .map((part) => (part === "<i>" ? "{\\i " : part === "</i>" ? "}" : rtfText(citationToText(part))))
    .join("");
}

/** A whole RTF document in 12 pt Times New Roman around `body`. */
export function rtfDocument(body: string, landscape = false): string {
  const page = landscape ? "\\landscape\\paperw15840\\paperh12240" : "\\paperw12240\\paperh15840";
  return `{\\rtf1\\ansi\\ansicpg1252\\deff0{\\fonttbl{\\f0\\froman Times New Roman;}}${page}\\margl1440\\margr1440\\margt1440\\margb1440\\f0\\fs24 ${body}}`;
}

/**
 * A reference list: a centred bold title, optional bold group headings, and
 * entries with a 0.5 inch hanging indent, double-spaced unless `single`.
 */
export function referenceListRtf(
  groups: { heading: string | null; entries: string[] }[],
  { title = "References", single = false }: { title?: string; single?: boolean } = {}
): string {
  const spacing = single ? "\\sl240\\slmult1" : "\\sl480\\slmult1";
  const parts = [`\\pard\\qc${spacing}\\b ${rtfText(title)}\\b0\\par`];
  for (const g of groups) {
    if (g.heading) parts.push(`\\pard\\ql${spacing}\\b ${rtfText(g.heading)}\\b0\\par`);
    for (const e of g.entries) parts.push(`\\pard\\ql\\li720\\fi-720${spacing} ${citationToRtf(e)}\\par`);
  }
  return rtfDocument(parts.join("\n"));
}

/** A table with a bold header row; column widths in inches. */
export function tableRtf(headers: string[], rows: string[][], widthsInches: number[]): string {
  const cells = widthsInches.reduce<number[]>((acc, w) => [...acc, (acc.at(-1) ?? 0) + Math.round(w * 1440)], []);
  const border = "\\clbrdrt\\brdrs\\brdrw10\\clbrdrl\\brdrs\\brdrw10\\clbrdrb\\brdrs\\brdrw10\\clbrdrr\\brdrs\\brdrw10";
  const rowDef = `\\trowd\\trgaph108\\trleft0${cells.map((x) => `${border}\\cellx${x}`).join("")}`;
  const row = (values: string[], bold: boolean) =>
    `${rowDef}${bold ? "\\trhdr" : ""}\n${values
      .map((v) => `\\pard\\intbl\\ql\\fs20${bold ? "\\b" : ""} ${rtfText(v)}${bold ? "\\b0" : ""}\\cell`)
      .join("\n")}\n\\row`;
  return [row(headers, true), ...rows.map((r) => row(r, false))].join("\n");
}
