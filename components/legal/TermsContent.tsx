import Link from "next/link";
import { CONTACT_EMAIL } from "@/lib/legal";

/**
 * The body of the Terms of Use, shared by the /terms page and the acceptance
 * dialog so the two can never say different things. Only the page sets
 * `anchors`: the footer links to #copyright-takedown, and the dialog renders a
 * second copy that would otherwise duplicate that id.
 */
export function TermsContent({ anchors = false }: { anchors?: boolean }) {
  return (
    <>
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
        <li>Comment or reply with private information, spam or abusive content on the public feedback board.</li>
      </ul>

      <h2 className="mt-8 text-xl">Public comments</h2>
      <p className="mt-2">
        The <Link href="/suggestions" className="underline">Suggestions</Link> board is public.
        Anyone can read a comment or reply, including entries made anonymously, so do not put private
        or personal information there. Comments and replies that are abusive, spam or unrelated may
        be removed.
      </p>

      <h2 className="mt-8 text-xl">Your account</h2>
      <p className="mt-2">
        Accounts are free. Keep your password, or your Google account, to yourself — anyone holding it
        can reach your library. A forgotten password is reset by a link sent to your email address, so
        keep it current in <Link href="/settings" className="underline">Settings</Link>. You are
        responsible for what happens under your account.
      </p>

      <h2 className="mt-8 text-xl">Papers and other people&apos;s content</h2>
      <p className="mt-2">
        Paper records come from third-party databases and belong to their authors and publishers,
        under whatever licence each applies. Full-text links lead to publishers, repositories and
        preprint servers. Thesisweb does not host paywalled material and claims no rights over the
        works it lists. Your notes and matrix entries stay yours.
      </p>

      <h2 id={anchors ? "copyright-takedown" : undefined} className="mt-8 text-xl">
        Copyright and takedown requests
      </h2>
      <p className="mt-2">
        Thesisweb is an independent index, not a publisher. It shows bibliographic metadata
        (titles, authors, abstracts, DOIs and links) that the databases on the{" "}
        <Link href="/databases" className="underline">Databases</Link> page supply, and it links out
        to full texts hosted by publishers, repositories and preprint servers. It does not upload,
        store or serve PDFs of anyone&apos;s work.
      </p>
      <p className="mt-2">
        If you hold the rights to a work and believe a record or link here infringes them, email{" "}
        <a href={`mailto:${CONTACT_EMAIL}`} className="underline">{CONTACT_EMAIL}</a> with: the
        record&apos;s link or DOI, the work it identifies, and the basis of the claim — for example,
        that the linked copy is not open access. A notice under the DMCA or an equivalent law should
        say so explicitly. We aim to answer within seven days and will remove or correct the record,
        or the link, where the claim holds. Requests about a copy hosted by a publisher or a
        repository should go to that host too: removing a link here does not remove their copy.
      </p>

      <h2 className="mt-8 text-xl">No warranty</h2>
      <p className="mt-2">
        The app is provided <strong>&ldquo;as is&rdquo;</strong> and{" "}
        <strong>&ldquo;as available&rdquo;</strong>, without warranties of any kind, express or
        implied, including accuracy, completeness, fitness for a particular purpose, or
        non-infringement. Results depend on databases that are sometimes slow, incomplete, wrong or
        unavailable, and a topic missing from them is not a topic that does not exist. Preprints
        listed here have not been peer reviewed. Nothing found through Thesisweb is academic, legal
        or medical advice.
      </p>

      <h2 className="mt-8 text-xl">Citations and your academic work</h2>
      <p className="mt-2">
        Citations, abstracts, metadata and links are generated from third-party database and
        publisher records. They can be incomplete, outdated or wrong. Check every citation against
        the publisher and your school&apos;s style guide before you submit, and read the paper
        before relying on it. Thesisweb does not write your review, does not check plagiarism, and
        does not decide what belongs in your RRL. You are responsible for the work you submit and
        for following your school&apos;s academic-integrity rules.
      </p>

      <h2 className="mt-8 text-xl">Limitation of liability</h2>
      <p className="mt-2">
        To the maximum extent permitted by law, the developer and operator of Thesisweb are not
        liable for any loss, damage, claim or expense arising from your use of, or inability to use,
        the app. This includes wrong, incomplete or missing citations, academic penalties or failing
        grades, lost or corrupted notes or libraries, service interruption, and any direct,
        indirect, incidental, consequential or punitive damages, even if advised of the possibility.
        You use the app at your own risk. Nothing in these terms limits liability that cannot be
        limited under applicable law.
      </p>

      <h2 className="mt-8 text-xl">Indemnity</h2>
      <p className="mt-2">
        You agree to indemnify and hold the developer and operator harmless from any claim, loss or
        expense (including reasonable legal fees) arising from your use of the app, the content you
        submit, or your breach of these terms.
      </p>

      <h2 className="mt-8 text-xl">Backups</h2>
      <p className="mt-2">
        Export a backup of your library from{" "}
        <Link href="/settings" className="underline">Settings</Link> if it matters to you. The app
        is free and runs on free hosting tiers, so no copy of your data is guaranteed.
      </p>

      <h2 className="mt-8 text-xl">Availability</h2>
      <p className="mt-2">
        This is a free project running on free hosting tiers. It may be slow, change, or stop
        working, and an account may be suspended if it is used against these terms.
      </p>

      <h2 className="mt-8 text-xl">Changes and contact</h2>
      <p className="mt-2">
        These terms may change, and the date at the top will say when. Continued use after a change
        means you accept the updated terms. If any part of these terms is unenforceable, the rest
        remains in effect. Questions go to{" "}
        <a href={`mailto:${CONTACT_EMAIL}`} className="underline">{CONTACT_EMAIL}</a>.
      </p>
    </>
  );
}
