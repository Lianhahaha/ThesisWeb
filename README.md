# ThesisWeb

ThesisWeb helps thesis students find related literature (RRL) fast, keep the papers they need, and check their own writing before submitting.

- **Find** — one search box queries 18 free academic databases at once, merges duplicates and ranks the results.
- **Keep** — save papers, group them by chapter, take notes, compare them in a synthesis matrix and export citations.
- **Check** — paste a paragraph and see which writing patterns make it read as AI-generated, with suggested edits.

It is free, needs no account to search, and only links to legal open-access full text.

## Contents

1. [Features](#features)
2. [Databases searched](#databases-searched)
3. [How results are ranked](#how-results-are-ranked)
4. [Getting started](#getting-started)
5. [Environment variables](#environment-variables)
6. [Deploying to Vercel](#deploying-to-vercel)
7. [Project structure](#project-structure)
8. [How it works](#how-it-works)
9. [Data and privacy](#data-and-privacy)
10. [Known limits](#known-limits)
11. [Adding a database](#adding-a-database)
12. [Ethics and legal](#ethics-and-legal)

---

## Features

### Search (`/search`)

- Queries every database in parallel. A slow or failing database never blocks the rest: each has its own time limit.
- **Published since** filter. Defaults to the last 5 years, which is what most thesis rubrics ask for.
- **Country focus** filter. Adds the country name and its common adjective (for example *Philippines* and *Filipino*) to your words to surface local studies.
- **Free full text only** filter.
- **Sort** by best match, most cited, newest or oldest, and **filter by source**. Both work on the results already loaded, with no new request.
- **Related topics**: terms taken from the keywords of your results, to help you narrow a search when you do not know the field's vocabulary yet.
- **Retraction warning** on papers that OpenAlex marks as retracted.
- **Shareable links**: the search is stored in the URL (`/search?q=…&from=2021&country=Philippines`), so it survives a refresh and can be sent to a classmate.
- **Recent searches**, kept in your browser.
- Each result shows authors, year, venue, abstract, an open-access marker, citation count, relevance score and which databases returned it.

### Paper page (`/paper/[id]`)

- Abstract, plus a one-sentence TL;DR when Semantic Scholar provides one.
- **Find free PDF** looks up a legal open-access copy through Unpaywall when the paper has a DOI.
- **Extract key points** builds a summary from the authors' own sentences. It never writes new text.
- **Explore citations**: papers that cite it, papers it cites and similar papers (from OpenAlex), for growing a review from one good paper.
- Citation in APA, MLA, IEEE and Chicago, with the in-text form, plus BibTeX.
- Private notes.

### Library (`/library`)

- Save with one click. Group papers into collections such as *Foreign studies* or *Theoretical framework*.
- **Synthesis matrix**: a table of *Method, Findings, Limitations, Relevance to my topic* for every saved paper. Cells save when you leave them.
- **Export** a reference list and in-text list in four styles, or download BibTeX (`.bib`) and RIS (`.ris`) for Zotero, Mendeley and EndNote.

### AI self-check (`/ai-check`)

Flags six style signals: sentence-length uniformity, vocabulary richness, transition-word density, formulaic openers, AI-typical vocabulary and predictability of word pairs. It highlights the flagged words and suggests a fix for each issue.

This is a rule-based estimate, not a trained classifier. It cannot predict what Turnitin or any other tool will report. It is a writing coach, not a detection-evasion tool.

### Accounts (`/login`, `/settings`)

Optional. An account keeps your library in the cloud. Settings has display name, recovery PIN, password and email changes. `/forgot-password` recovers an account with the PIN.

---

## Databases searched

All are free to use. Databases marked **key** are skipped until their API key is set.

| Database | Covers | Best for |
|---|---|---|
| [OpenAlex](https://openalex.org) | 250M+ works in every field | A broad first pass; citation data |
| [Crossref](https://www.crossref.org) | Publisher-deposited metadata and DOIs | Accurate citation details |
| [Semantic Scholar](https://www.semanticscholar.org) | Papers in all fields | TL;DR summaries |
| [DOAJ](https://doaj.org) | Fully open-access journals | Guaranteed free text |
| [Europe PMC](https://europepmc.org) | Life sciences, biomedical, preprints | Health, nursing, psychology |
| [PubMed](https://pubmed.ncbi.nlm.nih.gov) | Biomedical and health literature | Medical and public-health studies |
| [arXiv](https://arxiv.org) | Preprints in physics, maths, CS, economics | Very recent technical work |
| [ERIC](https://eric.ed.gov) | Education research (U.S. Dept. of Education) | Education and teaching topics |
| [Zenodo](https://zenodo.org) | Open articles, theses, reports (CERN) | Small-journal papers, theses |
| [HAL](https://hal.science) | French national open archive | Social science, engineering, humanities |
| [OpenAIRE](https://explore.openaire.eu) | European open-science graph | Repository copies, funded research |
| [INSPIRE-HEP](https://inspirehep.net) | High-energy physics, astrophysics | Physics topics |
| [PLOS](https://plos.org) | PLOS ONE, Medicine, Biology, more | Science and health, always open |
| [DataCite Theses](https://commons.datacite.org) | Theses from university repositories | Local and foreign thesis studies |
| [OAPEN Books](https://oapen.org) | Open-access academic books | Theoretical frameworks |
| [CORE](https://core.ac.uk) — **key** | Open-access repositories and theses | Repository copies |
| [BASE](https://www.base-search.net) — **key** | Institutional repositories | Theses, grey literature |
| [Google Scholar](https://scholar.google.com) | Broad web index | Papers others miss |

Google Scholar has no official API. ThesisWeb uses an unofficial lookup that Google often blocks, so treat it as a bonus. CORE trial keys expire and then need a licence; an expired key makes CORE fail on every search.

---

## How results are ranked

After the databases answer, ThesisWeb removes duplicates (same DOI, or same title and year) and scores each paper against your words, using stemming so *teacher* matches *teachers*:

1. Share of your words in the **title** (up to 40 points).
2. Share of your words in the **abstract** (up to 15).
3. All words together and in order, in the title or abstract (up to 30).
4. Matching word pairs (up to 10).
5. Your words near the start of the title (up to 5).
6. Recency (up to 3) and citation count (up to 5).

A paper is dropped when fewer than 25% of your words appear in its title and fewer than 30% appear in its abstract. The score shown on each result is out of 100. It measures how closely the text matches your words, not the quality of the paper. Read the abstract before you cite.

The code is in [`lib/dedupe.ts`](lib/dedupe.ts).

---

## Getting started

**Requirements:** Node.js 18 or newer, npm.

```bash
git clone <your-fork-url>
cd ThesisWeb
npm install
cp .env.example .env.local     # then edit .env.local
npm run dev
```

Open <http://localhost:3000>.

```bash
npm run build     # production build
npm start         # serve the production build
npm run lint      # ESLint
npx tsc --noEmit  # type check
```

---

## Environment variables

Copy `.env.example` to `.env.local`. Never commit `.env.local`; it is git-ignored.

| Variable | Needed? | What it does |
|---|---|---|
| `NEXT_PUBLIC_FIREBASE_*` (7 values) | Yes | Firebase web config for accounts and the cloud library. From Firebase console → Project settings → Your apps. |
| `CONTACT_EMAIL` | Recommended | A real email sent to OpenAlex, Crossref, PubMed, Zenodo and other free APIs. Identified requests get faster, more reliable limits. Falls back to `UNPAYWALL_EMAIL`. |
| `UNPAYWALL_EMAIL` | Recommended | A real email for Unpaywall. Without it, **Find free PDF** is disabled. |
| `SEMANTIC_SCHOLAR_API_KEY` | Recommended | Sent as the `x-api-key` header. Allows 1 request per second, and ThesisWeb paces itself to stay under that. Without a key you share a public pool that is often rate-limited. |
| `OPENALEX_API_KEY` | Recommended | Free key from <https://openalex.org/settings/api>. OpenAlex pauses anonymous searches whenever it is under load, and OpenAlex is the biggest source, so set this for production. |
| `CORE_API_KEY` | Optional | Enables CORE. |
| `BASE_API_KEY` | Optional | Enables BASE. |

Firestore also needs security rules that let each signed-in user read and write only their own `users/{uid}` documents, plus the `email_map` lookup used for account recovery. Set these in the Firebase console.

---

## Deploying to Vercel

1. Import the repository in Vercel. The Next.js preset works unchanged.
2. Add every variable from the table above under **Project settings → Environment variables**. `.env.local` is not uploaded.
3. Add your Vercel domain under **Firebase console → Authentication → Settings → Authorized domains**.
4. Redeploy after changing any variable.

---

## Project structure

```
app/
  page.tsx               Overview and database list
  search/                RRL search
  library/               Saved papers, collections, synthesis matrix
  paper/[id]/            Paper detail: abstract, citations, notes
  ai-check/              Writing-style checker
  login/ forgot-password/ settings/    Account pages
  api/
    search/              Meta-search endpoint
    related/             Citation neighbourhood (OpenAlex)
    pdf/                 Unpaywall lookup
    summarize/           Extractive summary
    ai-check/            Style analysis
components/              Header, PaperCard, RelatedPapers, SaveButton,
                         ExportDialog, SynthesisMatrix, Toaster
lib/
  search.ts              Runs every source in parallel and merges results
  dedupe.ts              De-duplication and relevance scoring
  result-view.ts         Client-side sort and source filter
  related-terms.ts       "Narrow your search" suggestions
  search-params.ts       Search form <-> URL
  search-history.ts      Recent searches
  citations.ts           APA, MLA, IEEE, Chicago, BibTeX, RIS
  ai-detector.ts         Style signals
  summarize.ts           Extractive summarizer
  db.ts                  Library storage (IndexedDB or Firestore)
  config.ts  text.ts     Shared contact email, User-Agent and text helpers
  sources/
    meta.ts              Names, descriptions and colours for every database
    *.ts                 One adapter per database
```

---

## How it works

- **Next.js App Router, React 19, TypeScript, Tailwind CSS.** The interface uses a GitHub-style dark theme; its colour tokens are CSS variables in [`app/globals.css`](app/globals.css). On phones a bottom tab bar replaces the top navigation.
- **Server-side proxy.** The browser calls `/api/search`; the server calls the databases. This avoids CORS, keeps API keys off the client and centralises timeouts.
- **One adapter per database**, each turning its own response format into the shared `Paper` type in [`lib/types.ts`](lib/types.ts).
- **Time limits.** Every adapter has a deadline (12 seconds, 6 for Google Scholar). The response reports `ok`, `empty` or `error` for each database, and the search page shows it.
- **Rate limiting.** Semantic Scholar calls are queued 1.1 seconds apart to respect the 1-request-per-second key limit, and a 429 is retried once. The queue lives in one server instance, so heavy parallel traffic across several serverless instances can still hit the limit.
- **Country filter.** Databases that understand boolean syntax get `AND ("Philippines" OR "Filipino" …)`. The others get the country name as an extra keyword.

---

## Data and privacy

- **Signed out:** saved papers live in your browser's IndexedDB on that device. Clearing site data deletes them.
- **Signed in:** saved papers and notes are stored in Firestore under your account.
- **Recovery PIN:** stored only as a SHA-256 hash. New accounts start with the PIN `0000`, so change it in Settings.
- **Search text** is sent to the databases listed above and nowhere else. Vercel Analytics counts page views. Recent searches stay in your browser.
- **AI self-check** text is analysed on the server and not stored.

---

## Known limits

- Results are only as good as the databases. Some return no abstract, no DOI or an incomplete author list.
- The relevance score compares words. It does not understand meaning.
- Databases can be slow, down or rate-limited. The source badges on the search page show which ones failed.
- Citation formatters are simplified for single articles. Check them against your school's style guide, or import the `.bib`/`.ris` file into Zotero or Mendeley.
- An open-access marker is what the database reports. Some links open a repository page, not the PDF.
- Preprints (arXiv, and some Zenodo and OpenAIRE records) are not peer-reviewed.
- The retraction warning only covers papers OpenAlex flags. Absence of a warning does not prove a paper is sound.

---

## Adding a database

1. Create `lib/sources/<name>.ts` exporting `search<Name>(query, opts): Promise<Paper[]>`. Copy a small adapter such as `plos.ts` or `eric.ts`. Send `USER_AGENT` from [`lib/config.ts`](lib/config.ts) as the `User-Agent` header.
2. Add an entry to `SOURCE_META` in [`lib/sources/meta.ts`](lib/sources/meta.ts): label, one-line description, colour, and `needsKey: true` if it needs a key.
3. Add the adapter to the `ADAPTERS` table in [`lib/search.ts`](lib/search.ts). Set `boolean: true` only if the API understands `AND (a OR b)`.
4. Test with a real query and a `fromYear` filter. Compare title, year, authors and link with the source's own site.

The overview page and search page read names and counts from `meta.ts`.

---

## Ethics and legal

- Uses free, public academic APIs. Full-text links point only to open-access copies from publishers, repositories and preprint servers. It never links to Sci-Hub or pirated copies.
- The AI self-check exists to help students write more naturally and avoid false positives. It is not for hiding AI-written work.
- Always cite what you use, and follow your school's academic-integrity rules.
