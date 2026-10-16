import type { Metadata } from "next";

// Each student's own papers: nothing for a search engine to show.
export const metadata: Metadata = { title: "Your library", robots: { index: false, follow: false } };

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
