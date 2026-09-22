"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Search, Library, Quote, Home, LogOut } from "lucide-react";
import { useLiveQuery } from "dexie-react-hooks";
import { getDb } from "@/lib/db";
import { useAuth } from "@/lib/auth-store";
import { auth, db } from "@/lib/firebase";
import { signOut } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";

const NAV = [
  { href: "/search", label: "Search", icon: Search },
  { href: "/library", label: "Library", icon: Library },
  { href: "/cite", label: "Cite", icon: Quote },
];

/** Count of saved papers, from whichever store this user is on. */
function useSavedCount() {
  const { user } = useAuth();

  const local = useLiveQuery(async () => {
    if (typeof window === "undefined") return 0;
    return getDb().papers.count();
  }, []);

  const [cloud, setCloud] = useState<number | null>(null);
  useEffect(() => {
    if (!user) { setCloud(null); return; }
    import("@/lib/db")
      .then(({ allPapers }) => allPapers())
      .then((p) => setCloud(p.length))
      .catch(() => setCloud(0));
  }, [user]);

  return user ? cloud ?? 0 : local ?? 0;
}

export function Header() {
  const pathname = usePathname();
  const count = useSavedCount();

  const isOn = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-border bg-surface">
        <div className="mx-auto flex h-14 w-full max-w-6xl items-center gap-4 px-4 sm:grid sm:grid-cols-[1fr_auto_1fr] sm:px-6">
          <Link href="/" className="flex shrink-0 items-center gap-3" aria-label="thesisweb ph home">
            <span className="serif text-[21px] font-medium leading-none">thesisweb ph</span>
            <span className="hidden rounded-full border border-border px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.14em] text-subtle xs:inline">
              RRL toolkit
            </span>
          </Link>

          <nav className="hidden sm:block" aria-label="Main">
            <div className="seg">
              {NAV.map(({ href, label, icon: Icon }) => (
                <Link
                  key={href}
                  href={href}
                  data-on={isOn(href)}
                  aria-current={isOn(href) ? "page" : undefined}
                >
                  <Icon className="h-4 w-4" aria-hidden />
                  {label}
                  {href === "/library" && count > 0 && <span className="counter ml-0.5">{count}</span>}
                </Link>
              ))}
            </div>
          </nav>

          <div className="flex flex-1 justify-end">
            <UserArea />
          </div>
        </div>
      </header>

      {/* Mobile tab bar. Sits above the iOS home indicator via safe-area padding. */}
      <nav
        className="fixed bottom-0 left-0 right-0 z-40 flex border-t border-border bg-surface sm:hidden"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
        aria-label="Main"
      >
        {[{ href: "/", label: "Home", icon: Home }, ...NAV].map(({ href, label, icon: Icon }) => {
          const on = isOn(href);
          return (
            <Link
              key={href}
              href={href}
              aria-current={on ? "page" : undefined}
              className="relative flex flex-1 flex-col items-center justify-center gap-1 py-2.5 text-[11px] font-medium"
              style={{ color: on ? "rgb(var(--text))" : "rgb(var(--subtle))" }}
            >
              {/* Top bar marks the active tab, so colour is not the only cue. */}
              {on && <span className="absolute inset-x-5 top-0 h-0.5 rounded-b bg-accent" aria-hidden />}
              <Icon className="h-5 w-5" aria-hidden />
              {label}
              {href === "/library" && count > 0 && (
                <span className="absolute right-[22%] top-1.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-accent px-1 text-[10px] font-bold text-surface">
                  {count}
                </span>
              )}
            </Link>
          );
        })}
      </nav>
    </>
  );
}

function UserArea() {
  const { user, initialized } = useAuth();
  const [username, setUsername] = useState<string | null>(null);

  useEffect(() => {
    if (!user) { setUsername(null); return; }
    const cached = localStorage.getItem(`tw_username_${user.uid}`);
    if (cached) { setUsername(cached); return; }
    getDoc(doc(db, "users", user.uid, "profile", "main"))
      .then((snap) => {
        const name = (snap.exists() ? snap.data().username : "") || user.email || "";
        setUsername(name);
        localStorage.setItem(`tw_username_${user.uid}`, name);
      })
      .catch(() => setUsername(user.email || ""));
  }, [user]);

  // Settings renames the account; reflect it without a reload.
  useEffect(() => {
    function onChange(e: Event) {
      const name = (e as CustomEvent<string>).detail;
      if (name) setUsername(name);
    }
    window.addEventListener("tw:usernameChanged", onChange);
    return () => window.removeEventListener("tw:usernameChanged", onChange);
  }, []);

  if (!initialized) return null;

  if (!user) {
    return (
      <Link href="/login" className="btn-primary btn-sm">
        Sign in
      </Link>
    );
  }

  return (
    <div className="flex items-center gap-1">
      <Link
        href="/settings"
        className="btn-ghost btn-sm max-w-[160px]"
        title="Account settings"
      >
        <span className="truncate">{username || user.email || "Account"}</span>
      </Link>
      <button
        onClick={() => {
          localStorage.removeItem(`tw_username_${user.uid}`);
          signOut(auth);
        }}
        className="btn-ghost btn-sm !px-2"
        aria-label="Sign out"
        title="Sign out"
      >
        <LogOut className="h-4 w-4" aria-hidden />
      </button>
    </div>
  );
}
