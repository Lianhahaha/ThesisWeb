# ThesisWeb — Codebase Audit & Product Review

**Date:** 2026-11-08
**Scope:** full repository at `C:\Users\My PC\OneDrive\Documents\ThesisWeb` (276 tracked files, ~19,100 lines of TS/TSX, 240 TS/TSX files, 60 source adapters, 359 commits)
**Method:** four parallel read-only code audits (search/server, data/auth, frontend/UX, tests/CI/dependencies) plus independent verification of every High finding.

## Verification results (run locally)

| Check | Result |
|---|---|
| `npx tsc --noEmit` | PASS (no output) |
| `npm run lint` | PASS (no warnings printed) |
| `npm run build` (Next 16.4.1, Turbopack) | PASS — 19 static pages + 10 dynamic routes |
| `npm test` | PASS — 49 files, 248/248 tests |
| `npm audit --omit=dev --audit-level=high` | PASS — 0 vulnerabilities |
| `git status` | clean |

That is a strong baseline. Most projects at this size do not build, lint, test and pass cleanly in one run.

---

## 0. Remediation status (2026-11-08)

Each batch below was re-verified with `npx tsc --noEmit`, `npm run lint` and `npm test` before being committed and pushed.

| Finding | Status | Commit / change |
|---|---|---|
| H1 shared-machine residue | Fixed | `abbf4eb` — sign-out now clears Dexie, search history, saved searches, tab caches, cached names and private Cache Storage entries |
| H2 analytics search terms | Fixed | `abbf4eb` — no `search_term`, query string stripped from `page_location`; privacy page updated |
| H3 rate-limit identity/global caps | Fixed | `3cdb597` — site-wide bucket on cite/related/pdf/abstract/summarize/retractions; trusted-proxy note added |
| H4 segmented-control states | Fixed | `9030b8a` — `aria-pressed` on every segmented control; results count is `aria-live`/`aria-busy` |
| H5 Firebase eager bundle | Partly fixed | `69860e7` — header, auth, analytics and the Dexie provider load Firebase on demand; the library store still imports it for signed-in cloud paths |
| Citation accuracy (Chicago) | Fixed | `6937992` — three authors are listed in-text; `et al.` starts at four |
| Record accuracy | Improved | `601509b` — `normalizePaper` strips HTML/entities; live checks reject implausible years, malformed DOIs and markup |
| M1 filters before merge | Fixed | `45c3cd2` — topic matching removed from the per-source pass; applied after merge |
| M2 merge drops concern/dates | Fixed | `45c3cd2` — unions `concern`, backfills `year`/`publishedDate` |
| M3 unicode dedupe / unstable ids | Fixed | `45c3cd2` — Unicode-aware match key; ids derived from the record, not arrival order |
| M4 non-Latin query ranking | Fixed | `45c3cd2` — Unicode tokenizer + substring fallback for CJK/accented terms |
| M6 unbounded `fsAllPapers`/delete | Partly fixed | `9aa56b1` — paged reads/deletes; `safeId` collision and concurrent-write merge still open |
| M7 shared-copy trust | Fixed | `2679c02` — share id normalized from DOI/title; unknown fields stripped |
| M9 redirect SSRF | Verified safe | No change — final URL was already checked before the body was read |
| M10 unbounded HTML/XML reads | Fixed | `2679c02` — `readText()` caps every adapter page at 5 MB |
| M12 service-worker caching | Fixed | `abbf4eb` — private routes never cached; public pages keyed by full URL; cache version bumped |

**Still open (deliberate, needs a design/product decision or migration):**
- **H5 Firebase eager bundle (remainder)** — the store still imports Firestore/Auth statically; splitting local Dexie from the cloud path would remove Firebase entirely from the shared chunk.
- **M5 per-user document quotas** — needs agreed limits and possibly a rules test.
- **M6 remainder** — `safeId` cannot change without migrating every saved DOI paper; concurrent whole-document writes need Firestore transactions.
- **M8 cache stampede / non-stream payload cap** — needs a shared in-flight lock and an agreed result cap.
- **M11 partial cite results** — needs a streaming or partial-response design.
- **M13–M18** — rules tests + emulator CI, auth/search e2e, SHA-pinned Actions/OIDC, dependency pinning, schema versioning.

---

## 1. What this system is

A free, local-first academic discovery tool for thesis writers:

- **Search** fans out to 60–62 free databases (OpenAlex, Crossref, Semantic Scholar, CORE, PubMed, DOAJ, SciELO, plus many Philippine sources: HERDIN, Saliksik, PCAARRD, SEAFDEC, UP repositories, AIIAS, PNU, and others), normalizes and de-duplicates records, then ranks by keyword overlap.
- **Streaming** results arrive per source (NDJSON), with per-source deadlines so one slow API cannot block the rest.
- **Library** is IndexedDB when signed out and Firestore when signed in, with collections, notes, a synthesis matrix, Local/Foreign tagging, `.bib`/`.ris` import, and share-by-link.
- **Cite** generates APA/MLA/IEEE/Chicago, BibTeX and RIS, including RTF/CSV exports.
- **Trust signals**: preprint badges, retraction / expression-of-concern checks against Crossref, and clear "AI summary" labelling.

The architecture is genuinely thoughtful. Separation into `lib/sources/adapters` + shared `platforms` (DSpace 6/7, VuFind, NCBI, OJS) is the right abstraction, and the typed `meta.ts` ↔ `registry.ts` contract is a good guard against drift. Server-only code is properly isolated so API keys never reach the browser.

### Scorecard

| Area | Grade | Notes |
|---|---|---|
| Architecture & modularity | A− | Clean layering, adapter platform reuse, server/client boundary |
| Core correctness (search/library) | B+ | Good dedupe/rank, but filters applied before merge and some date/unicode gaps |
| Security (data isolation) | B | Firestore owner rules are genuinely correct; rate-limit identity and share trust need work |
| Privacy | C+ | Search terms go to Google Analytics; sign-out leaves local residue |
| Accessibility | C+ | Good basics, but selected states are invisible to screen readers |
| Test coverage | B− | Strong unit depth, weak on rules/auth/API/e2e |
| CI/CD & supply chain | B | Solid pipeline, tag-pinned actions, no rules or auth e2e |
| Performance | B− | Firebase eagerly bundled everywhere; per-card IndexedDB subscriptions |
| Documentation | A− | README is excellent; a few stale counts and omissions |
| Maintainability | C+ | High quality code, but effectively a one-person project |

**Overall: a well-built, genuinely useful product with no critical vulnerabilities and no cross-user data exposure. The main risks are privacy/residue on shared machines, a few security hardening gaps, and bus-factor 1.**

---

## 2. Findings by severity

No **Critical** findings. The Firestore security boundary is correctly implemented: every `users/{uid}/**` path is gated by `isOwner`, unmatched paths deny by default, and shared libraries use random document ids with single-document public reads (no listing). That is the single most important thing to get right in an app like this, and it is right.

### High

**H1. Sign-out and the service worker leave the previous student's data on a shared computer.**
- `lib/auth/sign-out.ts:24-31` clears only Firebase's *Firestore* offline cache. It does not clear the Dexie database `thesisweb` (`lib/library/store.ts:19-24`), search history (`tw-search-history`), saved searches (`lib/search/saved.ts`), other accounts' cached display names (`lib/auth/username-cache.ts:14`), or the service-worker Cache Storage.
- `public/sw.js:44-52,50` caches navigations keyed by `url.pathname` only, so offline `/search?q=A` and `?q=B` collide, and `/library`, `/settings`, `/shared` shells persist after sign-out.
- **Verified:** yes. Dexie is one global, non-namespaced DB; `localPapers()` returns every browser-saved paper regardless of account.
- **Impact:** on school labs / internet cafés — the exact use case the code comments call out — the next person can read the previous student's thesis topic, notes and locally saved papers, and copy them into their own account.
- **Fix:** on sign-out (a) delete the `thesisweb` Dexie DB or namespace it per uid, (b) clear `tw-search-history`/`tw-saved-searches`, (c) clear Cache Storage or stop caching private routes, (d) keep the current explicit "sign out and forget" copy.

**H2. Search terms are sent to Google Analytics without consent.**
- `app/search/page.tsx:128` calls `trackEvent("search", { search_term: input.query, results })`.
- `components/layout/FirebaseAnalytics.tsx:24-28` logs `page_location: window.location.href`, and the search query lives in the URL (`?q=`), so the same term is sent a second time.
- Analytics initializes unconditionally (`lib/firebase.ts:92-103`); the privacy page discloses this, but there is no consent gate.
- **Impact:** a student's research topic — potentially sensitive (health, abuse, politics) — is sent to a third party. For an app aimed at students in a privacy-conscious context, this is the issue most likely to draw a complaint.
- **Fix:** hash or drop `search_term`, log only result counts, strip query strings from `page_location`, and gate analytics on consent (or make it opt-in).

**H3. Rate-limit identity is trust-dependent and only search has a global cap.**
- `lib/server/rate-limit.ts:39-49` trusts `x-vercel-forwarded-for`, then `x-real-ip`, then `x-forwarded-for`. On Vercel that is fine; self-hosted or proxied deployments can spoof the fallbacks and get a fresh bucket per request.
- Only `search` has a site-wide bucket (`:36-37`); `cite`, `related`, `pdf`, `summarize`, `abstract`, `retractions` are per-IP only.
- **Impact:** quota/API-cost abuse, especially against CORE/IEEE/Semantic Scholar keys.
- **Fix:** add global buckets for all expensive routes, document the trusted-proxy assumption, and prefer Vercel's firewall / `request.ip` where available.

**H4. Selected states are invisible to screen readers.**
- Segmented controls style selection only with `data-on`: search scope (`components/SearchPanel.tsx:126-139`), citation style (`app/cite/page.tsx:114-119`, `app/paper/[id]/page.tsx:438-444`), login/signup (`app/login/page.tsx:142-149`), library view (`app/library/page.tsx:333-339`), theme (`components/settings/PreferencesSection.tsx:97-108`), related tabs (`components/RelatedPapers.tsx:71-76`).
- None expose `aria-pressed`, `role="radio"`/`aria-checked`, or a live region. Streaming results also change without `aria-live` (`app/search/page.tsx:293-305`).
- **Impact:** a blind student cannot tell which search scope or citation style is active — a core flow.
- **Fix:** add `aria-pressed`/`aria-checked` to the selected button, `aria-live="polite"` on the result count, and inline error associations on forms.

**H5. Firebase is eagerly bundled on every route.**
- `components/layout/Header.tsx:11` imports `db` → `lib/auth/store.ts:3` → `lib/firebase.ts:3-15`, pulling Auth, Firestore, App Check and Analytics into the client bundle for every page, including the home page and public search.
- **Impact:** slower first load on the low-end phones and capped data plans common in the target audience.
- **Fix:** dynamically import Firebase inside the auth/library paths, or split Header's account widget into a lazily loaded chunk.

### Medium

**M1. Filters run before merge, so a matching abstract can be lost.** `lib/server/search.ts:172-175` applies `passesFilters` + `matchesQuery` per source before `rankResults`/`dedupePapers`. A record with a weak title but a matching abstract from another database is dropped and never merged. Consider filtering after merge, or using dedupe keys as a pre-pass.

**M2. Merge drops `concern` and dates.** `lib/search/rank.ts:97-128` unions `retracted` but not `concern` (compare line 106), and never backfills `year`/`publishedDate` when the surviving record lacks them. Integrity data can silently disappear.

**M3. Dedupe/id stability issues.** `normalizeTitle` strips non-ASCII (`lib/utils.ts:12-18`), so accented/CJK/Cyrillic titles dedupe poorly; `uniqueIds` is encounter-order dependent (`rank.ts:82-95`), so streaming vs. cached/non-stream ids can differ, which affects saved-state lookups.

**M4. Non-Latin queries skip ranking.** `tokenizeQuery` keeps only `[a-z0-9]` (`rank.ts:201-207`); CJK/accented-only queries yield `[]`, `matchesQuery` returns true, and results keep adapter order. Local sources (CiNii, J-STAGE, SciELO) are therefore effectively unranked.

**M5. No per-user Firestore count/quota caps.** `firestore.rules:44-56,107-123` cap *field sizes* but not number of papers, shares, suggestions or replies. A script with the public web config can create accounts and fill the free-tier quota. `lib/firebase.ts:30-43` only enables App Check when a key is configured.

**M6. Concurrent library edits overwrite each other.** Cloud saves are read-modify-write of the whole document (`lib/library/store.ts:84-124`, `lib/library/firestore.ts:61-64`); two tabs lose one side of the edit (last writer wins). `fsAllPapers` has no pagination (`lib/library/firestore.ts:138-157`), and `safeId` maps `/`→`--`, so ids `a/b` and `a--b` collide.

**M7. Shared-copy trust gap.** `lib/library/shared-copy.ts:97-118` trusts `raw.id` over the normalized DOI/title id (line 109) and `normalizePaper` spreads arbitrary extra fields (`lib/sources/normalize.ts:63`). Because `mergeSavedPaper` spreads non-blank incoming fields (`lib/library/merge.ts:26,32-49`), a crafted share can target a known paper id and overwrite the victim's `url`/`openAccessUrl` (phishing) or append notes. http(s)-only limits the severity, but the id override should be removed.

**M8. Cache stampede and oversized answers.** No lock around the whole-answer cache (`lib/server/search.ts:128-141`); concurrent identical searches all fan out. `cacheSet` silently drops values >900 KB (`lib/server/redis-cache.ts:28`), and `metaSearch` returns all surviving abstracts (up to 40k chars each) with no count/field cap (`lib/server/search.ts:230-233`).

**M9. SSRF via redirect in `/api/abstract`.** The host allowlist is checked before the fetch (`lib/server/abstract.ts:26-36`), but redirects are followed and the final URL is checked after the body is read (`:145-153`, `lib/server/http.ts:32-40`). An open redirect on an allowed host could reach internal/metadata endpoints.

**M10. Unbounded page reads.** Several adapters call `res.text()` with no byte cap (`arxiv.ts:68`, `scielo.ts:98`, `dspace6.ts:70`, `ojs.ts:86`, `herdin.ts:108`, `ajol.ts:26`, `saliksik.ts:170`, `pcaarrd.ts:132`); only JSON is capped at 8 MB (`lib/server/http.ts:124-146`).

**M11. `/api/cite` can exceed the route time budget.** 25 DOIs, 5 workers, up to two 8–10 s lookups each (`app/api/cite/route.ts:11-32,95`), with no partial response on timeout.

**M12. Service-worker/offline correctness.** Beyond H1, caching `/search` by pathname means offline search results are wrong, and the cached `/library` shell can be stale after sign-out.

**M13. Firestore rules are untested.** The security boundary (`firestore.rules`) has no `@firebase/rules-unit-testing` suite or emulator CI job.

**M14. Auth/library-sync have no direct tests.** `lib/auth/*`, `lib/library/firestore.ts`, `share.ts` and `store.ts` are untested; component tests mock `useAuth`.

**M15. Adapter and e2e coverage is shallow.** Only 18/60 adapters are unit-tested; live tests only assert "array, normalized, non-empty" and absorb 403/429 as "unavailable" (`tests/live/sources.test.ts:36,91-98`). E2E covers public smoke/404/mobile/axe only (`tests/e2e/smoke.spec.ts`), runs against `next dev` (`playwright.config.ts:18`), and `trace: "on-first-retry"` records nothing because retries are not configured (`:13`).

**M16. Supply chain / CI hardening.** Actions are tag-pinned, not SHA-pinned; `ci.yml` and `uptime.yml` omit `permissions:` and `concurrency`; `sources-health.yml` grants `contents: write` to the whole job and auto-commits daily even when status is unchanged; `firestore-backup.yml:19-21` uses a long-lived `GCP_SA_KEY` (prefer OIDC/workload identity).

**M17. Dependency drift.** `overrides` forces `@grpc/grpc-js@1.13.6` while Firebase declares `~1.9.0` (`package.json:51-53`), with no comment or test. React is pinned exactly to `19.0.0` (`:27-28`) while Next resolves 16.4.1 and `@types/react` 19.2.x. No `engines`, `packageManager`, `.nvmrc` (`package.json`), while CI uses Node 22 and Next requires ≥20.9.

**M18. No schema validation/versioning on reads.** Firestore/Dexie reads are cast, not validated (`lib/library/firestore.ts:74,141`); Dexie is version 1 with no upgrade path (`lib/library/store.ts:21-23`); backups ignore an app/schema version (`lib/library/backup.ts:20-73`).

### Low (selection)

- Crossref marks an "open" license and sets `openAccessUrl` to the DOI landing page, which may be paywalled (`lib/sources/adapters/crossref.ts:169-170`).
- OpenReview PDF URL concatenation breaks on absolute URLs (`lib/sources/adapters/openreview.ts:88`).
- Undated records pass date filters (`lib/search/rank.ts:18-21`, `arxiv.ts:95`, `core.ts:86`).
- `/api/pdf` returns Unpaywall URLs without `safeUrl` (`app/api/pdf/route.ts:23-24`).
- No CSRF/origin/content-type checks on POST routes; cross-site forms can burn quota.
- Raw upstream/error messages surfaced to users (`app/api/*`, `AccountSections.tsx:68`, `ShareDialog.tsx:21`); `/api/health` is public and discloses configured integrations.
- Native `confirm()` used in library/share/account flows (`app/library/page.tsx:217`, `components/ShareDialog.tsx:77`, `components/settings/AccountActions.tsx:39`).
- Global `animation: none !important` (`app/globals.css:129-134`) freezes spinners on suggestions (`components/SuggestionsClient.tsx:272,349,365`).
- No `global-error.tsx`; `decodeURIComponent(id)` can throw on malformed ids (`app/paper/[id]/page.tsx:24`).
- Sitemap sets `lastModified: new Date()` for every URL (`app/sitemap.ts:19-24`).
- README says `npm install` while CI uses `npm ci`; source-health workflow header still says 57 sources; README API list omits `abstract`/`health`.
- `.env*` is broadly ignored (`.gitignore:56-57`), which would hide a future tracked env example; `.mimocode/skills/*` are tracked despite `/.mimocode/` being ignored.
- Bus factor 1; no CONTRIBUTING, SECURITY, CODEOWNERS or issue templates.

---

## 3. What is genuinely good

Worth stating plainly, because it is unusual:

1. **The Firestore boundary is correct.** Owner-only reads/writes, default deny, random share ids, single-document public reads, suggestion ids regex-validated before `exists()`. Most hobby/free apps get this wrong.
2. **Failure isolation is designed, not accidental.** Per-source deadlines, `AbortSignal` composition, adaptive cooldowns, optional Redis with a circuit breaker, and pacing for arXiv/NCBI/Semantic Scholar.
3. **Untrusted input is treated as untrusted.** `normalizePaper` validates every record; citations are HTML-escaped before `dangerouslySetInnerHTML`; links are protocol-filtered; backups whitelist fields and clamp lengths; CSV guards formula injection; RTF escaping is correct.
4. **The adapter abstraction scales.** 60 adapters over 5 platform clients with a typed registry is maintainable, and the test suite already covers the tricky normalizers.
5. **The product thinking is real.** Local/Foreign tagging for Philippine theses, synthesis matrix → Word/Excel, share-by-link for thesis groups, "New since last search", retraction warnings, and "preprint not peer-reviewed" badges are exactly the features thesis students need and paid tools often bury.

---

## 4. Honest product review

### Where it is strong

- **Coverage of free sources is the killer feature.** Aggregating 60+ free databases — especially Philippine repositories that Google Scholar indexes unevenly — in one ranked list is a real time saver. A student who would otherwise bounce between five search boxes gets one.
- **The workflow matches how RRL is actually written:** discover → save → tag Local/Foreign → synthesize in a matrix → export. That is the right shape, and the matrix export is more useful than a generic reference manager for many undergraduates.
- **Trust signals matter.** Retraction and expression-of-concern checks, plus explicit preprint labelling, teach good research hygiene instead of hiding it.
- **Free and legal-by-design.** No paywalled scraping, no shadow library, no account required to search.

### Where it falls short (honestly)

- **Ranking is keyword overlap, not relevance or quality.** The app says so, but students will still treat the top result as "the best paper." Without citation-network or semantic ranking, it can surface weak matches above seminal work. This is the single biggest product-quality ceiling.
- **It is not a replacement for Scopus, Web of Science, PubMed's full tooling, or a university library proxy.** It cannot see gated full text, and coverage of non-indexed local journals is only as good as the underlying repository APIs.
- **No full-text search or systematic-review tooling.** No PRISMA flow, no screening, no inter-rater workflow, no deduplication report for a formal review. It is a discovery and organization aid, not a review-management tool.
- **Collaboration is share-and-copy, not co-editing.** Fine for "send my group my list," not for a live shared matrix.
- **Citation output is good but not publisher-perfect.** Four styles, no CSL engine, no custom styles, no Word/LibreOffice plugin or Zotero round-trip beyond `.bib`/`.ris`.
- **Privacy defaults are not student-safe on shared hardware** (H1/H2). This is the most important thing to fix before promoting it in computer labs.
- **Accessibility gaps block a core flow** for screen-reader users (H4).
- **One maintainer, one deployment, free-tier quotas.** If the author graduates or the Vercel/Firebase free tier pauses, the tool can disappear. There is no sustainability plan (no governance, funding, or institutional hosting path).

---

## 5. How much can this actually help students and people?

**High value, but bounded. Be honest about the bounds.**

**Students (especially Philippine undergraduates writing Chapter 2 / RRL): high real-world help.**
- The biggest time sink in an undergraduate thesis is finding enough *relevant, local, accessible* literature. This tool compresses the search phase from hours across many sites into one ranked list with abstracts, free-PDF links and retraction warnings.
- The Local/Foreign split and synthesis matrix map directly onto what advisers ask for, which reduces the "I found papers but don't know how to organize them" problem.
- Free and no-login-to-search removes the two biggest adoption barriers: cost and account friction.
- Realistic ceiling: it saves maybe 30–60% of the *discovery and organization* time for a typical undergraduate RRL. It does not write the review, judge quality, or replace reading the papers. Students who treat ranking as quality will be misled.

**Graduate students / early researchers: moderate help.**
- Useful for scoping and for grey literature / local repositories that mainstream indexes miss.
- Insufficient alone for a thesis-level or systematic review: no advanced query language, weak semantic ranking, limited full-text access, no screening/PRISMA workflow, no citation-graph exploration. They will still need Scopus/Web of Science, a library proxy, and Zotero.

**The general public / non-academics: low-to-moderate.**
- Good for finding readable open-access material on a topic (health, education, agriculture, local studies).
- Abstracts are jargon-heavy, and the app intentionally does not summarize into plain language (only labelled AI one-liners from Semantic Scholar). It is a research tool, not a public explainer.

**Educators / librarians: potentially high leverage, if packaged.**
- The curated, trustworthy source list and retraction signals make it a good teaching demo for "how to search and how to judge a source."
- But accessibility gaps, privacy-on-shared-machines issues, and single-maintainer risk must be resolved before recommending it institutionally.

**Bottom line on impact:** it can meaningfully help tens of thousands of students if it stays free and is promoted through Philippine universities. Its honest niche is *"the fastest free way to find and organize RRL sources, including local ones"* — not *"the best research database."* Keeping that positioning will make it trusted; overpromising will make it resented.

---

## 6. Prioritized roadmap

**Before any promotion / wider use (do first):**
1. Fix shared-machine privacy (H1): per-uid or cleared Dexie, clear search history/saved searches and Cache Storage on sign-out; stop caching private routes in the service worker.
2. Fix analytics privacy (H2): remove raw search terms and query strings from events; add a consent gate.
3. Accessibility pass (H4): `aria-pressed`/`aria-checked`, live regions for streaming, inline form errors.
4. Add Firestore rules unit tests and an emulator CI job (M13).

**Near term:**
5. Rate-limit hardening (H3), redirect-safe SSRF checks (M9), response byte caps (M10).
6. Remove the shared-copy id override and restrict spread fields (M7).
7. Move filters after merge; backfill `concern`/dates; fix non-Latin tokenization (M1–M4).
8. Lazy-load Firebase from the header (H5); replace per-card Dexie subscriptions with one batched query.
9. Add auth + search + save/sync + share e2e against a production build (M15).

**Medium term:**
10. Per-user document quotas + App Check in production (M5); conflict-safe library writes (M6).
11. Better ranking (citation/semantic signals) and a clear "why this ranked here" explanation.
12. Sustainability/governance plan: CONTRIBUTING, SECURITY, issue templates, CO₂-friendly hosting note, and ideally an institutional or sponsored home so it survives the author's graduation.

---

## 7. One-paragraph verdict

This is not a toy project. It is a coherent, well-factored, tested, security-conscious product with a real niche and a genuinely correct data-isolation model. Its weaknesses are the ones that come from being built by one careful person on free infrastructure: privacy defaults tuned for a personal app rather than a shared lab, a few proxy/redirect hardening gaps, accessibility states that were styled but not annotated, and tests concentrated in pure logic rather than the security boundary. None of the high findings are architectural or hard; most are a focused week of work. Fix H1–H4, add rules tests, and this becomes something a Philippine university could responsibly recommend to its students — with the honest framing that it accelerates *finding and organizing* sources, not *judging* them.
