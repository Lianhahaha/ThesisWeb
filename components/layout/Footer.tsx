import Link from "next/link";
import { CONTACT_EMAIL } from "@/lib/legal";
import { SOURCE_COUNT } from "@/lib/sources/meta";

/**
 * Site footer. Two rows: where you can go, and the legal/attribution line that
 * says what this is (an independent index that links out), who to write to
 * about a bad record or a rights complaint, and the licence it runs under.
 */

const LINKS = [
  { href: "/rrl", label: "RRL by field" },
  { href: "/guides", label: "Guides" },
  { href: "/databases", label: "Databases" },
  { href: "/about", label: "About" },
  { href: "/suggestions", label: "Feedback" },
  { href: "/privacy", label: "Privacy" },
  { href: "/terms", label: "Terms" },
];

export function Footer() {
  // Built once per deployment; a static page would otherwise never move it.
  const year = new Date().getFullYear();

  return (
    <footer className="mx-auto w-full max-w-6xl px-4 pb-28 pt-10 sm:px-6 md:pb-10">
      <div className="border-t border-border pt-5 text-sm text-muted">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <p>Thesisweb — free search across {SOURCE_COUNT} open academic databases.</p>
          <nav className="flex flex-wrap gap-x-4 gap-y-1" aria-label="Site">
            {LINKS.map((link) => (
              <Link key={link.href} href={link.href} className="hover:text-text">
                {link.label}
              </Link>
            ))}
          </nav>
        </div>

        <div className="mt-4 flex flex-col gap-2 border-t border-border pt-4 text-xs leading-relaxed sm:flex-row sm:items-start sm:justify-between">
          <p className="max-w-2xl">
            An independent index: records and abstracts belong to the sources we list, and full texts
            stay with the publishers and repositories we link to — no paywalled copies are hosted
            here.{" "}
            <Link href="/terms#copyright-takedown" className="underline hover:text-text">
              Rights holders: request removal
            </Link>
            {" · "}
            <a href={`mailto:${CONTACT_EMAIL}`} className="underline hover:text-text">
              Report a problem
            </a>
          </p>
          <p className="shrink-0">© {year} Thesisweb · MIT-licensed</p>
        </div>
      </div>
    </footer>
  );
}
