# Thesisweb

A free web app that helps thesis students find related literature (RRL), keep it organised, and cite it correctly.

- **Search** — one topic, 50 free academic databases at once, merged, de-duplicated and ranked, with preprint, retraction and expression-of-concern warnings. Save a search and the next time you open it, papers that weren't there before are marked *New*.
- **Library** — save papers, group them by chapter, take notes, fill a synthesis matrix, or import a .bib/.ris file from Zotero, Mendeley or EndNote. **Share** a collection with your thesis group by link: they can read it, export it and copy it into their own library.
- **Cite** — paste DOIs and get references in APA, MLA, IEEE or Chicago, or export your whole library.

No account needed to search. Only links to legal open-access full text. Light and soft dark themes.

---

## How to use it

1. **Search.** Type 3–6 words (e.g. `reading comprehension strategies`), set *Published since* (defaults to last 5 years), an optional *Country focus*, and *Free full text only* if you want it. **Recent** (your last 8 searches) and **Try** (random example topics) are below the form.
2. **Narrow.** Sort by match, citations or date. The **Databases** list shows how many results each one returned — click to filter to it. **Narrow with** adds a suggested term. The search stays in the URL, so it's shareable.
3. **Read.** Open a title for its abstract, a free-PDF link, a ready citation, related papers (cited-by / references / similar) and a notes box. **Abstract ≠ RRL** — it's the authors' own summary; use it to judge fit, then read the paper and write your RRL in your own words. Copying abstracts is plagiarism.
4. **Save & organise.** Press **Save** on any result. In **Library**, group papers into collections and fill the **synthesis matrix** (Method, Findings, Limitations, Relevance) — this becomes your written RRL. Signed out, the library lives in that browser only; sign in to sync it, or copy it into your account later.
5. **Cite.** Export your library as APA/MLA/IEEE/Chicago, BibTeX or RIS — or paste DOIs into **Cite** to generate references without saving anything first.
6. **Account (optional).** Sign up with a name, email, password and recovery PIN — you're signed in immediately; a verification link confirms the email. Under your name (or the gear icon signed out): **Preferences** (defaults for year/country/OA/citation style/theme, no account needed), display name, recovery PIN, password, email, and a JSON library backup/import.

---

## Databases searched

All free, no key needed. The in-app [Databases page](app/databases/page.tsx) (`/databases`) lists each one with its region, fields and record type.

| Database | Best for |
|---|---|
| OpenAlex, Crossref, Semantic Scholar, OpenAIRE, CORE | Broad first pass across every field, citation data, AI summaries (CORE = free copies from 10k+ repositories) |
| SEAFDEC/AQD | Philippine research: aquaculture and fisheries |
| UP Open University | Philippine theses: online and distance education, development communication, health informatics |
| UP Visayas | Philippine theses and research: fisheries, ocean sciences, food science, social sciences |
| WVSU Repository | Philippine theses: education, nursing, management, public administration |
| UP Diliman | Philippine theses and dissertations from every UP Diliman college, with abstracts |
| AIIAS Repository | Philippine graduate theses: education, business, public health, nursing, theology |
| SSOAR | Social sciences, politics, psychology, communication (free full text) |
| DOAJ, PLOS, J-STAGE, ThaiJO | Peer-reviewed open-access journals (ThaiJO = Thai journals, English abstracts) |
| Philippine E-Journals | Articles from hundreds of Philippine university journals, most with a free PDF |
| PubMed, PubMed Central, Europe PMC | Medicine, nursing, health, life sciences |
| HERDIN | Philippine health research: articles, theses and reports (DOST-PCHRD) |
| Acta Medica Philippina | Philippine clinical, nursing and public health journal articles (UP Manila) |
| WHO IRIS | WHO guidelines, health reports, Western Pacific (Manila) publications |
| ERIC | Education and teaching |
| PNU Journals | Philippine education journals (Philippine Normal University) |
| EconBiz, World Bank OKR, NBER | Economics, business, development, poverty (NBER = working papers) |
| SERP-P (PIDS) | Philippine socioeconomic research: PIDS, BSP, NEDA and university studies |
| CGSpace (CGIAR, incl. IRRI), GBIF Literature, Krishikosh | Agriculture, fisheries, food, biodiversity (Krishikosh = Indian agricultural theses) |
| OSTI.GOV, NASA NTRS, USGS | Engineering, energy, aerospace, earth science reports |
| arXiv, INSPIRE-HEP | Physics, maths, computing (arXiv = preprints) |
| OSF Preprints | Psychology, education, social sciences (preprints) |
| IDRC Digital Library | Development research in Asia, Africa, Latin America |
| CiNii Research | Japanese and Asian research |
| DR-NTU (Singapore) | Southeast Asian theses and papers: engineering, computing, business, education |
| UPSpace (South Africa) | African theses and research: education, health, veterinary, engineering |
| LA Referencia | Latin American repositories (Spanish, Portuguese) |
| Zenodo, Figshare, HAL | Repository copies, reports, small-journal papers |
| DataCite Theses, theses.fr, BDTD (Brazil) | Theses and dissertations |
| Open Library | Books and textbooks (catalogue records; public-domain scans free) |

**Trust signals:** results come straight from these databases; nothing is generated. Preprints carry a *Preprint · not peer-reviewed* badge. After results load, every DOI is checked against Crossref (which includes Retraction Watch) for retractions and expressions of concern. Semantic Scholar's one-line summaries are labelled *AI summary*.

**Ranking:** duplicates (same DOI, or title+year) are merged; each paper is scored on word overlap with your query (title, abstract, phrase order, recency, citations — see [`lib/server/dedupe.ts`](lib/server/dedupe.ts)). It measures word match, not quality — read the abstract.

---

## For developers

```bash
npm install
cp .env.example .env.local   # fill in values, see below
npm run dev                  # http://localhost:3000
npm run build && npm run lint && npx tsc --noEmit
npm test                     # unit tests, no network
npm run test:live            # calls every real database once
```

**Environment variables** (`.env.local`, git-ignored):

| Variable | Needed | Why |
|---|---|---|
| `NEXT_PUBLIC_FIREBASE_*` (7) | Yes | Firebase config for accounts/library |
| `CONTACT_EMAIL`, `UNPAYWALL_EMAIL` | Recommended | Polite-pool access; PDF lookup |
| `SEMANTIC_SCHOLAR_API_KEY`, `OPENALEX_API_KEY` | Recommended | Higher rate limits on the two biggest sources |
| `NCBI_API_KEY` | Optional | 10 instead of 3 requests/s to PubMed and PubMed Central |
| `CORE_API_KEY` | Optional | Higher CORE rate limit (works without, but may fail when busy) |

**Firebase setup:**
1. Auth → Sign-in method → enable **Email/Password**.
2. Firestore → Rules → paste [`firestore.rules`](firestore.rules) → **Publish**. Until published, Firestore is locked and saving/PIN/recovery fail (accounts still work).
3. Auth → Settings → Authorized domains → add your Vercel domain.

Rules restrict each user to their own `users/{uid}` data, cap field sizes, and allow single-document (never listing) public reads of `email_map`/`recovery` for password recovery. Test locally with `npx firebase-tools emulators:start --only auth,firestore` + `NEXT_PUBLIC_FIREBASE_EMULATORS=1` (never set that var on Vercel).

**Cost/abuse protection:** Firebase Spark plan never bills — it just pauses at the daily quota. Firestore reads are kept cheap (count queries, in-place patches). Every API route has a per-IP rate limit ([`lib/server/rate-limit.ts`](lib/server/rate-limit.ts): search 12/min, cite 10, related 20, pdf/summarize 30, retractions 40, search also capped at 120/min site-wide per instance) returning `429` + `Retry-After`. For a hard global cap, add a Vercel Firewall rate-limit rule on `/api/*`.

**Deploy:** import to Vercel → add the env vars → add the Vercel domain to Firebase authorized domains → redeploy.

**Project structure:** grouped by where code runs, so a bug can be traced from the page to the data.

```
app/                 pages: home, search/, library/, paper/[id]/, cite/, databases/,
                     login/, forgot-password/, settings/, privacy/, terms/
app/api/             search, cite, related, pdf, retractions, summarize (server)
components/          shared UI: SearchPanel, PaperCard, SaveButton, CountryCombobox,
                     Toaster, plus page parts (DatabasesDialog, ExportDialog,
                     SynthesisMatrix, RelatedPapers)
components/layout/   app shell: Header, Footer, Providers, ThemeToggle, analytics
lib/server/          server only (API routes; may read secret keys): search.ts
                     (fan-out), dedupe.ts (merge + rank), retractions.ts, summarize.ts,
                     rate-limit.ts, unpaywall.ts, config.ts
lib/sources/         the databases (server, except meta.ts)
  meta.ts            display data for every source (client-safe): label, region,
                     fields, record type, homepage
  registry.ts        source id -> adapter; typed so meta and registry can't drift
  types.ts           Adapter / AdapterOptions contract
  normalize.ts       validates every record from every adapter
  adapters/          one file per database
  platforms/         shared clients: dspace7 (World Bank, CGSpace, IDRC, WHO, DR-NTU,
                     UPSpace, UPOU, UPV, Krishikosh, AIIAS), dspace6 (OpenSearch feed:
                     SEAFDEC/AQD, SSOAR, WVSU), vufind (LA Referencia, BDTD),
                     ncbi (PubMed, PMC), ojs (Acta Medica Philippina, PNU)
lib/search/          search page (browser): params.ts (URL <-> form, shared with
                     the API), history.ts, recent-papers.ts, result-view.ts,
                     related-terms.ts, integrity.ts (asks the retraction route)
lib/library/         saved papers (browser): store.ts (IndexedDB or Firestore),
                     firestore.ts, merge.ts (combining two copies), backup.ts
lib/auth/            accounts (browser): store.ts, errors.ts, recovery.ts (PIN,
                     email lookup), username-cache.ts
lib/                 shared: types.ts, text.ts, utils.ts, citations.ts, countries.ts,
                     preferences.ts, theme.ts, firebase.ts, legal.ts
tests/unit/          vitest, no network      tests/live/  real databases
firestore.rules      publish in the Firebase console after every change
```

**Adding a database:**
1. Write `lib/sources/adapters/<id>.ts` exporting an `Adapter` (see [`lib/sources/types.ts`](lib/sources/types.ts)). If the site runs DSpace (any version), VuFind or OJS, it is a few lines on top of [`lib/sources/platforms/`](lib/sources/platforms/). Throw on HTTP errors, return `[]` for no matches, set `sources: ["<id>"]`, and set `preprint` / `url` when the API says.
2. Add its entry to [`lib/sources/meta.ts`](lib/sources/meta.ts) (label, blurb, color, region, fields, kind, url) and to `ADAPTERS` in [`lib/sources/registry.ts`](lib/sources/registry.ts). The type checker and `npm test` fail if either is missing.
3. Run `LIVE_ONLY=<id> LIVE_QUERY="your topic" npm run test:live`.
4. Only add databases that are free, keyless or free-key, run by a trustworthy organisation, and answer within ~10 s.

**Design:** Next.js App Router, React 19, TypeScript, Tailwind. Light/dark via `data-theme`, no flash (pre-paint script in [`lib/theme.ts`](lib/theme.ts)), no animations. Server-side proxy keeps API keys off the client. Each database has its own timeout so one slow source never blocks the rest.

---

## Data & privacy

Signed out: papers live in that browser's IndexedDB. Signed in: papers/notes live in Firestore under your account. Recovery PIN is stored as a salted PBKDF2 hash (200,000 rounds; PINs set before October 2026 are plain SHA-256 until changed) in its own document, separate from your profile, and only gates a reset email sent to the account's own inbox. Preferences and search history stay in your browser. Search text and DOIs go to the databases above, and search words to Firebase Analytics, as the privacy page says.

## Ethics

Free, public academic APIs only; links only to open-access copies. Always cite what you use and follow your school's academic-integrity rules.
