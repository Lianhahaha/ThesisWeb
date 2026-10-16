import type { Metadata } from "next";
import { SOURCE_COUNT } from "@/lib/sources/meta";
import { pageMetadata } from "@/lib/site";

export const metadata: Metadata = pageMetadata({
  title: `Search ${SOURCE_COUNT} databases for related literature`,
  description:
    `One search across ${SOURCE_COUNT} free academic databases, including Philippine theses, journals and reports. Results merged, ranked and checked for retractions.`,
  path: "/search",
});

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
