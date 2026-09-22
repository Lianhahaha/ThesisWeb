# Thesisweb

A free web app that helps thesis students find related literature (RRL), keep it organised, and cite it correctly.

- **Search** — one topic, 17 free academic databases at once, merged, de-duplicated and ranked.
- **Library** — save papers, group them by chapter, take notes, fill a synthesis matrix.
- **Cite** — paste DOIs and get references in APA, MLA, IEEE or Chicago, or export your whole library.

No account needed to search. Only links to legal open-access full text. Light and soft dark themes.

---

## How to use it

1. **Search.** Type 3–6 words (e.g. `reading comprehension strategies`), set *Published since* (defaults to last 5 years), an optional *Country focus*, and *Free full text only* if you want it. **Recent** (your last 8 searches) and **Try** (random example topics) are below the form.
2. **Narrow.** Sort by match, citations or date. The **Databases** list shows how many results each one returned — click to filter to it. **Narrow with** adds a suggested term. The search stays in the URL, so it's shareable.
3. **Read.** Open a title for its abstract, a free-PDF link, a ready citation, related papers (cited-by / references / similar) and a notes box. **Abstract ≠ RRL** — it's the authors' own summary; use it to judge fit, then read the paper and write your RRL in your own words. Copying abstracts is plagiarism.
4. **Save & organise.** Press **Save** on any result. In **Library**, group papers into collections and fill the **synthesis matrix** (Method, Findings, Limitations, Relevance) — this becomes your written RRL. Signed out, the library lives in that browser only; sign in to sync it, or copy it into your account later.
5. **Cite.** Export your library as APA/MLA/IEEE/Chicago, BibTeX or RIS — or paste DOIs into **Cite** to generate references without saving anything first.
6. **Account (optional).** Sign up with a name, email and password — you're signed in immediately, no email verification. Under your name (or the gear icon signed out): **Preferences** (defaults for year/country/OA/citation style/theme, no account needed), display name, recovery PIN, password, email, and a JSON library backup/import.

---

## Databases searched

Free; entries marked **key** are skipped until that API key is set.

| Database | Best for |
|---|---|
| OpenAlex, Crossref, Semantic Scholar | Broad first pass, citation data, TL;DRs |
| DOAJ, PLOS | Guaranteed free full text |
| Europe PMC, PubMed | Health, nursing, biomedical |
| arXiv, INSPIRE-HEP | Physics, CS, maths preprints |
| ERIC | Education and teaching |
| Zenodo, Figshare, OpenAIRE, HAL | Repository copies, small-journal papers |
| DataCite Theses, OAPEN Books | Theses, academic books |
| CORE **(key)**, BASE **(key)** | Repository aggregators |
| Google Scholar | Extra coverage (unofficial, often blocked) |

**Ranking:** duplicates (same DOI, or title+year) are merged; each paper is scored on word overlap with your query (title, abstract, phrase order, recency, citations — see [`lib/dedupe.ts`](lib/dedupe.ts)). It measures word match, not quality — read the abstract.

---

## For developers

```bash
npm install
cp .env.example .env.local   # fill in values, see below
npm run dev                  # http://localhost:3000
npm run build && npm run lint && npx tsc --noEmit
```

**Environment variables** (`.env.local`, git-ignored):

| Variable | Needed | Why |
|---|---|---|
| `NEXT_PUBLIC_FIREBASE_*` (7) | Yes | Firebase config for accounts/library |
| `CONTACT_EMAIL`, `UNPAYWALL_EMAIL` | Recommended | Polite-pool access; PDF lookup |
| `SEMANTIC_SCHOLAR_API_KEY`, `OPENALEX_API_KEY` | Recommended | Higher rate limits on the two biggest sources |
| `CORE_API_KEY`, `BASE_API_KEY` | Optional | Enable those two sources |

**Firebase setup:**
1. Auth → Sign-in method → enable **Email/Password**.
2. Firestore → Rules → paste [`firestore.rules`](firestore.rules) → **Publish**. Until published, Firestore is locked and saving/PIN/recovery fail (accounts still work).
3. Auth → Settings → Authorized domains → add your Vercel domain.

Rules restrict each user to their own `users/{uid}` data, cap field sizes, and allow single-document (never listing) public reads of `email_map`/`recovery` for password recovery. Test locally with `npx firebase-tools emulators:start --only auth,firestore` + `NEXT_PUBLIC_FIREBASE_EMULATORS=1` (never set that var on Vercel).

**Cost/abuse protection:** Firebase Spark plan never bills — it just pauses at the daily quota. Firestore reads are kept cheap (count queries, in-place patches). Every API route has a per-IP rate limit ([`lib/rate-limit.ts`](lib/rate-limit.ts): search 12/min, cite 10, related 20, pdf/summarize 30, search also capped at 120/min site-wide per instance) returning `429` + `Retry-After`. For a hard global cap, add a Vercel Firewall rate-limit rule on `/api/*`.

**Deploy:** import to Vercel → add the env vars → add the Vercel domain to Firebase authorized domains → redeploy.

**Project structure:**

```
app/        page.tsx (home), search/, library/, paper/[id]/, cite/,
            login/ forgot-password/ settings/, api/*
components/ SearchPanel, PaperCard, SaveButton, ExportDialog,
            SynthesisMatrix, RelatedPapers, Header, Toaster
lib/        search.ts (fan-out), dedupe.ts (rank), citations.ts,
            db.ts + firestore-library.ts (storage), recovery.ts,
            preferences.ts, rate-limit.ts, theme.ts, sources/*
firestore.rules
```

**Adding a database:** create `lib/sources/<name>.ts` exporting `search<Name>(query, opts)`, register it in `SOURCE_META` ([`lib/sources/meta.ts`](lib/sources/meta.ts)) and `ADAPTERS` ([`lib/search.ts`](lib/search.ts)), then test against a real query.

**Design:** Next.js App Router, React 19, TypeScript, Tailwind. Light/dark via `data-theme`, no flash (pre-paint script in [`lib/theme.ts`](lib/theme.ts)), no animations. Server-side proxy keeps API keys off the client. Each database has its own timeout so one slow source never blocks the rest.

---

## Data & privacy

Signed out: papers live in that browser's IndexedDB. Signed in: papers/notes live in Firestore under your account. Recovery PIN is a SHA-256 hash in its own document, separate from your profile, and only gates a reset email sent to the account's own inbox. Preferences and search history stay in your browser. Search text and DOIs go only to the databases above.

## Ethics

Free, public academic APIs only; links only to open-access copies. Always cite what you use and follow your school's academic-integrity rules.
