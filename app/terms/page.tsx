import type { Metadata } from "next";
import Link from "next/link";
import { CONTACT_EMAIL, LEGAL_UPDATED } from "@/lib/legal";

export const metadata: Metadata = {
  title: "Terms of Use · Thesisweb",
  description: "The rules for using Thesisweb, and what it does and does not promise.",
};

export default function TermsPage() {
  return (
    <article className="prose-read mx-auto max-w-2xl py-4">
      <p className="eyebrow">Legal</p>
      <h1 className="display mt-3 text-3xl">Terms of Use</h1>
      <p className="mt-2 text-sm text-muted">Last updated {LEGAL_UPDATED}</p>

      <p className="mt-6">
        Thesisweb is a free study tool for finding related literature. Using it means accepting the
        terms below. They are deliberately short.
      </p>

      <h2 className="mt-8 text-xl">What the app is</h2>
      <p className="mt-2">
        Thesisweb searches free academic databases, keeps the papers you save, and formats
        citations. It is a search and organisation aid. It is not a publisher, not a library, and
        not an authority on what belongs in your review of related literature.
      </p>

      <h2 className="mt-8 text-xl">Using it honestly</h2>
      <p className="mt-2">
        An abstract is the authors&apos; own summary of their work. Read the paper and write your
        review in your own words. Pasting abstracts or generated text into your chapter and
        presenting it as your own writing is plagiarism, and your school&apos;s rules on this apply
        whatever a tool makes convenient. Citations the app generates are produced from database
        records that are sometimes incomplete; check every one against your school&apos;s style
        guide before you submit.
      </p>

      <h2 className="mt-8 text-xl">What you agree not to do</h2>
      <ul className="mt-2 list-disc space-y-1 pl-5">
        <li>Scrape or automate the app in a way that loads it heavily or crowds out other users.</li>
        <li>Try to reach another user&apos;s account, library or data.</li>
        <li>Use it to obtain paywalled material you are not entitled to read.</li>
        <li>Upload notes containing anything unlawful.</li>
      </ul>

      <h2 className="mt-8 text-xl">Your account</h2>
      <p className="mt-2">
        Accounts are free. Keep your password and recovery PIN to yourself — anyone holding them can
        reach your library. Your recovery PIN starts as <strong>0000</strong> until you change it in{" "}
        <Link href="/settings" className="underline">Settings</Link>, so change it. You are
        responsible for what happens under your account.
      </p>

      <h2 className="mt-8 text-xl">Papers and other people&apos;s content</h2>
      <p className="mt-2">
        Paper records come from third-party databases and belong to their authors and publishers,
        under whatever licence each applies. Full-text links lead to publishers, repositories and
        preprint servers. Thesisweb does not host paywalled material and claims no rights over the
        works it lists. Your notes and matrix entries stay yours.
      </p>

      <h2 className="mt-8 text-xl">No guarantees</h2>
      <p className="mt-2">
        The app is provided as it is, with no warranty. Results depend on databases that are
        sometimes slow, incomplete or unavailable, and a topic missing from them is not a topic that
        does not exist. Preprints listed here have not been peer reviewed. Nothing found through
        Thesisweb is academic, legal or medical advice, and the author is not liable for any loss
        arising from use of the app, including work lost to a fault in it. Export a backup of your
        library from <Link href="/settings" className="underline">Settings</Link> if it matters to
        you.
      </p>

      <h2 className="mt-8 text-xl">Availability</h2>
      <p className="mt-2">
        This is a free project running on free hosting tiers. It may be slow, change, or stop
        working, and an account may be suspended if it is used against these terms.
      </p>

      <h2 className="mt-8 text-xl">Changes and contact</h2>
      <p className="mt-2">
        These terms may change, and the date at the top will say when. Questions go to{" "}
        <a href={`mailto:${CONTACT_EMAIL}`} className="underline">{CONTACT_EMAIL}</a>.
      </p>

      <p className="mt-8 text-sm text-muted">
        See also the <Link href="/privacy" className="underline">Privacy Policy</Link>.
      </p>
    </article>
  );
}
