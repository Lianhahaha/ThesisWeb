import type { Metadata } from "next";

// A paper page is filled from the student's own search or library, so a
// search engine would only ever see an empty page.
export const metadata: Metadata = { title: "Paper", robots: { index: false, follow: false } };

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
