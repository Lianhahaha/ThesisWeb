import type { Metadata } from "next";
import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { FIELDS, KINDS, SOURCE_COUNT, SOURCE_META, type Field, type Kind, type SourceMeta } from "@/lib/sources/meta";

export const metadata: Metadata = {
  title: "Databases · Thesisweb",
  description: "Every free academic database Thesisweb searches, what it covers and how far to trust it.",
};

/** What each kind of source means for a student deciding whether to cite it. */
const KIND_ADVICE: Record<Kind, string> = {
  index: "Points to papers published elsewhere. Check the journal it names.",
  journals: "Peer-reviewed journal articles: the safest to cite.",
  repository: "Uploads by researchers and universities. Some are peer-reviewed, some not; check each one.",
  preprints: "Not peer-reviewed yet. Cite only if you say it is a preprint, and look for a published version.",
  theses: "Graduate theses, examined by a committee but not journal-reviewed. Good for methods and local studies.",
  reports: "Reports from governments and international agencies. Reliable for data and policy.",
  books: "Books and chapters, usually reviewed by the publisher.",
};

const sources = Object.entries(SOURCE_META) as [string, SourceMeta][];

function bySourceLabel(a: [string, SourceMeta], b: [string, SourceMeta]) {
  return a[1].label.localeCompare(b[1].label);
}

function SourceCard({ meta }: { meta: SourceMeta }) {
  return (
    <li className="panel flex flex-col gap-2">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <a href={meta.url} target="_blank" rel="noopener noreferrer" className="font-semibold hover:underline">
          {meta.label}
          <ExternalLink className="ml-1 inline h-3.5 w-3.5 align-[-2px] text-subtle" aria-hidden />
        </a>
        <span className="text-xs text-subtle">{meta.region}</span>
      </div>
      <p className="text-sm text-muted">{meta.blurb}</p>
      <p className="mt-auto">
        <span className="tag" title={KIND_ADVICE[meta.kind]}>{KINDS[meta.kind]}</span>
      </p>
    </li>
  );
}

export default function DatabasesPage() {
  const groups = (Object.keys(FIELDS) as Field[])
    .map((field) => ({
      field,
      list: sources.filter(([, m]) => m.fields.includes(field)).sort(bySourceLabel),
    }))
    .filter((g) => g.list.length > 0);

  return (
    <div className="mx-auto max-w-4xl">
      <header className="mb-6">
        <p className="eyebrow">Sources</p>
        <h1 className="display mt-2 text-3xl sm:text-4xl">
          The <em>databases</em>
        </h1>
        <p className="mt-2 max-w-2xl text-muted">
          Every search goes to all {SOURCE_COUNT} of these at once. All are free, run by
          universities, publishers, governments or international agencies, and none of their
          records are generated. <Link href="/search" className="text-accent underline">Start a search</Link>.
        </p>
      </header>

      <section className="panel mb-8" aria-labelledby="trust-h">
        <h2 id="trust-h" className="text-lg">How far to trust a result</h2>
        <p className="mt-1 text-sm text-muted">
          Real is not the same as reliable. What a database holds tells you what to check.
        </p>
        <dl className="mt-4 grid gap-x-6 gap-y-3 sm:grid-cols-2">
          {(Object.keys(KINDS) as Kind[]).map((k) => (
            <div key={k}>
              <dt className="text-sm font-semibold">{KINDS[k]}</dt>
              <dd className="text-sm text-muted">{KIND_ADVICE[k]}</dd>
            </div>
          ))}
        </dl>
      </section>

      {groups.map(({ field, list }) => (
        <section key={field} className="mb-8" aria-labelledby={`field-${field}`}>
          <h2 id={`field-${field}`} className="text-xl">
            {FIELDS[field]} <span className="text-sm font-normal text-subtle">· {list.length}</span>
          </h2>
          <ul className="mt-3 grid gap-3 sm:grid-cols-2">
            {list.map(([id, meta]) => (
              <SourceCard key={id} meta={meta} />
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
