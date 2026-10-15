import { describe, expect, it } from "vitest";
import { bibtexText, parseBibtex, parseReferenceFile, parseRis } from "@/lib/library/import";
import { toBibtex, toRis } from "@/lib/citations";

const ZOTERO_BIB = `
@comment{jabref-meta: databaseType:bibtex;}
@string{jedu = "Journal of Education"}

@article{cruz_teacher_2023,
	title = {Teacher burnout in {Philippine} public schools (a mixed-methods study)},
	volume = {12},
	doi = {10.1234/jed.2023.5},
	journal = {Asia Pacific Journal of Education},
	author = {Cruz, Ana M. and Reyes, Jos{\\'e} and {Department of Education}},
	year = {2023},
	keywords = {burnout, teachers; workload},
	abstract = {We surveyed 400 teachers \\& 20 principals.},
}

@phdthesis{santos2019,
  author = "Santos, Maria",
  title = "Reading comprehension of {Grade} 7 learners",
  school = "University of the Philippines Diliman",
  year = 2019,
  url = "https://digitalarchives.upd.edu.ph/item/1/7/home"
}
`;

const MENDELEY_RIS = `TY  - JOUR
AU  - Cruz, Ana M.
AU  - Reyes, José
TI  - Teacher burnout in Philippine public schools
T2  - Asia Pacific Journal of Education
PY  - 2023
DO  - 10.1234/jed.2023.5
AB  - We surveyed 400 teachers.
KW  - burnout
KW  - teachers
ER  -

TY  - THES
A1  - Santos, Maria
T1  - Reading comprehension of Grade 7 learners
Y1  - 2019/05/01
PB  - University of the Philippines Diliman
UR  - https://digitalarchives.upd.edu.ph/item/1/7/home
ER  - `;

describe("parseBibtex", () => {
  const [a, b] = parseBibtex(ZOTERO_BIB);

  it("reads a Zotero article: braces, accents, escapes and author order", () => {
    expect(a).toMatchObject({
      title: "Teacher burnout in Philippine public schools (a mixed-methods study)",
      authors: ["Ana M. Cruz", "José Reyes", "Department of Education"],
      year: 2023,
      venue: "Asia Pacific Journal of Education",
      doi: "10.1234/jed.2023.5",
      abstract: "We surveyed 400 teachers & 20 principals.",
      keywords: ["burnout", "teachers", "workload"],
    });
  });

  it("reads quoted values, bare numbers, theses and skips @comment and @string", () => {
    expect(parseBibtex(ZOTERO_BIB)).toHaveLength(2);
    expect(b).toMatchObject({
      title: "Reading comprehension of Grade 7 learners",
      authors: ["Maria Santos"],
      year: 2019,
      type: "thesis",
      venue: "Doctoral thesis",
      publisher: "University of the Philippines Diliman",
      url: "https://digitalarchives.upd.edu.ph/item/1/7/home",
    });
  });

  it("reads the entry type, volume, number and pages", () => {
    expect(a).toMatchObject({ type: "article", volume: "12" });
    const [c] = parseBibtex("@inproceedings{k, title={T}, booktitle={Proc. X}, pages={45--67}, number={3}, publisher={IEEE}}");
    expect(c).toMatchObject({ type: "conference", venue: "Proc. X", pages: "45-67", issue: "3", publisher: "IEEE" });
  });

  it("decodes common LaTeX", () => {
    expect(bibtexText("{\\\"u}ber \\emph{Lernen} --- {\\c c}a")).toBe("über Lernen — ça");
  });
});

describe("parseRis", () => {
  it("reads Mendeley and EndNote tag variants", () => {
    const [a, b] = parseRis(MENDELEY_RIS);
    expect(a).toMatchObject({ title: "Teacher burnout in Philippine public schools", authors: ["Ana M. Cruz", "José Reyes"], year: 2023, doi: "10.1234/jed.2023.5", keywords: ["burnout", "teachers"] });
    expect(b).toMatchObject({ title: "Reading comprehension of Grade 7 learners", authors: ["Maria Santos"], year: 2019, type: "thesis", publisher: "University of the Philippines Diliman" });
  });

  it("keeps the reference type and reads volume, issue and pages", () => {
    const [a] = parseRis("TY  - JOUR\nTI  - T\nVL  - 12\nIS  - 3\nSP  - 45\nEP  - 67\nER  - ");
    expect(a).toMatchObject({ type: "article", volume: "12", issue: "3", pages: "45-67" });
    expect(parseRis("TY  - JOUR\nTI  - T\nSP  - 45-67\nER  - ")[0].pages).toBe("45-67");
  });
});

describe("parseReferenceFile", () => {
  it("tells the format from the content and makes library records", () => {
    const papers = parseReferenceFile(MENDELEY_RIS, 1000);
    expect(papers).toHaveLength(2);
    expect(papers[0]).toMatchObject({ id: "doi:10.1234/jed.2023.5", sources: ["imported"], savedAt: 1000, readingStatus: "to-read", tags: [] });
  });

  it("drops duplicates within one file and bad links", () => {
    const twice = `${MENDELEY_RIS}\n${MENDELEY_RIS}`.replace("https://digitalarchives", "javascript:alert(1)//digitalarchives");
    const papers = parseReferenceFile(twice);
    expect(papers).toHaveLength(2);
    expect(papers[1].url).toBeNull();
  });

  it("reads back what Thesisweb itself exports", () => {
    const paper = { id: "x", title: "A study", authors: ["Ana Cruz"], year: 2021, venue: "J", doi: "10.1234/x", sources: ["s"], abstract: "Line one." };
    expect(parseReferenceFile(toBibtex(paper))[0]).toMatchObject({ title: "A study", authors: ["Ana Cruz"], doi: "10.1234/x" });
    expect(parseReferenceFile(toRis(paper))[0]).toMatchObject({ title: "A study", abstract: "Line one." });
  });

  it("round-trips the record type and journal details through both formats", () => {
    const article = { id: "x", title: "A study", authors: ["Ana Cruz"], year: 2021, venue: "J", type: "article" as const, volume: "12", issue: "3", pages: "45-67", sources: ["s"] };
    const thesis = { id: "y", title: "A thesis", authors: ["Ana Cruz"], year: 2021, venue: "Master's thesis", type: "thesis" as const, publisher: "WVSU", sources: ["s"] };
    for (const out of [toBibtex, toRis]) {
      expect(parseReferenceFile(out(article))[0]).toMatchObject({ type: "article", venue: "J", volume: "12", issue: "3", pages: "45-67" });
      expect(parseReferenceFile(out(thesis))[0]).toMatchObject({ type: "thesis", venue: "Master's thesis", publisher: "WVSU" });
    }
  });

  it("says so when the file has no references", () => {
    expect(() => parseReferenceFile("just some notes")).toThrow(/No references found/);
  });
});
