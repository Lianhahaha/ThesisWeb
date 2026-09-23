"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { SearchPanel, DEFAULT_FROM_YEAR } from "@/components/SearchPanel";
import { KEYLESS_SOURCE_COUNT, SOURCE_META } from "@/lib/sources/meta";
import { buildSearchParams, type SearchInput } from "@/lib/search-params";
import { fromYearFor, getPreferences } from "@/lib/preferences";

const SOURCE_NAMES = Object.values(SOURCE_META)
  .filter((s) => !s.needsKey)
  .map((s) => s.label);

const STEPS: { title: string; body: React.ReactNode }[] = [
  {
    title: "Search and narrow",
    body: (
      <>
        Type three to six words about your topic. Set <em>Published since</em>{" "}(most rubrics want
        the last 5 years), a <em>Country focus</em>{" "}for local studies, or tick{" "}
        <em>Free full text only</em>. On the results, sort by best match, citations or date, pick a
        single database from the <em>Databases</em>{" "}list, or add a <em>Narrow with</em>{" "}term.
      </>
    ),
  },
  {
    title: "Read and save",
    body: (
      <>
        Open a title for its abstract, a free PDF link (or <em>Find free PDF</em>), a ready
        citation, related papers and a notes box. Press <em>Save</em>{" "}to keep it. Your library
        lives in this browser; sign in to keep it on every device.
      </>
    ),
  },
  {
    title: "Organise and cite",
    body: (
      <>
        In <Link href="/library" className="underline">Library</Link>, group papers into
        collections (e.g. <em>Local studies</em>) and fill the synthesis matrix: method, findings,
        limitations, relevance. <em>Export references</em>{" "}gives APA, MLA, IEEE or Chicago, plus
        .bib and .ris for Zotero or Mendeley. Have DOIs already? Paste them into{" "}
        <Link href="/cite" className="underline">Cite</Link>.
      </>
    ),
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

  // Saved defaults live in localStorage, so apply them after mount.
  useEffect(() => {
    const p = getPreferences();
    setForm((f) => ({ ...f, fromYear: fromYearFor(p), country: p.country, openAccessOnly: p.openAccessOnly }));
  }, []);

  return (
    <div>
      <section className="mx-auto max-w-3xl pb-10 pt-4 text-center sm:pt-10">
        <p className="eyebrow">Related literature, found faster</p>
        <h1 className="display mt-4 text-4xl sm:text-5xl">
          Research, <em>simplified.</em>
        </h1>
        <p className="mx-auto mt-4 max-w-lg text-muted">
          One search across {KEYLESS_SOURCE_COUNT} free academic databases.
        </p>

        <div className="mt-8">
          <SearchPanel
            value={form}
            onChange={setForm}
            onSearch={(input) => router.push(`/search?${buildSearchParams(input)}`)}
          />
        </div>

        <ul className="mt-6 flex flex-wrap justify-center gap-1.5" aria-label="Databases searched">
          {SOURCE_NAMES.map((name) => (
            <li key={name} className="tag">{name}</li>
          ))}
        </ul>
      </section>

      <section id="readme" className="mx-auto max-w-4xl py-8" aria-labelledby="readme-h">
        <div className="panel">
          <h2 id="readme-h" className="eyebrow !text-sm !font-semibold !text-text">READ ME</h2>
          <p className="mt-1 text-sm text-muted">How to go from a topic to a reference list.</p>

          <ol className="mt-4 grid gap-x-8 gap-y-0 md:grid-cols-3">
            {STEPS.map((s, i) => (
              <li
                key={s.title}
                className="flex gap-3 border-t border-border py-3 first:border-t-0 md:border-t-0"
              >
                <span className="serif text-xl leading-none text-subtle" aria-hidden>
                  {i + 1}
                </span>
                <div className="min-w-0">
                  <h3 className="text-base">{s.title}</h3>
                  <p className="mt-0.5 text-sm text-muted">{s.body}</p>
                </div>
              </li>
            ))}
          </ol>

          <div className="mt-4 border-t border-border pt-3">
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
                Set a recovery PIN in{" "}
                <Link href="/settings" className="underline">Settings</Link> as soon as you sign up.
                Without one, a forgotten password cannot be reset.
              </li>
              <li>No results? Drop a word, widen <em>Published since</em>, or untick <em>Free full text only</em>.</li>
              <li>Search with keywords, not a full question. &ldquo;Senior high school anxiety&rdquo; beats a sentence.</li>
            </ul>
          </div>
        </div>
      </section>
    </div>
  );
}
