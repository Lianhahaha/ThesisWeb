import type { Metadata } from "next";
import { pageMetadata } from "@/lib/site";
import { TopicPlanner } from "@/components/TopicPlanner";

export const metadata: Metadata = pageMetadata({
  title: "Topic search",
  description:
    "Describe your thesis topic in a sentence. Thesisweb turns it into a search across 122 databases and groups the matching papers by theme.",
  path: "/topic",
});

export default function TopicPage() {
  return (
    <div className="mx-auto max-w-3xl">
      <p className="eyebrow">Topic search</p>
      <h1 className="display mt-2 text-2xl sm:text-4xl">
        Describe your <em>topic</em>
      </h1>
      <p className="mt-2 text-muted">
        Write what you are studying the way you would explain it to a classmate. We pick out the
        topic words, search every database, and group the papers that match by theme — so you can
        see which strand of the literature you are missing.
      </p>
      <p className="mt-2 text-sm text-subtle">
        Every paper below is a real record from a database, linked to its source. Nothing is
        generated, so nothing can be invented.
      </p>
      <TopicPlanner />
    </div>
  );
}
