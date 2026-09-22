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
    title: "Search",
    body: (
      <>
        Type three to six words about your topic. Set <em>Published since</em>{" "}(most rubrics want
        the last 5 years), a <em>Country focus</em>{" "}for local studies, or tick{" "}
        <em>Free full text only</em>. Press Search.
      </>
    ),
  },
  {
    title: "Narrow",
    body: (
      <>
        Sort by best match, citations or date. Use the <em>Databases</em>{" "}list to show one
        database&apos;s results, or a <em>Narrow with</em>{" "}term to refine the search.
      </>
    ),
  },
  {
    title: "Read",
    body: (
      <>
        Open a title for its abstract, a free PDF link (or <em>Find free PDF</em>), a ready
        citation, related papers and a notes box.
      </>
    ),
  },
  {
    title: "Save",
    body: (
      <>
        Press <em>Save</em>{" "}on any paper. Your library lives in this browser; sign in to keep it
        on every device.
      </>
    ),
  },
  {
    title: "Organise",
    body: (
      <>
        In <Link href="/library" className="underline">Library</Link>, group papers into
        collections (e.g. <em>Local studies</em>) and fill the synthesis matrix: method,
        findings, limitations, relevance.
      </>
    ),
  },
  {
    title: "Cite",
    body: (
      <>
        <em>Export references</em>{" "}gives APA, MLA, IEEE or Chicago, plus .bib and .ris for Zotero
        or Mendeley. Have DOIs already? Paste them into{" "}
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

      <section
        id="readme"
        className="mx-auto max-w-3xl border-t border-border py-10"
        aria-labelledby="readme-h"
      >
        <h2 id="readme-h" className="eyebrow !text-sm !font-semibold !text-text">READ ME</h2>
        <p className="mt-2 text-muted">How to go from a topic to a reference list.</p>

        <ol className="mt-6 grid gap-3 sm:grid-cols-2">
          {STEPS.map((s, i) => (
            <li key={s.title} className="panel flex gap-4">
              <span className="serif text-2xl leading-none text-subtle" aria-hidden>
                {i + 1}
              </span>
              <div>
                <h3 className="text-lg">{s.title}</h3>
                <p className="mt-1 text-sm text-muted">{s.body}</p>
              </div>
            </li>
          ))}
        </ol>

        <div className="notice notice-info mt-6">
          <p className="font-semibold">Good to know</p>
          <ul className="mt-1 list-disc space-y-1 pl-5 text-muted">
            <li>Only free, legal sources. Full-text links go to publishers, repositories and preprint servers.</li>
            <li>Some databases are slow or down at times. The Databases list shows which ones answered.</li>
            <li>Preprints (arXiv, some Zenodo records) are not peer-reviewed. Check before you cite.</li>
            <li>Always check a generated citation against your school&apos;s style guide.</li>
          </ul>
        </div>
      </section>
    </div>
  );
}
