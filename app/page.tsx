"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { SearchPanel, DEFAULT_FROM_YEAR } from "@/components/SearchPanel";
import { DatabasesDialog } from "@/components/DatabasesDialog";
import { SOURCE_COUNT } from "@/lib/sources/meta";
import { RRL_GUIDES } from "@/lib/rrl-guides";
import { GUIDES } from "@/lib/guides";
import { buildSearchParams, type SearchInput } from "@/lib/search/params";
import { fromYearFor, getPreferences } from "@/lib/preferences";

const STEPS: { title: string; body: string }[] = [
  {
    title: "Search and narrow",
    body: "Type 3–6 words, set a year and scope, then search.",
  },
  {
    title: "Read and save",
    body: "Open a result, read the abstract or free PDF, and press Save.",
  },
  {
    title: "Organise and cite",
    body: "Fill the matrix, then export APA, MLA, IEEE, Chicago, BibTeX or RIS.",
  },
];

export default function HomePage() {
  const router = useRouter();
  const [form, setForm] = useState<SearchInput>({
    query: "",
    fromYear: DEFAULT_FROM_YEAR,
    openAccessOnly: false,
    country: null,
  });
  const [showDatabases, setShowDatabases] = useState(false);

  // Saved defaults live in localStorage, so apply them after mount.
  useEffect(() => {
    const p = getPreferences();
    setForm((f) => ({ ...f, fromYear: fromYearFor(p), country: p.country, openAccessOnly: p.openAccessOnly }));
  }, []);

  return (
    <div>
      <section className="mx-auto max-w-3xl pb-8 pt-2 text-center sm:pt-6">
        <p className="eyebrow">Related literature, found faster</p>
        <h1 className="display mt-3 text-3xl sm:text-4xl">
          Research, <em>simplified.</em>
        </h1>
        <p className="mx-auto mt-3 max-w-lg text-sm text-muted sm:text-base">
          One search across {SOURCE_COUNT} free academic databases.
        </p>

        <div className="mt-6">
          <SearchPanel
            value={form}
            onChange={setForm}
            onSearch={(input) => router.push(`/search?${buildSearchParams(input)}`)}
          />
        </div>

        <button type="button" onClick={() => setShowDatabases(true)} className="btn-ghost btn-sm mt-4">
          See all {SOURCE_COUNT} databases
          <ChevronRight className="h-3.5 w-3.5" aria-hidden />
        </button>
        {showDatabases && <DatabasesDialog onClose={() => setShowDatabases(false)} />}
      </section>

      <section id="readme" className="mx-auto max-w-3xl py-6" aria-labelledby="readme-h">
        <div className="panel">
          <h2 id="readme-h" className="eyebrow !text-sm !font-semibold !text-text">READ ME</h2>
          <p className="mt-1 text-sm text-muted">How to go from a topic to a reference list.</p>

          <ol className="mt-3 grid gap-x-5 gap-y-0 md:grid-cols-3">
            {STEPS.map((s, i) => (
              <li
                key={s.title}
                className="flex gap-2.5 border-t border-border py-2.5 first:border-t-0 md:border-t-0"
              >
                <span className="serif text-lg leading-none text-subtle" aria-hidden>
                  {i + 1}
                </span>
                <div className="min-w-0">
                  <h3 className="text-sm font-semibold">{s.title}</h3>
                  <p className="mt-0.5 text-sm text-muted">{s.body}</p>
                </div>
              </li>
            ))}
          </ol>

          <div className="mt-3 border-t border-border pt-2.5">
            <p className="text-sm font-semibold">Good to know</p>
            <ul className="mt-1.5 list-disc space-y-1 pl-5 text-sm text-muted">
              <li>
                <strong>Abstract ≠ RRL.</strong>{" "}
                The abstract is the authors&apos; own summary — use it to judge whether a paper fits your study, then
                read the paper and write your RRL in your own words. Copying abstracts into your chapter counts as
                plagiarism.
              </li>
              <li>Only free, legal sources. Full-text links go to publishers, repositories and preprint servers.</li>
              <li>Some databases are slow or down at times. The Databases list shows which ones answered.</li>
              <li>Preprints (arXiv, some Zenodo records) are not peer-reviewed. Check before you cite.</li>
              <li>Always check a generated citation against your school&apos;s style guide.</li>
              <li>
                Signing in? <em>Continue with Google</em> means no new password to forget. With email and
                password, confirm your address: that is where a reset link goes.
              </li>
              <li>No results? Drop a word, widen <em>Published since</em>, or untick <em>Free full text only</em>.</li>
              <li>Search with keywords, not a full question. &ldquo;Senior high school anxiety&rdquo; beats a sentence.</li>
            </ul>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-3xl pb-6" aria-labelledby="fields-h">
        <div className="panel">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 id="fields-h" className="eyebrow !text-sm !font-semibold !text-text">
              RRL FINDER BY FIELD
            </h2>
            <Link href="/rrl" className="text-xs font-medium text-accent hover:underline">
              All field guides →
            </Link>
          </div>
          <p className="mt-1 text-sm text-muted">
            Starter RRL topics, search tips, and the exact databases searched for each thesis subject.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {RRL_GUIDES.map((g) => (
              <Link key={g.slug} href={`/rrl/${g.slug}`} className="chip">
                {g.shortTitle}
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-3xl pb-6" aria-labelledby="guides-h">
        <div className="panel">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 id="guides-h" className="eyebrow !text-sm !font-semibold !text-text">
              RRL WRITING GUIDES
            </h2>
            <Link href="/guides" className="text-xs font-medium text-accent hover:underline">
              All {GUIDES.length} guides →
            </Link>
          </div>
          <p className="mt-1 text-sm text-muted">
            Step-by-step help with Chapter 2, synthesis matrices, APA citations, research gaps and
            more.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {GUIDES.slice(0, 6).map((g) => (
              <Link key={g.slug} href={`/guides/${g.slug}`} className="chip">
                {g.title}
              </Link>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
