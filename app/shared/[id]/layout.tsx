import type { Metadata } from "next";

// Shared libraries are for the group that has the link, not for search engines.
export const metadata: Metadata = {
  title: "Shared library · Thesisweb",
  robots: { index: false, follow: false },
};

export default function SharedLayout({ children }: { children: React.ReactNode }) {
  return children;
}
