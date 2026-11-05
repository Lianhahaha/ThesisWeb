"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="mx-auto max-w-2xl py-16 text-center sm:py-24">
      <p className="eyebrow">Something went wrong</p>
      <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">This page hit an error</h1>
      <p className="mx-auto mt-3 max-w-md text-muted">
        Your search and saved library are safe. Try loading the page again, or go back to the search page.
      </p>
      <div className="mt-6 flex flex-wrap justify-center gap-2">
        <button type="button" onClick={reset} className="btn-primary">
          Try again
        </button>
        <Link href="/" className="btn-secondary">
          Go to search
        </Link>
      </div>
      {error.digest && <p className="mt-6 text-xs text-subtle">Reference: {error.digest}</p>}
    </div>
  );
}
