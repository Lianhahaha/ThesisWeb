# ThesisWeb

A web app that helps thesis students **find related literature (RRL)**, **organize it**, and **pre-check their writing for AI-likeness** before a strict professor does.

Built for the two biggest thesis pain points:
1. *"I can't find recent papers related to my topic."*
2. *"Our prof is strict about AI detection — I don't want my honest paper flagged."*

---

## ✨ What it does

### 🔍 Find RRLs (search)
- **Multi-source meta-search** across **OpenAlex**, **Crossref**, and **Semantic Scholar** — three of the largest free academic databases, merged and de-duplicated into one ranked list.
- **5-year recency filter by default** — most thesis rubrics require "recent" sources (within 5 years). You can widen to 3 / 10 years or "all years".
- **Relevance scoring** based on topic-term overlap + citation signal.
- **Open-access badges + "Free PDF" button** — finds legal OA copies via Unpaywall, so paywalls don't stop you.
- **Fault-tolerant** — if one source is down or rate-limiting, the others still populate results.

### 📚 Library (reference manager)
- Save papers with one click — your library lives in your browser (IndexedDB), no account needed.
- **Collections** — group papers by RRL section ("Foreign studies", "Local studies", "Theoretical framework", etc.).
- **Notes** per paper.
- **Synthesis matrix** — a table of `Paper | Method | Findings | Limitations | Relevance to my topic`. This is the actual tool that turns a pile of papers into a written review of related literature. Auto-saves per cell.
- **Export** to **APA 7 / MLA 9 / IEEE / Chicago** reference lists, in-text citations, **BibTeX (.bib)**, and **RIS** (for Zotero / Mendeley / EndNote).

### 🪄 AI self-check
- Paste a paragraph of your thesis. The checker flags the **statistical patterns that make text read as AI-generated**:
  - Low **burstiness** (sentences all the same length)
  - Low **lexical richness** (repetitive vocabulary)
  - High **transition-word density** ("moreover", "furthermore", "however" overuse)
  - **Formulaic openers** ("This shows that…", "The results indicate…")
  - High **predictability** (common word-pair collocations)
- Gives **concrete rewrite suggestions**, not just a score.
- Framed as a **writing coach, not a detection-evasion tool** — it helps you write more authentically so an honest paper isn't flagged by mistake. It will *not* magically defeat Turnitin, and using it that way isn't what it's for.

---

## 🚀 Getting started

### Prerequisites
- Node.js 18+ (tested on Node 24)
- npm

### Install & run
```bash
npm install
cp .env.example .env.local   # then edit .env.local
npm run dev
```
Open http://localhost:3000

### Environment variables
| Variable | Required? | Purpose |
|---|---|---|
| `UNPAYWALL_EMAIL` | Recommended | A real email for Unpaywall's polite pool. Without it, the "Find free PDF" button is disabled. |
| `SEMANTIC_SCHOLAR_API_KEY` | Optional | Raises the rate limit on Semantic Scholar. Without it, S2 still works but may occasionally be rate-limited. |

---

## 🏗 Architecture

```
Next.js 16 (App Router) + React 19 + TypeScript + Tailwind
├── app/
│   ├── page.tsx              # dashboard
│   ├── search/               # RRL discovery
│   ├── library/              # reference manager + synthesis matrix
│   ├── ai-check/             # detection self-check
│   ├── paper/[id]/           # paper detail: notes, summary, citation
│   └── api/
│       ├── search/           # meta-search proxy
│       ├── pdf/              # Unpaywall proxy
│       ├── summarize/        # extractive summarizer
│       └── ai-check/         # heuristic detector
├── lib/
│   ├── sources/              # openalex, crossref, semanticscholar, unpaywall
│   ├── search.ts             # meta-search aggregator
│   ├── dedupe.ts             # DOI/title dedupe + relevance scoring
│   ├── summarize.ts          # TextRank-style extractive summary
│   ├── ai-detector.ts        # burstiness/TTR/transition/n-gram heuristics
│   ├── citations.ts          # APA/MLA/IEEE/Chicago/BibTeX/RIS formatters
│   └── db.ts                 # Dexie (IndexedDB) persistence
└── components/               # Sidebar, PaperCard, SynthesisMatrix, etc.
```

### Design choices
- **Server-side API proxies** — all external calls go through Next.js API routes. Avoids CORS, centralizes timeouts and rate-limits, keeps adapter code out of the client bundle.
- **No backend database / no auth** — the library lives in the browser via IndexedDB (Dexie). Zero hosting cost, works offline once loaded, fully private.
- **Free/heuristic only** — no paid LLM APIs. Summaries are *extractive* (picks the author's own best sentences), which is actually safer for a thesis tool: no hallucinated claims, no AI-flavored phrasing introduced.
- **Fault-tolerant search** — `Promise.all` over sources with per-source try/catch, so one failing API never blanks the results.

---

## ⚖️ Ethics & legal

- **Academic APIs only** — OpenAlex, Crossref, Semantic Scholar, Unpaywall, CORE. All free and legitimate.
- **Legal full-text only** — the "Free PDF" button links to **open-access** copies (publisher OA, repositories, preprints). It will **never** link to Sci-Hub or piracy.
- **The AI self-check is a writing coach.** It exists to help students write more authentically and avoid *false positives* — not to help anyone pass off AI-generated work as their own.

---

## 🔧 Roadmap (nice-to-haves, not built yet)

- PDF upload + in-browser "chat with paper" (semantic retrieval over the text)
- Optional BYO-key LLM slot for abstractive summaries
- Literature-gap finder across saved papers
- PWA / offline mode for the library
- Reading-progress tracker per paper

---

## 📚 Data sources

| Source | Used for | Key? |
|---|---|---|
| [OpenAlex](https://openalex.org) | Primary discovery, abstracts, OA status | None (polite email) |
| [Crossref](https://crossref.org) | Metadata, DOIs, references | None (polite email) |
| [Semantic Scholar](https://semanticscholar.org) | TLDRs, citation graph | Free key recommended |
| [Unpaywall](https://unpaywall.org) | Finding legal OA PDFs | Real email required |
