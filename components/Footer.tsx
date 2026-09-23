import Link from "next/link";

export function Footer() {
  return (
    <footer className="mx-auto w-full max-w-6xl px-4 pb-28 pt-10 sm:px-6 md:pb-10">
      <div className="flex flex-col gap-2 border-t border-border pt-5 text-sm text-muted sm:flex-row sm:items-center sm:justify-between">
        <p>Thesisweb — free search across open academic databases.</p>
        <nav className="flex gap-4" aria-label="Legal">
          <Link href="/privacy" className="hover:text-text">Privacy</Link>
          <Link href="/terms" className="hover:text-text">Terms</Link>
        </nav>
      </div>
    </footer>
  );
}
