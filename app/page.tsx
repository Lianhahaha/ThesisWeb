"use client";

import Link from "next/link";
import { ArrowRight, Search, Library, Sparkles } from "lucide-react";
import { useLiveQuery } from "dexie-react-hooks";
import { getDb } from "@/lib/db";
import { KEYLESS_SOURCE_COUNT, SOURCE_META } from "@/lib/sources/meta";

const SOURCE_NAMES = Object.values(SOURCE_META)
  .filter((s) => !s.needsKey)
  .map((s) => s.label);

const FEATURES = [
  {
    icon: Search,
    title: "Multi-source search",
    body: `One topic, ${KEYLESS_SOURCE_COUNT} databases. Results are merged, de-duplicated and ranked by how well the title and abstract match your words.`,
    href: "/search",
    cta: "Search papers",
  },
  {
    icon: Library,
    title: "Reference manager",
    body: "Save papers into chapter collections, take notes, compare them in a synthesis matrix, and export APA, MLA, IEEE, Chicago, BibTeX or RIS.",
    href: "/library",
    cta: "Open library",
  },
  {
    icon: Sparkles,
    title: "AI self-check",
    body: "Paste a paragraph to see which patterns make writing read as AI-generated — uniform sentences, stock openers, transition overuse — and how to fix each one.",
    href: "/ai-check",
    cta: "Check writing",
  },
];

const FAQ = [
  {
    q: "Can't find recent papers on your topic?",
    a: `Type it once. ThesisWeb queries ${KEYLESS_SOURCE_COUNT} free databases at the same time, removes duplicates and ranks what is left. Defaults to the last 5 years, which is what most rubrics ask for.`,
  },
  {
    q: "Hitting paywalls?",
    a: "Every result is labelled when a legal open-access copy exists. For papers with a DOI but no free link, \"Find free PDF\" asks Unpaywall for one.",
  },
  {
    q: "Worried a strict professor will flag your writing?",
    a: "The AI self-check reports six writing-style signals and names the exact words and sentences to revise. It is a writing coach, not a detection-evasion tool.",
  },
];

export default function HomePage() {
  const savedCount = useLiveQuery(async () => {
    if (typeof window === "undefined") return 0;
    return getDb().papers.count();
  }, []);

  return (
    <div>
      {/* Hero */}
      <section className="py-8 sm:py-16">
        <p className="overline">Thesis research toolkit</p>

        <h1 className="display mt-4 text-[2.5rem] sm:text-6xl lg:text-7xl">
          Find your literature
          <br />
          <span className="text-subtle">in one search.</span>
        </h1>

        <p className="mt-6 max-w-xl text-base text-muted sm:text-lg">
          Search {KEYLESS_SOURCE_COUNT} free academic databases at once, keep what matters, and
          check your own writing before you submit.
        </p>

        <div className="mt-8 flex flex-wrap gap-3">
          <Link href="/search" className="btn-primary">
            Start searching
          </Link>
          <Link href="/library" className="btn-secondary">
            Open library
            {savedCount ? <span className="counter">{savedCount}</span> : null}
            <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
        </div>

        <ul className="mt-10 flex flex-wrap gap-2">
          {SOURCE_NAMES.map((name) => (
            <li key={name} className="chip">{name}</li>
          ))}
        </ul>
      </section>

      {/* What it does */}
      <section className="border-t border-border py-10 sm:py-14" aria-labelledby="features">
        <h2 id="features" className="sr-only">Features</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          {FEATURES.map(({ icon: Icon, title, body, href, cta }) => (
            <Link key={href} href={href} className="panel flex flex-col hover:border-border2">
              <Icon className="h-5 w-5 text-accent" aria-hidden />
              <h3 className="mt-4 text-lg">{title}</h3>
              <p className="mt-2 flex-1 text-sm text-muted">{body}</p>
              <span className="mt-5 inline-flex items-center gap-1.5 text-sm font-medium">
                {cta}
                <ArrowRight className="h-4 w-4" aria-hidden />
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* Why */}
      <section className="border-t border-border py-10 sm:py-14" aria-labelledby="why">
        <p className="overline">Built for thesis work</p>
        <h2 id="why" className="display mt-3 text-2xl sm:text-3xl">
          Three problems, solved
        </h2>

        <dl className="mt-8 grid gap-8 sm:grid-cols-3">
          {FAQ.map(({ q, a }) => (
            <div key={q}>
              <dt className="font-semibold">{q}</dt>
              <dd className="mt-2 text-sm text-muted">{a}</dd>
            </div>
          ))}
        </dl>

        <p className="mt-10 max-w-3xl text-sm text-subtle">
          ThesisWeb uses only free, public academic APIs and links exclusively to open-access full
          text from publishers, repositories and preprint servers. It never links to pirated copies.
        </p>
      </section>
    </div>
  );
}
