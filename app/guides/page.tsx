import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, BookOpen, Clock } from "lucide-react";
import { pageMetadata, SITE_NAME, SITE_URL } from "@/lib/site";
import { GUIDE_CATEGORIES, GUIDES, guidesByCategory } from "@/lib/guides";

export const metadata: Metadata = pageMetadata({
  title: "RRL Writing Guides for Thesis Students",
  description:
    `${GUIDES.length} practical guides on writing Chapter 2 RRL, finding local and foreign studies, using a synthesis matrix, APA 7 citations, research gaps, plagiarism, and RRL for quantitative, qualitative, action research and capstone projects.`,
  path: "/guides",
});

function readingMinutes(guide: (typeof GUIDES)[number]): number {
  const words = [guide.intro.join(" "), ...guide.sections.flatMap((s) => [...(s.paragraphs ?? []), ...(s.bullets ?? [])])].join(" ").split(/\s+/).length;
  return Math.max(3, Math.round(words / 200));
}

const JSON_LD = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "CollectionPage",
      "@id": `${SITE_URL}/guides`,
      url: `${SITE_URL}/guides`,
      name: `RRL Writing Guides · ${SITE_NAME}`,
      description: "Practical guides for writing a thesis Review of Related Literature.",
      isPartOf: { "@id": `${SITE_URL}/#website` },
    },
    {
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
        { "@type": "ListItem", position: 2, name: "RRL Writing Guides", item: `${SITE_URL}/guides` },
      ],
    },
    {
      "@type": "ItemList",
      itemListElement: GUIDES.map((g, i) => ({
        "@type": "ListItem",
        position: i + 1,
        name: g.title,
        url: `${SITE_URL}/guides/${g.slug}`,
      })),
    },
  ],
};

export default function GuidesPage() {
  return (
    <div className="mx-auto max-w-3xl">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON_LD).replace(/</g, "\\u003c") }}
      />

      <header className="mb-6">
        <p className="eyebrow">Writing guides</p>
        <h1 className="display mt-2 text-2xl sm:text-3xl">
          Write a better <em>Chapter 2</em>
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-muted">
          {GUIDES.length} practical guides on finding related literature, synthesizing studies,
          writing the gap, and citing correctly. No sign-up. Every guide links to the free search
          tool.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Link href="/search" className="btn btn-sm">
            Search databases
            <ArrowRight className="h-3.5 w-3.5" aria-hidden />
          </Link>
          <Link href="/rrl" className="btn-ghost btn-sm">
            RRL by field
          </Link>
        </div>
      </header>

      {GUIDE_CATEGORIES.map((category) => {
        const list = guidesByCategory(category);
        if (!list.length) return null;
        return (
          <section key={category} className="mb-6" aria-labelledby={`cat-${category.replace(/\W+/g, "-")}`}>
            <h2 id={`cat-${category.replace(/\W+/g, "-")}`} className="text-lg">
              {category} <span className="text-xs font-normal text-subtle">· {list.length}</span>
            </h2>
            <ul className="mt-2.5 grid gap-2.5 sm:grid-cols-2">
              {list.map((g) => (
                <li key={g.slug} className="panel flex flex-col gap-1.5">
                  <Link href={`/guides/${g.slug}`} className="text-sm font-semibold hover:text-accent hover:underline">
                    {g.title}
                  </Link>
                  <p className="text-xs text-muted">{g.description}</p>
                  <div className="mt-auto flex items-center gap-3 border-t border-border pt-2 text-[11px] text-subtle">
                    <span className="inline-flex items-center gap-1">
                      <BookOpen className="h-3.5 w-3.5" aria-hidden />
                      Guide
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5" aria-hidden />
                      {readingMinutes(g)} min
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
