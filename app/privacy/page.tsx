import type { Metadata } from "next";
import Link from "next/link";
import { CONTACT_EMAIL, LEGAL_UPDATED } from "@/lib/legal";

export const metadata: Metadata = {
  title: "Privacy Policy · Thesisweb",
  description: "What Thesisweb collects, why, where it is stored, and how to remove it.",
};

export default function PrivacyPage() {
  return (
    <article className="prose-read mx-auto max-w-2xl py-4">
      <p className="eyebrow">Legal</p>
      <h1 className="display mt-3 text-3xl">Privacy Policy</h1>
      <p className="mt-2 text-sm text-muted">Last updated {LEGAL_UPDATED}</p>

      <p className="mt-6">
        Thesisweb helps students find related literature, keep notes on it and generate citations.
        This page explains exactly what the app stores, where it goes, and how to get rid of it.
        Thesisweb is free, carries no advertising, and does not sell anything about you.
      </p>

      <h2 className="mt-8 text-xl">You can use it without an account</h2>
      <p className="mt-2">
        Searching, reading and saving papers all work signed out. In that case everything stays in
        your browser and no account data is created. Clearing your browser data removes it.
      </p>

      <h2 className="mt-8 text-xl">What is stored in your browser</h2>
      <ul className="mt-2 list-disc space-y-1 pl-5">
        <li>Papers you save while signed out, including your notes and synthesis matrix.</li>
        <li>Your search preferences: published-since range, country focus, citation style.</li>
        <li>Your light or dark theme choice.</li>
        <li>Your last eight search topics, so you can return to them in one click.</li>
      </ul>
      <p className="mt-2">
        None of this leaves your device unless you sign in and choose to copy it to your account.
        You can clear the search history and preferences from{" "}
        <Link href="/settings" className="underline">Settings</Link>.
      </p>

      <h2 className="mt-8 text-xl">What is stored if you make an account</h2>
      <p className="mt-2">
        Accounts use Firebase Authentication and Cloud Firestore, both operated by Google. We store:
      </p>
      <ul className="mt-2 list-disc space-y-1 pl-5">
        <li>
          <strong>Your email address and password.</strong> Firebase handles both. The password is
          hashed by Firebase and is never visible to this app or to its author.
        </li>
        <li>
          <strong>Your display name and preferences</strong>, if you set them.
        </li>
        <li>
          <strong>Your library:</strong> the papers you saved, their database records, your notes,
          your synthesis matrix entries and your collection names.
        </li>
        <li>
          <strong>Your recovery PIN, as a hash.</strong> The PIN itself is not stored. The hash
          gates sending a password-reset email, and that email only ever goes to the address on the
          account.
        </li>
        <li>
          <strong>A lookup entry mapping your email address to your account ID</strong>, so the
          &ldquo;forgot password&rdquo; page can find your account before you are signed in.
        </li>
      </ul>
      <p className="mt-2">
        Only you can read or change your library and profile. This is enforced by Firestore security
        rules on Google&apos;s servers, not merely by the app.
      </p>

      <h2 className="mt-8 text-xl">What your searches are sent to</h2>
      <p className="mt-2">
        A search sends your topic words to the free academic databases the app queries — among them
        OpenAlex, Crossref, Semantic Scholar, PubMed, Europe PMC, DOAJ, arXiv, CORE, BASE, ERIC,
        Zenodo, HAL, OpenAIRE, INSPIRE-HEP, PLOS, DataCite, OAPEN and Figshare. Those requests are
        made by the Thesisweb server, so the databases do not receive your IP address. Each
        database has its own privacy policy, and this app has no control over it.
      </p>

      <h2 className="mt-8 text-xl">Analytics</h2>
      <p className="mt-2">
        The app uses Firebase Analytics and Vercel Analytics to count page views and to see which
        features get used. Firebase Analytics also records when an account is created, when someone
        signs in, and the topic words of a search together with the number of results. It is used in
        aggregate, to decide what to improve. If you would rather not be counted, a content blocker
        or a private window will stop both, and the app works normally without them.
      </p>

      <h2 className="mt-8 text-xl">Papers and data we did not create</h2>
      <p className="mt-2">
        Paper records come from the databases listed above. Most of that metadata is public domain
        or openly licensed — OpenAlex publishes under CC0. Full-text links point at publishers,
        repositories and preprint servers; Thesisweb does not host or copy paywalled material.
      </p>

      <h2 className="mt-8 text-xl">Removing your data</h2>
      <p className="mt-2">
        You can delete any saved paper from{" "}
        <Link href="/library" className="underline">Library</Link>, and export a full copy of your
        library from <Link href="/settings" className="underline">Settings</Link> first if you want
        one. To have your whole account and everything in it deleted, email{" "}
        <a href={`mailto:${CONTACT_EMAIL}`} className="underline">{CONTACT_EMAIL}</a> from the
        address on the account and it will be removed.
      </p>

      <h2 className="mt-8 text-xl">Children</h2>
      <p className="mt-2">
        Thesisweb is built for university and senior-high-school researchers. It is not directed at
        children under 13, and accounts should not be created for them.
      </p>

      <h2 className="mt-8 text-xl">Changes</h2>
      <p className="mt-2">
        If what the app stores changes, this page changes with it and the date at the top moves.
      </p>

      <h2 className="mt-8 text-xl">Contact</h2>
      <p className="mt-2">
        Questions about any of this go to{" "}
        <a href={`mailto:${CONTACT_EMAIL}`} className="underline">{CONTACT_EMAIL}</a>.
      </p>

      <p className="mt-8 text-sm text-muted">
        See also the <Link href="/terms" className="underline">Terms of Use</Link>.
      </p>
    </article>
  );
}
