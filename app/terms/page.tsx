import type { Metadata } from "next";
import { pageMetadata } from "@/lib/site";
import Link from "next/link";
import { LEGAL_UPDATED } from "@/lib/legal";
import { TermsContent } from "@/components/legal/TermsContent";

export const metadata: Metadata = pageMetadata({
  title: "Terms of Use",
  description: "The rules for using Thesisweb, and what it does and does not promise.",
  path: "/terms",
});

export default function TermsPage() {
  return (
    <article className="prose-read mx-auto max-w-2xl py-4">
      <p className="eyebrow">Legal</p>
      <h1 className="display mt-3 text-3xl">Terms of Use</h1>
      <p className="mt-2 text-sm text-muted">Last updated {LEGAL_UPDATED}</p>
      <TermsContent />
      <p className="mt-8 text-sm text-muted">
        See also the <Link href="/privacy" className="underline">Privacy Policy</Link>.
      </p>
    </article>
  );
}
