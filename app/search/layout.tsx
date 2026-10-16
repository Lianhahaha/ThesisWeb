import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Search 50 databases for related literature",
  description:
    "One search across 50 free academic databases, including Philippine theses, journals and reports. Results merged, ranked and checked for retractions.",
  alternates: { canonical: "/search" },
  openGraph: { title: "Search 50 databases for related literature", description: "One search across 50 free academic databases, including Philippine theses, journals and reports. Results merged, ranked and checked for retractions." },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
