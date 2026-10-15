import { ALL_COUNTRIES, COUNTRY_TERMS } from "@/lib/countries";

/**
 * Title capitalisation for citations. APA 7 wants reference titles in
 * sentence case ("Teacher burnout in public schools"), MLA and Chicago in
 * title case ("Teacher Burnout in Public Schools"), and every style wants a
 * journal's name in title case. Databases send all three ways, and many
 * Philippine theses arrive in capitals.
 *
 * Lowercasing is the risky direction: it can't tell a proper noun from a
 * common one. So a title is only rewritten when it is clearly in title case
 * or all capitals; acronyms, mixed-case words (DepEd, COVID-19), places,
 * peoples and languages (countries and Philippine regions, provinces and
 * cities, a place before "City" or ", Philippines", a named school) keep their
 * capitals, as do a word before a number ("Grade 10") and the first word of a
 * subtitle. Titles in Spanish, Portuguese or French are
 * left alone, as their own rules differ. Students should still check names
 * of people, institutions and theories.
 */

/** Words that stay lowercase inside a title-case title (MLA 9 and Chicago 17: articles, conjunctions, prepositions). */
const MINOR = new Set(
  (
    "a an the and but or nor for so yet as at by in of off on per to up via vs versus " +
    "from into onto upon over under with about among amid between through during without within across " +
    "against along around before behind below beneath beside beyond despite except inside outside since " +
    "toward towards until than"
  ).split(" ")
);

/** Particles of non-English names and journals that stay lowercase ("Revista de Educación"). */
const PARTICLES = new Set("de del la las los le les des du da do dos das di e y et und van von der den".split(" "));

/** Philippine places and peoples, beyond the country itself, that a study's title often names. */
const PH_NAMES = [
  "Metro Manila", "Manila", "Quezon City", "Quezon", "Luzon", "Visayas", "Mindanao", "Western Visayas", "Central Visayas",
  "Eastern Visayas", "Northern Mindanao", "Cordillera", "CALABARZON", "MIMAROPA", "BARMM", "Caraga", "Bicol", "Ilocos",
  "Cagayan Valley", "Cagayan de Oro", "Cebu", "Davao", "Iloilo", "Baguio", "Bacolod", "Tacloban", "Dumaguete",
  "Zamboanga", "General Santos", "Butuan", "Iligan", "Legazpi", "Naga", "Olongapo", "Angeles", "Lipa", "Antipolo",
  "Calamba", "Tagaytay", "Puerto Princesa", "Vigan", "Laoag", "Dagupan", "Tuguegarao", "Makati", "Pasig", "Taguig",
  "Caloocan", "Marikina", "Muntinlupa", "Parañaque", "Las Piñas", "Valenzuela", "Malabon", "Navotas", "Mandaluyong",
  "Pasay", "Pampanga", "Bulacan", "Cavite", "Laguna", "Batangas", "Rizal", "Pangasinan", "Tarlac", "Nueva Ecija",
  "Zambales", "Bataan", "Benguet", "Isabela", "Leyte", "Samar", "Bohol", "Negros", "Panay", "Palawan", "Mindoro",
  "Marinduque", "Romblon", "Albay", "Sorsogon", "Masbate", "Camarines Sur", "Camarines Norte", "Catanduanes",
  "Aklan", "Antique", "Capiz", "Guimaras", "Siquijor", "Biliran", "Cotabato", "Bukidnon", "Lanao", "Maguindanao",
  "Sulu", "Basilan", "Tawi-Tawi", "Surigao", "Agusan", "Misamis", "Sarangani", "Pilipinas",
  "Tagalog", "Cebuano", "Bisaya", "Visayan", "Hiligaynon", "Ilonggo", "Ilocano", "Bikolano", "Kapampangan", "Waray",
  "Chavacano", "Maranao", "Tausug", "Lumad", "Aeta", "Mangyan", "Igorot", "Moro",
];

/** Languages, regions, religions, months and days: capitalised in every style. */
const OTHER_NAMES = [
  "English", "Spanish", "Mandarin", "Arabic", "Malay", "Bahasa", "Latin", "Asian", "Asia", "Southeast Asia",
  "European", "Europe", "African", "Africa", "Latin America", "Western", "ASEAN", "Christian", "Catholic", "Muslim",
  "Islamic", "Islam", "Buddhist", "Protestant", "Adventist", "Bible", "Biblical", "God", "Internet",
  "January", "February", "March", "April", "June", "July", "August", "September", "October", "November", "December",
  "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday", "K to 12",
];

const norm = (w: string) => w.toLowerCase().replace(/[’']s$/, "").replace(/[^\p{L}\p{N}-]/gu, "");

/** Each name as its words, lowercased; matched as a phrase so "United States" stays whole. */
const PROPER: string[][] = [
  ...new Set([...ALL_COUNTRIES, ...Object.values(COUNTRY_TERMS).flat(), ...PH_NAMES, ...OTHER_NAMES]),
]
  .map((name) => name.split(/\s+/).map(norm).filter(Boolean))
  .filter((words) => words.length > 0);

/** Words that belong to the place name before them: "Davao City", "Iloilo Province". */
const PLACE_SUFFIX = new Set("city province region island islands bay river lake municipality".split(" "));

/** The last word of a named institution: "Cecilio Apostol Elementary School". */
const INSTITUTION = new Set("school university college hospital institute academy center centre".split(" "));

/** Words that describe an institution without naming it: "a Public High School" is not a name. */
const GENERIC = new Set(
  (
    "public private elementary high secondary senior junior national state integrated central science technical " +
    "vocational normal medical community graduate regional provincial city municipal local selected their our the a an"
  ).split(" ")
);

const startsUpper = (w: string) => /^[^\p{L}]*\p{Lu}/u.test(w);

/**
 * Indices of the words that are part of a proper name: known names (as
 * phrases, so "United States" stays whole), a place before "City" or before
 * ", Philippines", a named school or university, and "May" beside a year or
 * month.
 */
function properWords(words: string[]): Set<number> {
  const keys = words.map(norm);
  const out = new Set<number>();
  for (const name of PROPER) {
    for (let i = 0; i + name.length <= keys.length; i++) {
      if (name.every((w, j) => keys[i + j] === w)) for (let j = 0; j < name.length; j++) out.add(i + j);
    }
  }
  for (let i = 0; i < words.length; i++) {
    // "Davao City", "Gingoog City": the suffix and the name before it.
    if (PLACE_SUFFIX.has(keys[i]) && startsUpper(words[i]) && i > 0 && startsUpper(words[i - 1]) && !MINOR.has(keys[i - 1])) {
      out.add(i).add(i - 1);
    }
    // "in Gumaca, Quezon" / "San Jose, Philippines": capitalised words before a comma and a known place.
    if (/,$/.test(words[i]) && out.has(i + 1)) {
      for (let j = i; j >= 0 && startsUpper(words[j]) && !MINOR.has(keys[j]); j--) out.add(j);
    }
    // "May" is a month only beside a year, a day or another month.
    if (keys[i] === "may" && startsUpper(words[i]) && (/^\d|^[–—-]$/.test(words[i + 1] ?? "") || /\d$/.test(words[i - 1] ?? ""))) out.add(i);
  }
  // No capitals for the words an acronym stands for ("senior high school (SHS)"): APA 7 (6.14)
  // capitalises them only when they are a proper noun, which the words alone can't show.
  // "Cecilio Apostol Elementary School", "Philippine Normal University": a run of capitalised words
  // ending in an institution word, if at least one of them names it rather than describes it.
  for (let i = 0; i < words.length; i++) {
    if (!INSTITUTION.has(keys[i]) || !startsUpper(words[i])) continue;
    const run: number[] = [i];
    for (let j = i - 1; j >= 0 && startsUpper(words[j]) && !MINOR.has(keys[j]); j--) run.push(j);
    if (run.slice(1).some((j) => !GENERIC.has(keys[j]))) for (const j of run) out.add(j);
  }
  for (const i of [...out]) if (PLACE_SUFFIX.has(keys[i + 1] ?? "")) out.add(i + 1);
  return out;
}

/** True if the word has a capital after its first letter (COVID-19, DepEd, iPhone, STEM). */
const hasInnerCapital = (w: string) => /\p{L}.*\p{Lu}/u.test(w.replace(/^[^\p{L}]+/u, ""));

/** Uppercase the first letter, leaving the rest. */
const capitalize = (w: string) => w.replace(/\p{L}/u, (c) => c.toUpperCase());

/** True after a colon, question mark, exclamation mark or dash: the next word starts a subtitle. */
const endsClause = (w: string) => /[:?!]$|^[–—-]$/.test(w);

const ENGLISH = new Set("the of and in on for to with a an among between students study effects".split(" "));
const FOREIGN = new Set("de la el los las en y para por com da das dos não à le les des du et une pour sur une dans".split(" "));

/** False for a title that reads as Spanish, Portuguese or French, whose capitalisation follows other rules. */
export function looksEnglish(title: string): boolean {
  let en = 0;
  let foreign = 0;
  for (const w of title.toLowerCase().split(/\s+/)) {
    if (ENGLISH.has(w)) en++;
    if (FOREIGN.has(w)) foreign++;
  }
  return foreign <= en;
}

/** Letters of the title that are capitals, as a share; 1 for an all-caps title. */
function capitalShare(title: string): number {
  const letters = title.match(/\p{L}/gu) ?? [];
  if (letters.length === 0) return 0;
  return letters.filter((c) => c === c.toUpperCase() && c !== c.toLowerCase()).length / letters.length;
}

/** Share of the longer content words that start with a capital. */
function capitalisedWordShare(words: string[]): number {
  const content = words.slice(1).filter((w) => /^\p{L}/u.test(w) && w.length > 3 && !MINOR.has(w.toLowerCase()));
  if (content.length === 0) return 0;
  return content.filter((w) => /^\p{Lu}/u.test(w)).length / content.length;
}

/** Acronyms kept in capitals when a whole title arrives in capitals. */
const ACRONYMS = new Set(
  (
    "AI ICT IT STEM ABM HUMSS GAS TVL SHS JHS LGU LGUS NGO NGOS BPO OFW OFWS GPA SDG SDGS UN WHO HIV AIDS ADHD ESL EFL " +
    "IOT PE MAPEH ESP DEPED CHED TESDA DOST DSWD DOH PNP AFP BSP NEDA PIDS UP PUP PNU USA UK EU MSME MSMES SME SMES " +
    "COVID PWD PWDS LGBT LGBTQ GIS GDP STI STIS TB CPR ICU BMI CSR HR ROI KPI MOOC LMS NCR CALABARZON MIMAROPA BARMM ASEAN"
  ).split(" ")
);

/**
 * APA 7 sentence case: first word, first word of a subtitle and proper nouns
 * capitalised, the rest lowercase. A title already in sentence case, or not
 * in English, is returned as it is.
 */
export function sentenceCase(title: string): string {
  const words = title.split(/\s+/).filter(Boolean);
  if (words.length < 2 || !looksEnglish(title)) return title;
  const allCaps = capitalShare(title) > 0.8;
  if (!allCaps && capitalisedWordShare(words) < 0.6) return title;

  const proper = properWords(words);
  return words
    .map((word, i) => {
      const startsClause = i === 0 || endsClause(words[i - 1]);
      // "Grade 10", "Table 2", "Vol. XVII"; not "in 2020".
      const beforeNumber = /^(?:\d|[IVXLC]{2,}[.,]?$)/.test(words[i + 1] ?? "") && !MINOR.has(norm(word));
      // "(LET)" after a name: an acronym, also in an all-caps title.
      if (/^\(\p{Lu}[\p{Lu}-]{1,9}\)[,.;:]?$/u.test(word)) return word;
      const parts = word.split("-").map((part, j) => {
        if (/\d/.test(part) && allCaps) return part; // COVID-19, K-12
        if (!allCaps && hasInnerCapital(part)) return part;
        if (allCaps && ACRONYMS.has(part.replace(/[^\p{L}\p{N}]/gu, "").toUpperCase())) return part;
        if (proper.has(i)) return allCaps ? capitalize(part.toLowerCase()) : part;
        if ((startsClause || beforeNumber) && j === 0) return capitalize(part.toLowerCase());
        if (part === "I") return part;
        return part.toLowerCase();
      });
      return parts.join("-");
    })
    .join(" ");
}

/**
 * MLA 9 / Chicago 17 title case: every word capitalised except articles,
 * conjunctions and prepositions inside the title; acronyms and mixed-case
 * words stay. An all-caps title is first brought down to sentence case.
 * Titles not in English are returned as they are.
 */
export function titleCase(title: string): string {
  if (!looksEnglish(title)) return title;
  const base = capitalShare(title) > 0.8 ? sentenceCase(title) : title;
  const words = base.split(/\s+/).filter(Boolean);
  return words
    .map((word, i) => {
      const edge = i === 0 || i === words.length - 1 || endsClause(words[i - 1]);
      return word
        .split("-")
        .map((part, j) => {
          if (hasInnerCapital(part)) return part;
          const bare = part.toLowerCase().replace(/[^\p{L}]/gu, "");
          if (!(edge && j === 0) && (MINOR.has(bare) || (j === 0 && PARTICLES.has(bare) && i > 0))) return part.toLowerCase();
          return capitalize(part);
        })
        .join("-");
    })
    .join(" ");
}

/**
 * A journal or book name in title case, if the source sent it lowercased
 * ("Frontiers in psychology"); names already capitalised are left exactly as
 * they are ("PLOS ONE", "eLife", "Revista de Educación").
 */
export function containerCase(name: string): string {
  const words = name.split(/\s+/).filter(Boolean);
  const lowered = words.slice(1).some((w) => /^\p{Ll}{4,}/u.test(w) && !MINOR.has(w.toLowerCase()) && !PARTICLES.has(w.toLowerCase()));
  return lowered && looksEnglish(name) ? titleCase(name) : name;
}
