"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Search, Library, Sparkles, BookOpen, Moon, Sun, Github } from "lucide-react";
import { useEffect, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { getDb } from "@/lib/db";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/", label: "Dashboard", icon: BookOpen },
  { href: "/search", label: "Find RRLs", icon: Search },
  { href: "/library", label: "Library", icon: Library },
  { href: "/ai-check", label: "AI Self-Check", icon: Sparkles },
];

export function Sidebar() {
  const pathname = usePathname();
  const [dark, setDark] = useState(false);

  // Live count of saved papers — the badge in the nav.
  const count = useLiveQuery(async () => {
    if (typeof window === "undefined") return 0;
    return getDb().papers.count();
  }, []);

  useEffect(() => {
    setDark(document.documentElement.classList.contains("dark"));
  }, []);

  function toggleTheme() {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    localStorage.setItem("tw-theme", next ? "dark" : "light");
  }

  return (
    <aside className="w-60 shrink-0 border-r border-border bg-surface flex flex-col">
      <div className="px-4 py-5 border-b border-border">
        <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600 text-white">
            <BookOpen className="h-4 w-4" />
          </span>
          <span>ThesisWeb</span>
        </Link>
        <p className="mt-1 px-1 text-xs text-muted">RRL finder & writing helper</p>
      </div>

      <nav className="flex-1 px-2 py-3 space-y-0.5">
        {NAV.map((item) => {
          const active = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                active ? "bg-brand-50 text-brand-700 dark:bg-brand-950 dark:text-brand-300" : "text-muted hover:bg-bg hover:text-text"
              )}
            >
              <Icon className="h-4 w-4" />
              <span className="flex-1">{item.label}</span>
              {item.href === "/library" && count ? (
                <span className="badge bg-brand-100 text-brand-700 dark:bg-brand-900 dark:text-brand-200">
                  {count}
                </span>
              ) : null}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-border p-2 flex items-center gap-1">
        <button onClick={toggleTheme} className="btn-ghost flex-1 justify-start">
          {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          <span className="text-xs">{dark ? "Light" : "Dark"}</span>
        </button>
      </div>
    </aside>
  );
}
