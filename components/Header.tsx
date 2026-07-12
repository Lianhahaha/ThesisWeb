"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Search, Library, Sparkles, BookOpen, Settings, LogOut } from "lucide-react";
import { useLiveQuery } from "dexie-react-hooks";
import { getDb } from "@/lib/db";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-store";
import { auth, db } from "@/lib/firebase";
import { signOut } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";

const NAV = [
  { href: "/search",   label: "Find RRLs",    icon: Search   },
  { href: "/library",  label: "Library",       icon: Library  },
  { href: "/ai-check", label: "AI Self-Check", icon: Sparkles },
];

export function Header() {
  const pathname = usePathname();
  const count = useLiveQuery(async () => {
    if (typeof window === "undefined") return 0;
    return getDb().papers.count();
  }, []);

  return (
    <>
      {/* Top bar */}
      <header
        className="sticky top-0 z-50 w-full"
        style={{
          backgroundColor: "rgb(var(--surface))",
          borderBottom: "1px solid rgb(var(--border))",
        }}
      >
        <div className="flex h-[54px] items-center gap-3 px-4 max-w-[1280px] mx-auto">

          {/* Logo */}
          <Link
            href="/"
            className="flex shrink-0 items-center gap-2"
            style={{ color: "rgb(var(--text))" }}
          >
            <span
              className="flex h-8 w-8 items-center justify-center rounded-md shrink-0"
              style={{ backgroundColor: "#238636" }}
            >
              <BookOpen className="h-4 w-4 text-white" />
            </span>
            <span className="hidden xs:block text-sm font-semibold">ThesisWeb</span>
          </Link>

          {/* Divider */}
          <span
            className="hidden sm:block h-5 w-px shrink-0"
            style={{ backgroundColor: "rgb(var(--border2))" }}
          />

          {/* Desktop nav */}
          <nav className="hidden sm:flex items-center gap-0.5">
            {NAV.map((item) => {
              const active = pathname.startsWith(item.href);
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className="relative flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors"
                  style={{
                    color: active ? "rgb(var(--text))" : "rgb(var(--muted))",
                  }}
                  onMouseEnter={(e) => {
                    if (!active)
                      (e.currentTarget as HTMLElement).style.backgroundColor = "rgb(var(--surface3))";
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLElement).style.backgroundColor = "";
                  }}
                >
                  <Icon className="h-4 w-4" />
                  <span>{item.label}</span>
                  {item.href === "/library" && count ? (
                    <span className="counter">{count}</span>
                  ) : null}
                  {/* Active underline */}
                  {active && (
                    <span
                      className="absolute bottom-[-1px] left-0 h-0.5 w-full rounded-t-sm"
                      style={{ backgroundColor: "rgb(var(--accent))" }}
                    />
                  )}
                </Link>
              );
            })}
          </nav>

          {/* Spacer */}
          <div className="flex-1" />

          {/* Auth area — username link or sign in */}
          <UserArea />
        </div>
      </header>

      {/* Mobile bottom tab bar */}
      <div
        className="fixed bottom-0 left-0 right-0 z-50 flex sm:hidden items-center"
        style={{
          backgroundColor: "rgb(var(--surface))",
          borderTop: "1px solid rgb(var(--border))",
        }}
      >
        {[{ href: "/", label: "Home", icon: BookOpen }, ...NAV].map((item) => {
          const active =
            item.href === "/"
              ? pathname === "/"
              : pathname.startsWith(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className="relative flex flex-1 flex-col items-center justify-center gap-0.5 py-2 transition-colors"
              style={{ color: active ? "rgb(var(--accent))" : "rgb(var(--muted))" }}
            >
              <Icon className="h-5 w-5" />
              <span style={{ fontSize: "10px", fontWeight: 500 }}>{item.label}</span>
              {item.href === "/library" && count ? (
                <span
                  className="absolute right-1/4 top-1 flex h-4 min-w-[16px] items-center justify-center rounded-full px-1 text-[9px] font-bold text-white"
                  style={{ backgroundColor: "#238636" }}
                >
                  {count}
                </span>
              ) : null}
            </Link>
          );
        })}
      </div>

      {/* Push content above mobile tab bar */}
      <div className="sm:hidden h-[56px]" aria-hidden="true" />
    </>
  );
}

/** Shows username + settings/logout links. No avatar bubble. */
function UserArea() {
  const { user, initialized } = useAuth();
  const [username, setUsername] = useState<string | null>(null);

  useEffect(() => {
    if (!user) { setUsername(null); return; }
    // Try localStorage cache first for instant render
    const cached = localStorage.getItem(`tw_username_${user.uid}`);
    if (cached) { setUsername(cached); return; }
    // Otherwise fetch from Firestore once
    getDoc(doc(db, "users", user.uid, "profile", "main")).then(snap => {
      const name = snap.exists() ? (snap.data().username || user.email || "") : (user.email || "");
      setUsername(name);
      localStorage.setItem(`tw_username_${user.uid}`, name);
    }).catch(() => setUsername(user.email || ""));
  }, [user]);

  // Listen for username changes made in Settings page
  useEffect(() => {
    function onUsernameChanged(e: Event) {
      const name = (e as CustomEvent<string>).detail;
      if (name) setUsername(name);
    }
    window.addEventListener("tw:usernameChanged", onUsernameChanged);
    return () => window.removeEventListener("tw:usernameChanged", onUsernameChanged);
  }, []);

  if (!initialized) return null;

  if (!user) {
    return (
      <Link href="/login" className="btn-primary !py-1.5 !px-3 !text-xs">
        Sign In
      </Link>
    );
  }

  const displayName = username || user.email || "Account";

  return (
    <div className="flex items-center gap-1">
      {/* Username — links to settings */}
      <Link
        href="/settings"
        className="flex items-center gap-1.5 rounded-md px-2 py-1.5 text-sm font-medium transition-colors"
        style={{ color: "rgb(var(--muted))" }}
        onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = "rgb(var(--text))"}
        onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = "rgb(var(--muted))"}
      >
        <Settings className="h-3.5 w-3.5 shrink-0" />
        <span className="max-w-[120px] truncate">{displayName}</span>
      </Link>

      {/* Sign out button */}
      <button
        onClick={() => {
          if (user) localStorage.removeItem(`tw_username_${user.uid}`);
          signOut(auth);
        }}
        className="flex items-center rounded-md p-1.5 transition-colors"
        style={{ color: "rgb(var(--muted))" }}
        title="Sign out"
        onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = "#ef4444"}
        onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = "rgb(var(--muted))"}
      >
        <LogOut className="h-4 w-4" />
      </button>
    </div>
  );
}
