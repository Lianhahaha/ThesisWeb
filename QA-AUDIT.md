# ThesisWeb — QA Audit (Researcher Perspective)

**Date:** 2026-11-08
**System:** ThesisWeb (`https://thesiswebph.vercel.app`, local production build)
**Commit under test:** `962f99b` (plus fixes `ff91b44`, `031e4fd`)
**Method:** researcher-journey exploratory QA + domain-rule discovery + automated gates
**Tester role:** QA engineer acting as an undergraduate thesis researcher writing an RRL

---

## 1. Executive summary

The core researcher journey works end to end on a production build: a real multi-database search rendered its first page of **40 result cards**, the quality-signals sort worked, a result opened into a readable detail page, the paper was saved to the local library, a known DOI produced a citation, and the mobile layout had zero horizontal overflow.

**On the number “40”:** it is the rendered page size (`PAGE_SIZE = 40` in `app/search/page.tsx`), not the total number of deduplicated results. The page reports the full count separately as “X of N papers”, and “Show 40 more” reveals the next page. The QA script counted rendered `<article>` cards, so 40 means “the first page was full and readable”, not “only 40 results exist” or “all 40 are high quality”.

Two real defects were found and fixed during this audit:

| ID | Severity | Finding | Status |
|---|---|---|---|
| QA-01 | **High** | Clicking a result before the streamed search finished opened `/paper/[id]` as **“Paper not found”** | Fixed `ff91b44` |
| QA-02 | **Medium** | zbMATH returned **HTTP 404** for out-of-scope topics and was shown as a failed source | Fixed `031e4fd` |

The audit also found coverage gaps that are risks, not confirmed defects: signed-in/auth/share/sync flows were not exercised, the peer-reviewed filter showed no visible change on the test query (likely all 40 results were peer-reviewed), and three sources were intermittently unavailable.

**Release view:** the signed-out research workflow is fit for use. The signed-in workflow still needs an emulator-based E2E pass before calling it release-ready.

---

## 2. Skills used (cloned under `C:\Users\My PC\OneDrive\Documents\QA skills`)

| Repo | How it was used |
|---|---|
| `PramodDutta/qaskills` | QA-skill router and browser/QA patterns |
| `naodeng/awesome-qa-skills` | `discover-testing`, `product-quality-perspective`, `qa-quality-perspective` |
| `ghenriquec/universal-domain-rules-discover-skill` | Read-only domain rule discovery (actors, entities, states, permissions, rules, gaps) |
| `petrkindlmann/qa-skills` | `qa-start`, `exploratory-testing` (SBTM charter) |
| `bmaltais/browser-use-skill` | Browser interaction/exploration patterns |
| `rakutentech/sorify` | E2E/agentic QA reference (screenshot says “sortify”; the repo is `sorify`) |
| `addyosmani/agent-skills` | Test/quality gates, browser testing with devtools |
| `mattpocock/skills` | Research workflow for cross-checking behavior against docs/code |

**Route taken:** `discover-testing` → risk-based exploratory session + browser automation + domain discovery. One primary QA flow (researcher RRL) and one supporting flow (citation lookup), per the skill's one-primary/one-helper rule.

The domain-discovery skill is **read-only**; no product code was changed during discovery. The two code fixes were made only after the discovery phase, and are recorded separately below.

---

## 3. Scope

**Covered**
- Home, search, results streaming, sort, peer-reviewed filter, paper detail, local save, library, citation generator, mobile layout, databases page.
- Real data across multiple fields through the normal fan-out.
- Unit, type, lint, production build, Playwright smoke/accessibility, live source checks.
- Domain rules: authorization, ownership, states, limits, side effects, gaps.

**Not covered (evidence gaps, not passes)**
- Google/email sign-in, Firestore sync, share-link copy, account deletion (no auth emulator in this pass).
- `.bib`/`.ris` import, export to RTF/CSV, synthesis matrix editing.
- Offline/PWA behavior and browser-extension/service-worker edge cases.
- Load/performance beyond normal page timings.

---

## 4. Domain discovery (condensed)

### 4.1 Actors and entities

| Actor | Can do |
|---|---|
| Visitor | Search, read results, open papers, cite DOIs, read suggestions |
| Signed-out student | Everything a visitor can, plus save to browser-only library, collections, notes, matrix |
| Signed-in student | Save/sync library to Firestore, import/backup, create/stop shares |
| Group member with share link | Read/export/copy a shared library |
| Signed-in feedback author | Post suggestions and replies |

Entities: `Paper`, `SavedPaper`, `Collection`, `Note`, `Matrix`, `SharedLibrary`, `Profile`, `Suggestion`, `Reply`.

### 4.2 Permissions (confirmed from `firestore.rules` + code)

| Resource | Operation | Visitor | Signed-in owner | Other signed-in |
|---|---|---|---|---|
| `users/{uid}/papers/{id}` | read/write | denied | allowed (owner only) | denied |
| `users/{uid}/profile/main` | read/write | denied | allowed (owner only) | denied |
| `shared/{shareId}` | get | allowed | allowed | allowed |
| `shared/{shareId}` | list/update/delete | denied | owner only | denied |
| `suggestions/{id}` | read/create | read allowed; create denied | create allowed | create allowed |
| `replies/{id}` | read/create | read allowed; create denied | create allowed if parent exists | create allowed if parent exists |

### 4.3 States and transitions

| Entity | States | Transitions observed |
|---|---|---|
| Search | idle → pending/streaming → done / error | new search aborts the previous one; refresh restores URL query |
| Paper | unsaved → saved → removed | Save/Remove in results, detail, library |
| Share | created → updated → stopped | create link, stop link |
| Account | signed out → signed in → signed out | Google/email sign-in; sign-out clears local data |
| Saved search | saved → re-run (New marks) → removed | Save search / Stop tracking |

### 4.4 Confirmed rules

- Search words are capped (`MAX_QUERY_LENGTH = 300`); minimum query length enforced in the form.
- Year and free-full-text filters are applied after merge; duplicates are merged by DOI, then title+year.
- Retractions/expressions of concern and preprints are surfaced as badges; AI summaries are labelled.
- Firestore rules cap fields (title 1,000, abstract 40,000, notes 20,000, 40 keys) and a share at 200 papers.
- API routes are rate-limited per IP and site-wide for expensive routes; source deadlines isolate slow databases.
- Signed-out data is browser-only IndexedDB; sign-out clears local papers, history, saved searches, cached names and private caches.

### 4.5 Conflicts and gaps (from the domain-rules skill)

| ID | Gap / conflict | Risk | QA impact |
|---|---|---|---|
| G-01 | No per-user Firestore document/count quota | Medium | A script with the public config can fill free-tier quota |
| G-02 | No auth-emulator E2E coverage for sign-in/share/sync | High | Signed-in workflow is unverified |
| G-03 | Email verification/reset relies on Firebase's hosted action handler | Low/Medium | Reset/verify links can fail if the handler is misconfigured |
| G-04 | `safeId` legacy mapping is only backwards-compatible, not fully migrated | Medium | Old ambiguous ids still need dual reads |
| G-05 | Some sources are scraped (HERDIN, Philippine E-Journals, etc.) | Medium | A site change can break a source until the daily health run |
| G-06 | “Quality signals” is a heuristic, not research quality | Low | Users may over-trust the label; the UI disclaimer mitigates this |
| G-07 | No CSRF/origin checks on POST routes | Low | A cross-site form can burn a victim's quota |

---

## 5. Automated evidence

| Gate | Result |
|---|---|
| `npx tsc --noEmit` | Pass |
| `npm run lint` | Pass |
| `npm test` | **262/262 tests, 50 files** |
| `npm run build` | Pass (exit 0) |
| `npm run test:e2e` | **11 passed** (10 smoke/a11y + 1 researcher journey) |
| Live zbMATH with a social-science query | 0 papers, **no failure** (correct empty result) |
| Full source sweep (2026-11-08 11:58Z) | **79/85 working**, 5 unavailable, 1 skipped |
| Researcher browser journey | Pass (evidence below) |

---

## 6. Findings

### QA-01 — High — Mid-search click opened “Paper not found” (fixed)

**Observed:** In the first browser run, clicking the top result after the first streamed paint opened `/paper/[id]` with `h1 = "Paper not found"`.
**Root cause:** `app/search/page.tsx` only called `storeRecentPapers()` in `finish()` after the whole stream completed. The detail page resolves unsaved papers from that session store, so a click before completion had nothing to resolve.
**Reproduction:** run a real search, click the first result within a few seconds (before all sources finish).
**Fix:** `ff91b44` — every throttled paint now calls `mergeRecentPapers(next.papers)`, and the result card link also stashes the clicked paper (`onClick`/`onAuxClick`). The detail page now renders the real title and citation section.
**Regression:** the researcher spec asserts the detail `h1` is not “Paper not found”.

### QA-02 — Medium — zbMATH 404 treated as a failed source (fixed)

**Observed:** server log `[search] zbmath failed: HTTP 404` for `reading comprehension strategies`.
**Root cause:** the adapter threw on every non-OK status; zbMATH answers 404 when it has no matching records for a topic outside mathematics.
**Fix:** `031e4fd` — 404 now returns `[]`; real 5xx errors still fail after one retry. New unit test covers both.
**Verification:** live run with the same social-science query returned `zbmath: 0 papers`, test passed.

### QA-03 — Medium — Peer-reviewed filter showed no visible change (unverified)

**Observed:** 40 rendered cards before and 40 after enabling “Peer-reviewed only” (first page).
**Interpretation:** likely all 40 rendered results were peer-reviewed (no preprints in the first page), so the filter correctly removed nothing. This is **not confirmed as a defect**.
**Next evidence needed:** run the same check on a preprint-heavy query (e.g. “large language models”) and compare `peerCount` in the filter label with the rendered count.

### QA-04 — Low / environment — Console noise in headless Chromium

**Observed:** `requestStorageAccess: Permission denied`, `AppCheck: 403`, and reCAPTCHA request failures.
**Interpretation:** headless Chromium blocks third-party storage/reCAPTCHA; the app still works signed out. Verify in a normal browser with App Check enabled; do not treat this as an app logic failure.

### QA-05 — High (coverage gap) — Signed-in flows untested

Sign-in, Firestore sync, share→copy, and account deletion were not exercised. These are the highest-risk unverified paths because they involve authorization and data ownership. Recommend a Firebase emulator E2E job (auth + Firestore) before release.

### QA-06 — Medium (coverage gap) — Import/export/offline/matrix untested

`.bib`/`.ris` import, RTF/CSV export, matrix editing, offline/PWA behavior were not exercised in this pass. Unit coverage exists for the parsers/exporters, but not an end-to-end browser proof.

### QA-07 — Low — Source availability is volatile

The QA run saw OSTI timeout, CORE rate-limited, IEEE inactive key, and Google Books skipped locally. The search still returned 40 results and the UI isolates failures per source. The full sweep was 79/85. No crash; the risk is user perception of missing coverage.

### QA-08 — Low — Possible title encoding artifact

One title in the JSON evidence rendered as `Teachers�?T` while the library UI screenshot showed `Teachers'` correctly. Treat this as a console/JSON encoding artifact unless reproduced in the browser; add an encoding assertion if it recurs.

### QA-09 — Info — What passed well

- Real search: first page of 40 rendered cards, real titles, URL keeps the query.
- Quality-signals sort works and shows the heuristic disclaimer.
- Paper detail loads, abstract and citation section present.
- Save → library works (title visible in the browser-only library).
- Known DOI `10.1038/nature12373` resolves to a citation.
- Mobile viewport has 0 px horizontal overflow.
- Databases page renders “The databases” with all 85 sources.
- Citation fields are HTML-escaped; markup tests pass.

---

## 7. Researcher journey result

`tests/e2e/qa-researcher.spec.ts` (network-dependent; skipped in CI):

| Step | Result |
|---|---|
| Home loads | Pass — “Research, simplified.” |
| Search “reading comprehension strategies” | Pass — 40 rendered cards (first page), query in URL |
| Quality-signals sort | Pass — 40 results, disclaimer visible |
| Peer-reviewed filter | 40 → 40 (unverified, see QA-03) |
| Open paper | Pass — real h1, citation section |
| Save → library | Pass — saved title visible |
| Cite DOI | Pass — Nature paper citation |
| Mobile layout | Pass — 0 px overflow |
| Databases page | Pass — “The databases” |

Evidence: `C:\Users\My PC\OneDrive\Documents\QA skills\evidence\`
- `qa-run.json`, `01-home.png`, `02-search-results.png`, `03-quality-sort.png`, `04-paper-detail.png`, `05-library.png`, `06-cite.png`, `07-mobile.png`.

---

## 8. Risk assessment

| Area | Risk | Why |
|---|---|---|
| Signed-in sync/share | **High** | Untested authorization/data-ownership flows; a bug could lose or expose library data |
| Mid-search navigation | Medium | Fixed, but the regression test is network-dependent and skipped in CI |
| Source coverage | Medium | Volatile third-party APIs; daily health check is the safety net |
| Peer-reviewed filter | Medium | Behavior unverified on preprint-heavy data |
| Citation accuracy | Medium | Bounded by upstream metadata; users must spot-check |
| Signed-out privacy | Low | Sign-out now clears local data and private caches |
| Mobile layout | Low | 0 px overflow on the tested viewport |

---

## 9. Recommendations (priority order)

1. **Add an auth + Firestore emulator E2E job** covering sign-up/sign-in, save→sync, share→copy, and account deletion (closes QA-05).
2. **Add an E2E for import/export/matrix/offline** (closes QA-06).
3. **Verify the peer-reviewed filter on a preprint-heavy query** and assert the count drops (closes QA-03).
4. **Keep the researcher spec out of CI** (already does) and run it before every production deploy with `QA_EVIDENCE` set.
5. **Add per-user Firestore quotas / App Check enforcement** (G-01).
6. **Add a source-health badge in the results sidebar** so users see “3 sources unavailable” rather than silently missing coverage.
7. **Add an encoding assertion** on titles if QA-08 reproduces.
8. **Consider a small “Why this ranked here” hint** next to “Quality signals” to prevent over-trust.

---

## 10. Limitations

- Signed-out only; no auth/Firestore emulator in this pass.
- One desktop Chromium and one mobile viewport; no Safari/Firefox real-device pass.
- No load testing, no long-running soak.
- Third-party source availability is time-dependent; the counts reflect the run at 2026-11-08.
- The domain-discovery artifact set was condensed into this report; the universal skill's full JSON/schema artifact tree was not generated.

---

## 11. Evidence index

- QA spec: `tests/e2e/qa-researcher.spec.ts`
- zbMATH regression: `tests/unit/zbmath.test.ts`
- Fix commits: `ff91b44`, `031e4fd`, `962f99b`
- Browser evidence: `C:\Users\My PC\OneDrive\Documents\QA skills\evidence\`
- Cloned skill repos: `C:\Users\My PC\OneDrive\Documents\QA skills\`

**Reproduce:**

```powershell
$env:QA_EVIDENCE="C:\Users\My PC\OneDrive\Documents\QA skills\evidence"
npx playwright test tests/e2e/qa-researcher.spec.ts --reporter=line
```
