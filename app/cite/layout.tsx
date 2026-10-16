import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Free citation generator: APA 7, MLA 9, IEEE, Chicago",
  description:
    "Paste DOIs and get references in APA 7, MLA 9, IEEE or Chicago, ready for your thesis reference list. Download .bib or .ris for Zotero and Mendeley.",
  alternates: { canonical: "/cite" },
  openGraph: { title: "Free citation generator: APA 7, MLA 9, IEEE, Chicago", description: "Paste DOIs and get references in APA 7, MLA 9, IEEE or Chicago, ready for your thesis reference list. Download .bib or .ris for Zotero and Mendeley." },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
