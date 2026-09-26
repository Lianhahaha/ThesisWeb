"use client";

import { useState, useRef, useEffect } from "react";
import { Globe, ChevronDown } from "lucide-react";
import { filterCountries } from "@/lib/countries";

/** Type-to-filter country picker. `null` means no country filter. */
export function CountryCombobox({
  id,
  value,
  onChange,
}: {
  id?: string;
  value: string | null;
  onChange: (v: string | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const ref = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const filtered = filterCountries(search);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  function select(country: string | null) {
    onChange(country);
    setOpen(false);
    setSearch("");
  }

  return (
    <div ref={ref} className="relative">
      <button
        id={id}
        type="button"
        onClick={() => {
          setOpen(true);
          setSearch("");
          setTimeout(() => inputRef.current?.focus(), 0);
        }}
        aria-expanded={open}
        aria-haspopup="listbox"
        className="input flex items-center gap-2 text-left"
      >
        <Globe className="h-4 w-4 shrink-0 text-subtle" aria-hidden />
        <span className={`flex-1 truncate ${value ? "text-text" : "text-subtle"}`}>
          {value ?? "Anywhere"}
        </span>
        <ChevronDown className="h-4 w-4 shrink-0 text-subtle" aria-hidden />
      </button>

      {open && (
        <div
          className="card absolute left-0 top-full z-30 mt-1 w-[260px] max-w-[calc(100vw-2rem)] overflow-hidden"
          style={{ boxShadow: "0 12px 32px rgba(28,27,24,0.14)" }}
        >
          <div className="border-b border-border p-2">
            <label htmlFor="country-search" className="sr-only">Search countries</label>
            <input
              id="country-search"
              ref={inputRef}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => {
                // The picker sits inside the search and settings forms, so
                // Enter used to submit them with the old country. Pick the
                // top match instead.
                if (e.key !== "Enter") return;
                e.preventDefault();
                if (search.trim() && filtered.length > 0) select(filtered[0]);
              }}
              placeholder="Type a country…"
              className="input"
            />
          </div>
          <ul className="max-h-[260px] overflow-y-auto py-1" role="listbox">
            <li>
              <button
                type="button"
                onClick={() => select(null)}
                role="option"
                aria-selected={!value}
                className={`flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-surface3 ${
                  !value ? "font-semibold text-accent" : "text-muted"
                }`}
              >
                <Globe className="h-4 w-4 shrink-0" aria-hidden />
                Anywhere (global)
              </button>
            </li>
            {filtered.length === 0 ? (
              <li className="px-3 py-4 text-center text-sm text-subtle">No countries match.</li>
            ) : (
              filtered.map((c) => (
                <li key={c}>
                  <button
                    type="button"
                    onClick={() => select(c)}
                    role="option"
                    aria-selected={value === c}
                    className={`w-full px-3 py-2 text-left text-sm hover:bg-surface3 ${
                      value === c ? "font-semibold text-accent" : "text-muted"
                    }`}
                  >
                    {c}
                  </button>
                </li>
              ))
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
