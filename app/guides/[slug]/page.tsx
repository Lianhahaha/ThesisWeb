import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Search } from "lucide-react";
import { pageMetadata, SITE_NAME, SITE_URL } from "@/lib/site";
import { GUIDE_BY_SLUG, GUIDES, relatedGuides, type Guide } from "@/lib/guides";

export function generateStaticParams() {
  return GUIDES.map((g) => ({ slug: g.slug }));
}

function readingMinutes(guide: Guide): number {
  const words = [guide.intro.join(" "), ...guide.sections.flatMap((s) => [...(s.paragraphs ?? []), ...(s.bullets ?? [])])].join(" ").split(/\s+/).length;
  return Math.max(3, Math.round(words / 200));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const guide = GUIDE_BY_SLUG[slug];
  if (!guide) return {};
  return {
    ...pageMetadata({
      title: guide.title,
      description: guide.description,
      path: `/guides/${guide.slug}`,
    }),
    keywords: guide.keywords,
  };
}

function searchHref(s: { query: string; country?: string; localOnly?: boolean }): string {
  const p = new URLSearchParams({ q: s.query });
  if (s.localOnly) p.set("scope", "local");
  if (s.country) p.set("country", s.country);
  return `/search?${p.toString()}`;
}

export default async function GuidePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const guide = GUIDE_BY_SLUG[slug];
  if (!guide) notFound();

  const minutes = readingMinutes(guide);
  const related = relatedGuides(guide);

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Article",
        "@id": `${SITE_URL}/guides/${guide.slug}/#article`,
        headline: guide.title,
        description: guide.description,
        datePublished: guide.updated,
        dateModified: guide.updated,
        articleSection: guide.category,
        inLanguage: "en",
        mainEntityOfPage: { "@id": `${SITE_URL}/guides/${guide.slug}` },
        author: { "@id": `${SITE_URL}/#website` },
        publisher: { "@id": `${SITE_URL}/#website` },
        isPartOf: { "@id": `${SITE_URL}/#website` },
        keywords: guide.keywords.join(", "),
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
          { "@type": "ListItem", position: 2, name: "RRL Writing Guides", item: `${SITE_URL}/guides` },
          { "@type": "ListItem", position: 3, name: guide.title, item: `${SITE_URL}/guides/${guide.slug}` },
        ],
      },
      {
        "@type": "FAQPage",
        mainEntity: guide.faqs.map(({ q, a }) => ({
          "@type": "Question",
          name: q,
          acceptedAnswer: { "@type": "Answer", text: a },
        })),
      },
    ],
  };

  return (
    <div className="mx-auto max-w-3xl">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }}
      />

      <nav aria-label="Breadcrumb" className="mb-4 text-xs text-subtle">
        <Link href="/" className="hover:text-text">Home</Link>
        {" / "}
        <Link href="/guides" className="hover:text-text">Guides</Link>
        {" / "}
        <span className="text-text">{guide.category}</span>
      </nav>

      <article>
        <header className="mb-6">
          <p className="eyebrow">{guide.category}</p>
          <h1 className="display mt-2 text-3xl sm:text-4xl">{guide.title}</h1>
          <p className="mt-2 text-sm text-subtle">
            Updated {guide.updated} · {minutes} min read
          </p>
          <div className="prose-read mt-4 space-y-3 text-muted">
            {guide.intro.map((p) => (
              <p key={p}>{p}</p>
            ))}
          </div>
        </header>

        {guide.sections.length > 3 && (
          <nav aria-label="On this page" className="panel mb-6">
            <p className="text-sm font-semibold">On this page</p>
            <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm text-muted">
              {guide.sections.map((s, i) => (
                <li key={s.heading}>
                  <a href={`#section-${i + 1}`} className="hover:text-text hover:underline">
                    {s.heading}
                  </a>
                </li>
              ))}
            </ol>
          </nav>
        )}

        <div className="prose-read space-y-7">
          {guide.sections.map((section, i) => (
            <section key={section.heading} id={`section-${i + 1}`}>
              <h2 className="display text-2xl">{section.heading}</h2>
              {section.paragraphs?.map((p) => (
                <p key={p} className="mt-2 text-muted">{p}</p>
              ))}
              {section.bullets && (
                <ul className="mt-3 list-disc space-y-1.5 pl-5 text-muted">
                  {section.bullets.map((b) => (
                    <li key={b}>{b}</li>
                  ))}
                </ul>
              )}
            </section>
          ))}
        </div>

        <section className="panel mt-8" aria-labelledby="faq-h">
          <h2 id="faq-h" className="text-lg">Frequently asked questions</h2>
          <dl className="mt-3 space-y-4">
            {guide.faqs.map(({ q, a }) => (
              <div key={q} className="border-t border-border pt-3 first:border-t-0 first:pt-0">
                <dt className="text-sm font-semibold">{q}</dt>
                <dd className="mt-1 text-sm text-muted">{a}</dd>
              </div>
            ))}
          </dl>
        </section>

        <section className="panel mt-8" aria-labelledby="try-h">
          <h2 id="try-h" className="text-lg">Find sources for this guide</h2>
          <p className="mt-1 text-sm text-muted">
            Run one of these starter searches across the free databases.
          </p>
          <ul className="mt-3 grid gap-2 sm:grid-cols-2">
            {guide.searches.map((s) => (
              <li key={s.query + (s.localOnly ? "-local" : "")}>
                <Link
                  href={searchHref(s)}
                  className="flex items-start gap-2 rounded-lg border border-border bg-bg/60 p-3 text-sm hover:border-accent/50"
                >
                  <Search className="mt-0.5 h-4 w-4 shrink-0 text-accent" aria-hidden />
                  <span>
                    <span className="font-medium text-text">{s.label}</span>
                    <span className="mt-0.5 block text-xs text-subtle">
                      <code>{s.query}</code>
                      {s.localOnly ? " · Philippine sources" : ""}
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>

        <section className="panel mt-8" aria-labelledby="related-h">
          <h2 id="related-h" className="text-lg">Related guides</h2>
          <ul className="mt-3 space-y-2">
            {related.map((r) => (
              <li key={r.slug}>
                <Link href={`/guides/${r.slug}`} className="text-sm font-medium text-accent hover:underline">
                  {r.title}
                </Link>
                <p className="text-xs text-subtle">{r.description}</p>
              </li>
            ))}
          </ul>
        </section>

        <p className="mt-8 text-xs text-subtle">
          Canonical URL: <a href={`${SITE_URL}/guides/${guide.slug}`} className="underline">{SITE_URL}/guides/{guide.slug}</a>
        </p>
      </article>
    </div>
  );
}
