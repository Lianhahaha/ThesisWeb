# Thesisweb

A free web app that helps thesis students find related literature (RRL), keep it organised, and cite it correctly.

- **Search** — one topic, 17 free academic databases at once. Results are merged, de-duplicated and ranked.
- **Library** — save papers, group them by chapter, take notes, compare them in a synthesis matrix.
- **Cite** — paste DOIs and get references in APA, MLA, IEEE or Chicago, or export your whole library.

No account needed to search. Only links to legal open-access full text. Light and soft dark themes.

---

## READ ME: how to use it

### 1. Search for papers

On the home page or **Search**:

1. Type **three to six words** about your topic, e.g. `reading comprehension strategies`. Full sentences return worse results.
2. Pick **Published since**. It defaults to the last 5 years, which is what most thesis rubrics ask for.
3. Optional: set a **Country focus** (e.g. *Philippines*) to find local studies. It also matches the adjective, so *Filipino* counts.
4. Optional: tick **Free full text only** to hide paywalled papers.
5. Press **Search**. It takes about 5 to 15 seconds because every database is asked at the same time.

Below the form you also get your **Recent** searches (the last 8 you ran in this browser; one click re-runs one, **Clear** empties the list) and four random **Try** topics (**Shuffle** for others).

### 2. Narrow the results

- **Sort**: best match, most cited, newest or oldest.
- **Databases** (right side; on a phone, tap **Databases** above the results to open the list): shows how many papers each database returned. Click one or more to show only their papers. A database marked *failed* timed out; the rest still worked.
- **Narrow with**: terms that appear often in your results. Click one to add it to your search.
- Each result shows authors, year, journal, a **Free full text** label when a legal copy exists, citation count, and a **Match** score (how closely the title and abstract match your words, out of 100).

The page address holds your search, so you can refresh it or send the link to a groupmate.

### 3. Read a paper

Click a title to open it. You get:

- The abstract, plus a one-line TL;DR when Semantic Scholar has one.
- **Read free copy** or **Find free PDF** (asks Unpaywall for a legal open-access version).
- **Extract key points**: three key sentences taken from the abstract itself.
- **Cite this paper** in APA, MLA, IEEE or Chicago, with the in-text form. **Copy citation** and **Copy BibTeX**.
- **Explore citations**: papers that cite this one, papers it cites, and similar papers. The fastest way to grow a review from one good source.
- **My notes**: private notes. Saving a note also saves the paper.

### 4. Save and organise

- Press **Save** on any paper. The Library tab shows the count.
- In **Library**:
  - **Filter** by title, author or note.
  - Put each paper in a **collection** (e.g. *Foreign studies*, *Local studies*, *Theoretical framework*). Use **New collection** to create one.
  - Switch to **Synthesis matrix** and fill in *Method*, *Findings*, *Limitations* and *Relevance to my topic* for each paper. Each box saves when you click out of it. This table is what you turn into your written RRL.
- **Signed out**, the library is stored in this browser only. Clearing site data deletes it. **Sign in** to keep it on every device. Papers you saved before signing in can be copied into your account with **Copy to my account** in the Library.

### 5. Cite and export

- **Library → Export references**: your reference list and in-text citations in APA 7, MLA 9, IEEE or Chicago, sorted by author. **Copy** them, or download **BibTeX (.bib)** or **RIS (.ris)** for Zotero, Mendeley or EndNote. Exports what the filter currently shows, so pick a collection first to export one chapter.
- **Cite** tab: paste up to 25 DOIs or `doi.org` links, one per line, and press **Generate**. Switch style at any time, **Copy all**, download .bib or .ris, or **Save** a reference to your library. A DOI looks like `10.1016/j.compedu.2019.103778` and is on the first page of most papers.

### 6. Your account (optional)

**Sign in → Sign up** with a display name, email and a new password. You are signed in straight away; there is no verification email to wait for.

### 7. Profile and settings

Click your name at the top right (or the gear icon when signed out).

- **Preferences** (saved on this device, no account needed): default *Published since*, default country, free-full-text-only, default citation style, and Light / Dark / Match device.
- **Display name**, **Recovery PIN** (4 to 12 digits), **Change password** and **Change email** (confirmed by a link sent to the new address).
- **Your data**: download a **library backup** (.json with every paper, note, collection and matrix entry), **import** a backup, copy papers saved in this browser into your account, and clear search history.
- **Forgot password?** on the sign-in page asks for your email and recovery PIN, then emails a reset link to that address. New accounts start with PIN `0000`, so change it.

### Light or dark

Press the moon (or sun) button at the top right to switch between the light theme and a soft dark theme. Your choice is remembered on that device. Until you choose, the site follows your phone or computer's own setting.

### Good to know

- Only free, legal sources. Full-text links go to publishers, repositories and preprint servers, never to pirated copies.
- Databases are sometimes slow or down. The Databases list shows which ones answered.
- Preprints (arXiv, some Zenodo and OpenAIRE records) are not peer-reviewed.
- The Match score compares words. It does not judge quality. Read the abstract before you cite.
- Generated citations are simplified. Check them against your school's style guide.

---

## Databases searched

All are free. Databases marked **key** are skipped until an API key is set.

| Database | Covers | Best for |
|---|---|---|
| [OpenAlex](https://openalex.org) | 250M+ works in every field | A broad first pass; citation data |
| [Crossref](https://www.crossref.org) | Publisher metadata and DOIs | Accurate citation details |
| [Semantic Scholar](https://www.semanticscholar.org) | Papers in all fields | TL;DR summaries |
| [DOAJ](https://doaj.org) | Fully open-access journals | Guaranteed free text |
| [Europe PMC](https://europepmc.org) | Life sciences, preprints | Health, nursing, psychology |
| [PubMed](https://pubmed.ncbi.nlm.nih.gov) | Biomedical literature | Medical and public-health studies |
| [arXiv](https://arxiv.org) | Physics, maths, CS, economics preprints | Recent technical work |
| [ERIC](https://eric.ed.gov) | Education research | Teaching and learning topics |
| [Zenodo](https://zenodo.org) | Open articles, theses, reports | Small-journal papers, theses |
| [HAL](https://hal.science) | French national open archive | Social science, engineering, humanities |
| [OpenAIRE](https://explore.openaire.eu) | European open-science graph | Repository copies |
| [INSPIRE-HEP](https://inspirehep.net) | High-energy physics | Physics topics |
| [PLOS](https://plos.org) | PLOS ONE and other PLOS journals | Science and health, always open |
| [DataCite Theses](https://commons.datacite.org) | University thesis repositories | Local and foreign thesis studies |
| [OAPEN Books](https://oapen.org) | Open-access academic books | Theoretical frameworks |
| [Figshare](https://figshare.com) | University and publisher repositories | Articles, theses, conference papers |
| [Google Scholar](https://scholar.google.com) | Broad web index | Papers others miss (unofficial, often blocked) |
| [CORE](https://core.ac.uk) — **key** | Open-access repositories | Repository copies |
| [BASE](https://www.base-search.net) — **key** | Institutional repositories | Theses, grey literature |

---

## How results are ranked

Duplicates (same DOI, or same title and year) are merged. Each paper is then scored against your words, with stemming so *teacher* matches *teachers*:

1. Your words in the **title** (up to 40 points).
2. Your words in the **abstract** (up to 15).
3. All words together and in order (up to 30).
4. Matching word pairs (up to 10).
5. Your words near the start of the title (up to 5).
6. Recency (up to 3) and citation count (up to 5).

Papers where fewer than 25% of your words are in the title and fewer than 30% are in the abstract are dropped. Code: [`lib/dedupe.ts`](lib/dedupe.ts).

---

## For developers

### Run it locally

Requires Node.js 18+.

```bash
git clone <your-fork-url>
cd ThesisWeb
npm install
cp .env.example .env.local     # then fill it in
npm run dev                    # http://localhost:3000
```

```bash
npm run build      # production build
npm run lint       # ESLint
npx tsc --noEmit   # type check
```

### Environment variables

Copy `.env.example` to `.env.local`. `.env.local` is git-ignored; never commit it.

| Variable | Needed? | What it does |
|---|---|---|
| `NEXT_PUBLIC_FIREBASE_*` (7 values) | Yes | Firebase web config for accounts and the cloud library. |
| `CONTACT_EMAIL` | Recommended | Real email sent to OpenAlex, Crossref and other APIs for faster, more reliable limits. Falls back to `UNPAYWALL_EMAIL`. |
| `UNPAYWALL_EMAIL` | Recommended | Real email for Unpaywall. Without it **Find free PDF** is off. |
| `SEMANTIC_SCHOLAR_API_KEY` | Recommended | Sent as `x-api-key`. Requests are paced to 1 per second to match the key's limit. |
| `OPENALEX_API_KEY` | Recommended | Free key from <https://openalex.org/settings/api>. OpenAlex pauses anonymous searches under load. |
| `CORE_API_KEY` | Optional | Enables CORE. |
| `BASE_API_KEY` | Optional | Enables BASE. |

### Firebase setup

1. **Authentication → Sign-in method → Email/Password → Enable.** Leave "Email link" off. Users sign themselves up; no verification is required.
2. **Firestore → Rules:** paste the contents of [`firestore.rules`](firestore.rules) and press **Publish**. Until you do, Firestore stays in locked mode: people can create accounts, but saving papers, profiles, PINs and password recovery all fail. With the Firebase CLI: `npx firebase-tools deploy --only firestore:rules --project <your-project-id>`.
3. **Authentication → Settings → Authorized domains:** add your Vercel domain.

The rules let each user read and write only their own `users/{uid}` data, cap field sizes (title 1,000 characters, notes 20,000, abstract 40,000) so one account can't fill the free quota, allow single-document lookups (never listing) of `email_map` and `recovery` for the forgot-password page, and deny everything else.

**Testing rules locally:** `npx firebase-tools emulators:start --only auth,firestore` uses `firebase.json` (Auth on 9099, Firestore on 8085, with `firestore.rules`). Build or run the app with `NEXT_PUBLIC_FIREBASE_EMULATORS=1` to point it at the emulators instead of the live project. Never set that variable in Vercel.

### Cost and abuse protection

- **Firebase:** on the free **Spark** plan nothing is ever billed; when a daily quota is used up, Firebase stops serving until the next day. Stay on Spark unless you need more. If you upgrade to Blaze, set a **budget alert** in Google Cloud Billing.
- **Firestore reads are kept low:** the library count uses a count query (one read per 1,000 papers), and edits update the page in place instead of re-reading the library.
- **API rate limits** ([`lib/rate-limit.ts`](lib/rate-limit.ts)), per visitor per minute: search 12, cite 10, related 20, pdf 30, summarize 30. Search is also capped at 120 per minute for everyone combined, per server instance. Over the limit the API answers `429` with a `Retry-After` header, and the page shows "Too many requests. Please wait N seconds." Counters live in memory per server instance, so on Vercel the true ceiling is a small multiple of these.
- **For a hard, global limit**, add a rate-limit rule in Vercel (**Project → Firewall**) if your plan offers it, e.g. 60 requests per minute per IP on paths starting with `/api/`.
- Inputs are capped: search text 300 characters, 25 DOIs per Cite request, 2,000 papers per backup import.

### Deploy to Vercel

1. Import the repository in Vercel; the Next.js preset works unchanged.
2. Add every variable above under **Project settings → Environment variables**.
3. Add your Vercel domain under **Firebase → Authentication → Settings → Authorized domains**.
4. Redeploy after changing any variable.

### Project structure

```
app/
  page.tsx            Home: search panel and READ ME
  search/             Results, database filter, related terms
  library/            Saved papers, collections, synthesis matrix
  paper/[id]/         Abstract, citation, notes, citation explorer
  cite/               DOI citation generator
  login/ forgot-password/
  settings/           Preferences, profile, PIN, password, email, backups
  api/
    search/           Meta-search across all databases
    cite/             DOI lookup (Crossref, then OpenAlex)
    related/          Citation neighbourhood (OpenAlex)
    pdf/              Unpaywall lookup
    summarize/        Extractive summary
components/
  SearchPanel.tsx     Topic, filters, recent and example searches
  CountryCombobox.tsx PaperCard.tsx SaveButton.tsx ExportDialog.tsx
  SynthesisMatrix.tsx RelatedPapers.tsx Header.tsx Toaster.tsx
lib/
  search.ts           Runs every database in parallel and merges results
  dedupe.ts           De-duplication and relevance scoring
  citations.ts        APA, MLA, IEEE, Chicago, BibTeX, RIS
  db.ts               Library storage (IndexedDB or Firestore)
  firestore-library.ts  Firestore reads and writes for the library
  recovery.ts         Recovery PIN and email lookup
  preferences.ts      Per-device defaults
  rate-limit.ts       API rate limiter
  theme.ts            Light/dark switching
firestore.rules       Firestore security rules (publish in the Firebase console)
  sources/            One adapter per database; meta.ts lists them all
```

### How it works

- **Next.js App Router, React 19, TypeScript, Tailwind CSS.** Light cream and soft dark themes, one lavender accent each; tokens are CSS variables in [`app/globals.css`](app/globals.css), switched by `data-theme` on `<html>`. A small script in `<head>` ([`lib/theme.ts`](lib/theme.ts)) applies the saved or system theme before first paint, so there is no flash. No animations.
- **Server-side proxy.** The browser calls `/api/*`; the server calls the databases. Keeps API keys off the client and avoids CORS.
- **Time limits.** Each database has a deadline (12 s, 15 s for Figshare, 6 s for Google Scholar), so one slow source never blocks the rest.
- **Rate limiting.** Each API route is limited per visitor (see *Cost and abuse protection*). Semantic Scholar calls are also queued 1.1 s apart and a 429 is retried once.

### Adding a database

1. Create `lib/sources/<name>.ts` exporting `search<Name>(query, opts): Promise<Paper[]>`. Copy a small adapter such as `plos.ts`.
2. Add an entry to `SOURCE_META` in [`lib/sources/meta.ts`](lib/sources/meta.ts).
3. Add it to `ADAPTERS` in [`lib/search.ts`](lib/search.ts). Set `boolean: true` only if the API understands `AND (a OR b)`.
4. Test with a real query and a year filter, and compare titles, years and links against the source's own site.

---

## Data and privacy

- **Signed out:** saved papers stay in your browser's IndexedDB on that device.
- **Signed in:** saved papers and notes are stored in Firestore under your account.
- **Recovery PIN:** stored only as a SHA-256 hash, in its own `recovery/{uid}` document so the rest of the profile stays private. It only gates sending the reset email, which always goes to the account's own inbox, so a guessed PIN can't take over an account.
- **Preferences and search history** stay in your browser.
- **Search text and DOIs** are sent only to the databases listed above. Vercel Analytics counts page views.

## Ethics

Uses free, public academic APIs and links only to open-access copies. Always cite what you use and follow your school's academic-integrity rules.
