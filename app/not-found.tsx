import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-2xl py-16 text-center sm:py-24">
      <p className="eyebrow">404</p>
      <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">Page not found</h1>
      <p className="mx-auto mt-3 max-w-md text-muted">
        That page may have moved, or the link may be incomplete. Search a topic or start from the databases list.
      </p>
      <div className="mt-6 flex flex-wrap justify-center gap-2">
        <Link href="/" className="btn-primary">
          Search papers
        </Link>
        <Link href="/databases" className="btn-secondary">
          Browse databases
        </Link>
      </div>
    </div>
  );
}
