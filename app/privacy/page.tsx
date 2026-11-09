import type { Metadata } from "next";
import { pageMetadata } from "@/lib/site";
import Link from "next/link";
import { LEGAL_UPDATED } from "@/lib/legal";
import { PrivacyContent } from "@/components/legal/PrivacyContent";

export const metadata: Metadata = pageMetadata({
  title: "Privacy Policy",
  description: "What Thesisweb collects, why, where it is stored, and how to remove it.",
  path: "/privacy",
});

export default function PrivacyPage() {
  return (
    <article className="prose-read mx-auto max-w-2xl py-4">
      <p className="eyebrow">Legal</p>
      <h1 className="display mt-3 text-2xl">Privacy Policy</h1>
      <p className="mt-2 text-sm text-muted">Last updated {LEGAL_UPDATED}</p>
      <PrivacyContent />
      <p className="mt-8 text-sm text-muted">
        See also the <Link href="/terms" className="underline">Terms of Use</Link>.
      </p>
    </article>
  );
}
