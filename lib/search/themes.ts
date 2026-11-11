import type { Paper } from "@/lib/types";

/**
 * Group a ranked result set into themes by what the papers' own titles and
 * keywords talk about. No model: a theme is a word that recurs across several
 * papers, which is also why every group can be explained ("six papers about
 * 'supply chain'") instead of being an opaque cluster.
 *
 * The grouping is deliberately conservative. A theme needs at least two
 * papers; anything left over stays in a final "Other relevant work" group
 * rather than being forced into a bad theme.
 */

export interface ThemePaper {
  paper: Paper;
  /** Why this paper is here, in the student's words where possible. */
  why: string;
}

export interface Theme {
  label: string;
  /** The words that defined this group, for the heading tooltip. */
  terms: string[];
  papers: ThemePaper[];
}

/** Words too common to say anything about a paper. */
const GENERIC = new Set([
  "the", "a", "an", "of", "and", "in", "on", "for", "to", "with", "at", "by",
  "from", "as", "is", "are", "was", "were", "be", "been", "being", "this", "that",
  "these", "those", "its", "their", "our", "study", "studies", "research", "paper",
  "analysis", "review", "reviewing", "approach", "approaches", "case", "cases",
  "based", "using", "used", "use", "new", "effect", "effects", "impact", "impacts",
  "role", "relationship", "towards", "toward", "among", "between", "during",
  "development", "evaluation", "assessment", "investigation", "exploration",
  "qualitative", "quantitative", "empirical", "systematic", "literature",
  "article", "articles", "journal", "journals", "international", "national",
]);

const words = (text: string): string[] =>
  text
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\p{L}\p{N}\s-]/gu, " ")
    .split(/\s+/)
    .map((w) => w.replace(/^-+|-+$/g, ""))
    .filter((w) => w.length > 3 && !GENERIC.has(w) && !/^\d+$/.test(w));

/** "supply chain" -> "Supply chain": a heading, not a title. */
function labelFor(term: string): string {
  const [first, ...rest] = term.split(" ");
  return [first.charAt(0).toUpperCase() + first.slice(1), ...rest].join(" ");
}

/** Query words present in a paper, so the card can say what matched. */
function whyMatched(paper: Paper, terms: string[]): string {
  const haystack = `${paper.title} ${paper.abstract ?? ""} ${(paper.keywords ?? []).join(" ")}`.toLowerCase();
  const hits = terms.filter((t) => haystack.includes(t.toLowerCase())).slice(0, 3);
  return hits.length ? `matches ${hits.join(", ")}` : "matches the topic";
}

export function groupIntoThemes(
  papers: Paper[],
  queryTerms: string[],
  maxThemes = 5
): Theme[] {
  if (papers.length === 0) return [];

  // Count the topic words — and neighbouring pairs — that recur in titles.
  const lists = papers.map((p) => words(`${p.title} ${(p.keywords ?? []).join(" ")}`));
  const perPaper = lists.map((ws) => new Set(ws));
  const frequency = new Map<string, number>();
  const count = (phrase: string) => frequency.set(phrase, (frequency.get(phrase) ?? 0) + 1);
  for (const ws of lists) {
    for (const word of ws) count(word);
    // "supply chain" reads better as a heading than "supply".
    for (let i = 0; i < ws.length - 1; i++) count(`${ws[i]} ${ws[i + 1]}`);
  }

  const total = papers.length;
  const candidates = [...frequency.entries()]
    // A word in almost every paper describes the whole set, not a theme.
    .filter(([, hits]) => hits >= 2 && hits < Math.max(3, total * 0.6))
    .sort((a, b) => b[1] - a[1] || b[0].split(" ").length - a[0].split(" ").length || a[0].localeCompare(b[0]));

  const assigned = new Set<number>();
  const themes: Theme[] = [];

  for (const [term] of candidates) {
    if (themes.length >= maxThemes - 1) break;
    // "stores" after "store owners" adds nothing: skip phrases already covered.
    const covered = themes.some(
      (theme) => ` ${theme.terms[0]} `.includes(` ${term} `) || ` ${term} `.includes(` ${theme.terms[0]} `)
    );
    if (covered) continue;
    const parts = term.split(" ");
    const members = perPaper
      .map((set, i) => (parts.every((w) => set.has(w)) && !assigned.has(i) ? i : -1))
      .filter((i) => i >= 0);
    // One paper is a paper, not a theme.
    if (members.length < 2) continue;

    members.forEach((i) => assigned.add(i));
    themes.push({
      label: labelFor(term),
      terms: [term],
      papers: members.map((i) => ({ paper: papers[i], why: whyMatched(papers[i], queryTerms) })),
    });
  }

  const rest = papers
    .map((paper, i) => ({ paper, i }))
    .filter(({ i }) => !assigned.has(i))
    .map(({ paper }) => ({ paper, why: whyMatched(paper, queryTerms) }));

  if (rest.length) themes.push({ label: "Other relevant work", terms: [], papers: rest });

  // Bigger themes first, the leftovers last.
  return themes.sort((a, b) => {
    if (a.label === "Other relevant work") return 1;
    if (b.label === "Other relevant work") return -1;
    return b.papers.length - a.papers.length;
  });
}
