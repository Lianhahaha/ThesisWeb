import type { Metadata } from "next";
import Link from "next/link";
import { pageMetadata, SITE_NAME } from "@/lib/site";
import { CONTACT_EMAIL } from "@/lib/legal";
import { SOURCE_COUNT } from "@/lib/sources/meta";

export const metadata: Metadata = pageMetadata({
  title: "About, coverage and limitations",
  description:
    "How Thesisweb searches its databases, why metadata varies, how citations are generated, where your library is stored, and what the tool cannot promise.",
  path: "/about",
});

/** Update when the promises or limitations on this page change. */
const UPDATED = "5 November 2026";

export default function AboutPage() {
  return (
    <article className="prose-read mx-auto max-w-2xl py-4">
      <p className="eyebrow">About</p>
      <h1 className="display mt-3 text-3xl">What this tool is — and is not</h1>
      <p className="mt-2 text-sm text-muted">Last updated {UPDATED}</p>

      <p className="mt-6">
        {SITE_NAME} is a free search tool for thesis and research students. One query goes to{" "}
        <Link href="/databases">{SOURCE_COUNT} free academic databases</Link>, and the results come
        back in one list. It is built for the first pass of a review of related literature: finding
        candidates, checking what a paper claims, keeping notes, and producing a reference to check.
      </p>

      <h2 id="search-results-are-candidates-not-a-reading-list">Search results are candidates, not a reading list</h2>
      <p>
        Results are merged, de-duplicated and ordered by <strong>word match</strong> to your query.
        A high match score does not mean a paper is important, correct, peer-reviewed or suitable
        for your study. It means its title and abstract use words close to yours. Read the paper,
        not just the card.
      </p>

      <h2>Metadata is not uniform</h2>
      <p>
        Every database describes papers differently. Years, author spellings, venue names,
        abstracts and DOIs are sometimes missing, incomplete or inconsistent across sources.
        Repository and thesis records are the most variable. When a field matters for your
        reference, open the record page from the result and check it there.
      </p>

      <h2>Citations are a starting point</h2>
      <p>
        The APA, MLA, IEEE and Chicago output is generated from the metadata a database returned.
        It is not a style authority, and it cannot know your school&apos;s house rules. Check the
        paper itself and your institution&apos;s guide before submitting. Reading the source is
        still required; a citation generator should save formatting time, not replace comprehension.
      </p>

      <h2>Coverage and reliability</h2>
      <p>
        Breadth is not completeness. {SOURCE_COUNT} databases cover a lot, but no search here is a
        systematic review. Philippine and local sources are a deliberate strength, not a guarantee
        that every relevant local study is indexed. Some sources need free API keys, have daily
        limits, or fail during busy periods. A daily health check runs in GitHub Actions, but a
        source can still be down when you need it; the other sources continue and the failed one is
        reported in the results.
      </p>

      <h2>Your library</h2>
      <p>
        Signed out, saved papers, notes and the synthesis matrix live in this browser (IndexedDB).
        Clearing site data deletes them. Signed in, the library is in your Firebase account and
        follows you across devices. Download a JSON backup from <Link href="/settings">Settings</Link>{" "}
        before clearing browser data or switching computers.
      </p>

      <h2>Privacy and independence</h2>
      <p>
        The app is free, has no advertising and sells nothing. It is not affiliated with the
        databases it searches. Search text and DOIs go to those databases; details are on the{" "}
        <Link href="/privacy">Privacy Policy</Link>. The tool prefers links to legal open-access
        copies and does not bypass paywalls.
      </p>

      <h2>Who made this</h2>
      <p>
        Thesisweb was created by <strong>Lian Justine Cruz</strong>. The project is shared under the
        MIT License.
      </p>

      <h2>Report a problem</h2>
      <p>
        If a record is wrong, a citation is malformed, or a database has stopped returning results,
        email <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a> with the paper link or the
        database name. Specific reports are what keep the source list honest.
      </p>
    </article>
  );
}
