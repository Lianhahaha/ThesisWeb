"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/lib/auth/store";
import { cacheUsername, getCachedUsername } from "@/lib/auth/username-cache";
import { Section } from "@/components/settings/parts";
import { PreferencesSection } from "@/components/settings/PreferencesSection";
import { AccountSections } from "@/components/settings/AccountSections";
import { DataSection } from "@/components/settings/DataSection";
import { AccountActions } from "@/components/settings/AccountActions";

/**
 * Settings: preferences and backups for everyone; name, password, email,
 * sign-out and deletion for an account. Each panel lives in
 * components/settings; this page loads the name and email its heading shows.
 */
export default function SettingsPage() {
  const { user, initialized } = useAuth();
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");

  useEffect(() => {
    if (!user) return;
    setEmail(user.email || "");
    const cached = getCachedUsername(user.uid);
    // Older builds could cache the email as the name; don't show that.
    if (cached && cached !== user.email) setUsername(cached);

    getDoc(doc(db, "users", user.uid, "profile", "main"))
      .then((snap) => {
        if (!snap.exists()) return;
        const name = snap.data().username || "";
        setUsername(name);
        cacheUsername(user.uid, name);
      })
      .catch(() => {});
  }, [user]);

  if (!initialized) {
    return <p role="status" className="py-20 text-center text-muted">Loading…</p>;
  }

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <header className="mb-2">
        <p className="eyebrow">{user ? "Your profile" : "Settings"}</p>
        <h1 className="display mt-2 text-3xl sm:text-4xl">{user ? username || "Your account" : "Settings"}</h1>
        {user ? (
          <p className="mt-2 break-all text-muted">{email}</p>
        ) : (
          <p className="mt-2 text-muted">
            Preferences and backups work without an account.{" "}
            <Link href="/login" className="text-accent underline">Sign in</Link> to keep your library on every
            device.
          </p>
        )}
      </header>

      <PreferencesSection />

      {user && <AccountSections user={user} username={username} onUsername={setUsername} email={email} onEmail={setEmail} />}

      <DataSection user={user} />

      {user ? (
        <AccountActions user={user} />
      ) : (
        <Section title="Account" description="Free. Keeps your library, notes and matrix on every device.">
          <Link href="/login" className="btn-primary">Sign in or create an account</Link>
        </Section>
      )}
    </div>
  );
}
