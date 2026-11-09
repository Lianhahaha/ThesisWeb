import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ExternalLink, Search } from "lucide-react";
import { pageMetadata, SITE_NAME, SITE_URL } from "@/lib/site";
import { RRL_GUIDES, RRL_GUIDE_BY_SLUG, sourcesForGuide } from "@/lib/rrl-guides";
import { KINDS } from "@/lib/sources/meta";

export function generateStaticParams() {
  return RRL_GUIDES.map((g) => ({ slug: g.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const guide = RRL_GUIDE_BY_SLUG[slug];
  if (!guide) return {};
  return {
    ...pageMetadata({
      title: guide.title,
      description: guide.description,
      path: `/rrl/${guide.slug}`,
    }),
    keywords: guide.keywords,
  };
}

function searchHref(q: { query: string; country?: string; localOnly?: boolean }): string {
  const p = new URLSearchParams({ q: q.query });
  if (q.localOnly) p.set("scope", "local");
  if (q.country) p.set("country", q.country);
  return `/search?${p.toString()}`;
}

export default async function RrlFieldPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const guide = RRL_GUIDE_BY_SLUG[slug];
  if (!guide) notFound();

  const sources = sourcesForGuide(guide);
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "CollectionPage",
        "@id": `${SITE_URL}/rrl/${guide.slug}`,
        url: `${SITE_URL}/rrl/${guide.slug}`,
        name: `${guide.title} · ${SITE_NAME}`,
        description: guide.description,
        isPartOf: { "@id": `${SITE_URL}/#website` },
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
          { "@type": "ListItem", position: 2, name: "RRL Finder by Field", item: `${SITE_URL}/rrl` },
          { "@type": "ListItem", position: 3, name: guide.shortTitle, item: `${SITE_URL}/rrl/${guide.slug}` },
        ],
      },
    ],
  };

  return (
    <div className="mx-auto max-w-4xl">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }}
      />

      <nav aria-label="Breadcrumb" className="mb-4 text-xs text-subtle">
        <Link href="/" className="hover:text-text">Home</Link>
        {" / "}
        <Link href="/rrl" className="hover:text-text">RRL by field</Link>
        {" / "}
        <span className="text-text">{guide.shortTitle}</span>
      </nav>

      <header className="mb-6">
        <p className="eyebrow">{guide.shortTitle}</p>
        <h1 className="display mt-2 text-3xl sm:text-4xl">{guide.title}</h1>
        <p className="mt-2 max-w-2xl text-muted">{guide.intro}</p>
      </header>

      <section aria-labelledby="starter-h" className="panel mb-8">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 id="starter-h" className="text-lg">Starter RRL searches in {guide.shortTitle}</h2>
          <Link href="/search" className="text-xs font-medium text-accent hover:underline">
            Open custom search →
          </Link>
        </div>
        <p className="mt-1 text-sm text-muted">
          Click a topic below to run a live search across {sources.length} databases, or use it as a template for your own keywords.
        </p>
        <ul className="mt-4 grid gap-2.5 sm:grid-cols-2">
          {guide.sampleQueries.map((s) => (
            <li key={s.query}>
              <Link
                href={searchHref(s)}
                className="flex items-start gap-2.5 rounded-lg border border-border bg-bg/60 p-3 text-sm transition-colors hover:border-accent/50 hover:bg-surface"
              >
                <Search className="mt-0.5 h-4 w-4 shrink-0 text-accent" aria-hidden />
                <div>
                  <p className="font-medium text-text">{s.label}</p>
                  <p className="mt-0.5 text-xs text-subtle">
                    Query: <code>{s.query}</code>
                    {s.localOnly ? " · Philippine sources" : ""}
                  </p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="tips-h" className="panel mb-8">
        <h2 id="tips-h" className="text-lg">How to search &amp; write RRL for {guide.shortTitle}</h2>
        <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-muted">
          {guide.tips.map((tip) => (
            <li key={tip}>{tip}</li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="sources-h" className="mb-8">
        <h2 id="sources-h" className="text-xl">
          Databases searched for {guide.shortTitle}{" "}
          <span className="text-sm font-normal text-subtle">· {sources.length}</span>
        </h2>
        <p className="mt-1 text-sm text-muted">
          Every search automatically queries these databases and merges duplicates.
        </p>
        <ul className="mt-4 grid gap-3 sm:grid-cols-2">
          {sources.map(([id, meta]) => (
            <li key={id} className="panel flex flex-col gap-1.5">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <a
                  href={meta.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-semibold hover:underline"
                >
                  {meta.label}
                  <ExternalLink className="ml-1 inline h-3.5 w-3.5 align-[-2px] text-subtle" aria-hidden />
                </a>
                <span className="text-xs text-subtle">{meta.region}</span>
              </div>
              <p className="text-sm text-muted">{meta.blurb}</p>
              <p className="mt-auto pt-1">
                <span className="tag">{KINDS[meta.kind]}</span>
              </p>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="other-h" className="panel mb-8">
        <h2 id="other-h" className="text-base font-semibold">Explore other RRL fields</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          {RRL_GUIDES.filter((g) => g.slug !== guide.slug).map((g) => (
            <Link key={g.slug} href={`/rrl/${g.slug}`} className="chip">
              {g.shortTitle}
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
