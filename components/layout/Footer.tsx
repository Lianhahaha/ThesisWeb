import Link from "next/link";

export function Footer() {
  return (
    <footer className="mx-auto w-full max-w-5xl px-3 pb-24 pt-8 sm:px-5 md:pb-8">
      <div className="flex flex-col gap-1.5 border-t border-border pt-4 text-xs text-muted sm:flex-row sm:items-center sm:justify-between sm:text-sm">
        <p>Thesisweb — free search across open academic databases.</p>
        <nav className="flex flex-wrap gap-x-4 gap-y-1" aria-label="Site">
          <Link href="/rrl" className="hover:text-text">RRL by field</Link>
          <Link href="/guides" className="hover:text-text">Guides</Link>
          <Link href="/databases" className="hover:text-text">Databases</Link>
          <Link href="/about" className="hover:text-text">About</Link>
          <Link href="/status" className="hover:text-text">Status</Link>
          <Link href="/privacy" className="hover:text-text">Privacy</Link>
          <Link href="/terms" className="hover:text-text">Terms</Link>
        </nav>
      </div>
    </footer>
  );
}
