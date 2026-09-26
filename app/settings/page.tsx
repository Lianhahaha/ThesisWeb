"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { doc, getDoc, setDoc, deleteDoc } from "firebase/firestore";
import {
  updatePassword,
  reauthenticateWithCredential,
  EmailAuthProvider,
  verifyBeforeUpdateEmail,
  sendEmailVerification,
  deleteUser,
  signOut,
} from "firebase/auth";
import { Eye, EyeOff, Download, Upload, X } from "lucide-react";
import { auth, db } from "@/lib/firebase";
import { useAuth } from "@/lib/auth-store";
import { toast } from "@/components/Toaster";
import { authMessage } from "@/lib/auth-errors";
import { CountryCombobox } from "@/components/CountryCombobox";
import { allPapers, localPapers, removeLocalPapers, savePapers } from "@/lib/db";
import { fsDeleteAllPapers } from "@/lib/firestore-library";
import { emailKey, hasRecoveryPin, migrateRecoveryPin, setRecoveryPin, writeEmailMap } from "@/lib/recovery";
import { getPreferences, setPreferences, type Preferences } from "@/lib/preferences";
import { clearSearchHistory } from "@/lib/search-history";
import { applyTheme, savedThemeChoice, type ThemeChoice } from "@/lib/theme";
import type { CitationStyle } from "@/lib/citations";
import type { SavedPaper } from "@/lib/types";

// Offsets are one less than the span because the year filter is inclusive.
const YEAR_OPTIONS = [
  { value: 1, label: "Last 2 years" },
  { value: 2, label: "Last 3 years" },
  { value: 4, label: "Last 5 years" },
  { value: 9, label: "Last 10 years" },
  { value: 0, label: "Any year" },
];

const STYLES: { id: CitationStyle; label: string }[] = [
  { id: "apa", label: "APA 7" },
  { id: "mla", label: "MLA 9" },
  { id: "ieee", label: "IEEE" },
  { id: "chicago", label: "Chicago" },
];

/** Most papers one backup import may add. */
const MAX_IMPORT = 2000;

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="panel" aria-label={title}>
      <h2 className="text-xl">{title}</h2>
      {description && <p className="mt-1 text-sm text-muted">{description}</p>}
      <div className="mt-4">{children}</div>
    </section>
  );
}

function PasswordField({
  id,
  label,
  value,
  onChange,
  autoComplete,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  autoComplete: string;
}) {
  const [show, setShow] = useState(false);
  return (
    <div>
      <label htmlFor={id} className="field-label">{label}</label>
      <div className="relative">
        <input
          id={id}
          type={show ? "text" : "password"}
          autoComplete={autoComplete}
          className="input pr-12"
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
        <button
          type="button"
          onClick={() => setShow((v) => !v)}
          aria-label={show ? "Hide password" : "Show password"}
          className="absolute right-0 top-0 flex h-full w-11 items-center justify-center text-muted hover:text-text"
        >
          {show ? <EyeOff className="h-4 w-4" aria-hidden /> : <Eye className="h-4 w-4" aria-hidden />}
        </button>
      </div>
    </div>
  );
}

function downloadJson(data: unknown, filename: string) {
  const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/** Turn untrusted backup JSON into papers; skips anything malformed. */
function parseBackup(raw: unknown): SavedPaper[] {
  const list = Array.isArray(raw) ? raw : (raw as { papers?: unknown })?.papers;
  if (!Array.isArray(list)) throw new Error("This file isn't a Thesisweb library backup.");
  const out: SavedPaper[] = [];
  for (const item of list.slice(0, MAX_IMPORT)) {
    if (!item || typeof item !== "object") continue;
    const p = item as Partial<SavedPaper>;
    if (typeof p.id !== "string" || typeof p.title !== "string" || !p.id || !p.title) continue;
    // Spreading the raw item would carry any stray keys the file happens to
    // hold, and the security rules cap a paper at 40 of them. Take only the
    // fields the app defines.
    const str = (v: unknown, max: number) =>
      typeof v === "string" && v ? v.slice(0, max) : undefined;
    out.push({
      id: p.id.slice(0, 300),
      title: p.title.slice(0, 1000),
      authors: Array.isArray(p.authors) ? p.authors.filter((a) => typeof a === "string").slice(0, 50) : [],
      year: typeof p.year === "number" ? p.year : null,
      publishedDate: str(p.publishedDate, 40),
      venue: str(p.venue, 500),
      doi: str(p.doi, 300),
      abstract: str(p.abstract, 40000),
      tldr: str(p.tldr, 2000),
      openAccessUrl: str(p.openAccessUrl, 2000),
      isOpenAccess: p.isOpenAccess === true,
      citedByCount: typeof p.citedByCount === "number" ? p.citedByCount : undefined,
      keywords: Array.isArray(p.keywords) ? p.keywords.filter((k) => typeof k === "string").slice(0, 50) : undefined,
      retracted: p.retracted === true,
      sources: Array.isArray(p.sources) ? p.sources.filter((s) => typeof s === "string") : [],
      savedAt: typeof p.savedAt === "number" ? p.savedAt : Date.now(),
      collection: str(p.collection, 100),
      notes: str(p.notes, 20000),
      matrix: p.matrix && typeof p.matrix === "object" ? p.matrix : undefined,
      tags: Array.isArray(p.tags) ? p.tags.filter((t) => typeof t === "string") : [],
      readingStatus: p.readingStatus === "reading" || p.readingStatus === "done" ? p.readingStatus : "to-read",
    } as SavedPaper);
  }
  return out;
}

export default function SettingsPage() {
  const router = useRouter();
  const { user, initialized } = useAuth();

  // ── Preferences (everyone) ────────────────────────────────────────────
  const [prefs, setPrefs] = useState<Preferences | null>(null);
  const [theme, setTheme] = useState<ThemeChoice>("system");
  useEffect(() => {
    setPrefs(getPreferences());
    setTheme(savedThemeChoice());
  }, []);

  function savePrefs(e: React.FormEvent) {
    e.preventDefault();
    if (!prefs) return;
    setPreferences(prefs);
    toast("Preferences saved on this device", "success");
  }

  function chooseTheme(next: ThemeChoice) {
    setTheme(next);
    applyTheme(next);
  }

  // ── Account (signed in) ───────────────────────────────────────────────
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [savingUsername, setSavingUsername] = useState(false);

  const [mpin, setMpin] = useState("");
  const [savingMpin, setSavingMpin] = useState(false);
  // null until the account has been checked, so the warning never flashes.
  const [hasPin, setHasPin] = useState<boolean | null>(null);

  const [currentPass, setCurrentPass] = useState("");
  const [newPass, setNewPass] = useState("");
  const [confirmPass, setConfirmPass] = useState("");
  const [savingPass, setSavingPass] = useState(false);

  const [newEmail, setNewEmail] = useState("");
  const [emailPass, setEmailPass] = useState("");
  const [savingEmail, setSavingEmail] = useState(false);
  const [pendingEmail, setPendingEmail] = useState("");
  const [reloading, setReloading] = useState(false);

  // null until known, so the notice never flashes for verified accounts.
  const [verified, setVerified] = useState<boolean | null>(null);
  const [verifyBusy, setVerifyBusy] = useState(false);

  useEffect(() => {
    if (!user) return;
    setEmail(user.email || "");
    setVerified(user.emailVerified);
    const cached = localStorage.getItem(`tw_username_${user.uid}`);
    // Older builds could cache the email as the name; don't show that.
    if (cached && cached !== user.email) setUsername(cached);

    getDoc(doc(db, "users", user.uid, "profile", "main"))
      .then((snap) => {
        if (!snap.exists()) return;
        const name = snap.data().username || "";
        setUsername(name);
        localStorage.setItem(`tw_username_${user.uid}`, name);
      })
      .catch(() => {});
    // Older accounts stored the PIN in the profile; copy it to recovery/{uid},
    // then find out whether this account has a PIN at all.
    migrateRecoveryPin(user.uid)
      .catch(() => {})
      .then(() => hasRecoveryPin(user.uid))
      .then(setHasPin)
      .catch(() => {});
  }, [user]);

  async function saveUsername(e: React.FormEvent) {
    e.preventDefault();
    const name = username.trim().slice(0, 60);
    if (!user || !name) return;
    setSavingUsername(true);
    try {
      await setDoc(doc(db, "users", user.uid, "profile", "main"), { username: name }, { merge: true });
      localStorage.setItem(`tw_username_${user.uid}`, name);
      window.dispatchEvent(new CustomEvent("tw:usernameChanged", { detail: name }));
      toast("Display name updated", "success");
    } catch (err) {
      toast(err instanceof Error ? err.message : "Could not update the display name", "error");
    } finally {
      setSavingUsername(false);
    }
  }

  async function saveMpin(e: React.FormEvent) {
    e.preventDefault();
    if (!user || !mpin) return;
    if (!/^\d{4,12}$/.test(mpin)) {
      toast("The PIN must be 4 to 12 digits, numbers only.", "error");
      return;
    }
    setSavingMpin(true);
    try {
      await setRecoveryPin(user.uid, mpin);
      setMpin("");
      setHasPin(true);
      toast("Recovery PIN saved", "success");
    } catch {
      toast("Could not save the PIN. Try again.", "error");
    } finally {
      setSavingMpin(false);
    }
  }

  async function savePassword(e: React.FormEvent) {
    e.preventDefault();
    if (!user?.email) return;
    if (!currentPass) { toast("Enter your current password first.", "error"); return; }
    if (newPass.length < 6) { toast("The new password must be at least 6 characters.", "error"); return; }
    if (newPass !== confirmPass) { toast("The two new passwords don't match.", "error"); return; }
    if (newPass === currentPass) { toast("The new password is the same as the current one.", "error"); return; }
    setSavingPass(true);
    try {
      await reauthenticateWithCredential(user, EmailAuthProvider.credential(user.email, currentPass));
      await updatePassword(user, newPass);
      setCurrentPass("");
      setNewPass("");
      setConfirmPass("");
      toast("Password updated", "success");
    } catch (err) {
      const code = (err as { code?: string })?.code;
      toast(
        code === "auth/invalid-credential" || code === "auth/wrong-password"
          ? "Your current password is wrong."
          : authMessage(err, "Could not update the password."),
        "error"
      );
    } finally {
      setSavingPass(false);
    }
  }

  async function saveEmail(e: React.FormEvent) {
    e.preventDefault();
    if (!user?.email || !newEmail || !emailPass) return;
    if (newEmail.trim().toLowerCase() === user.email.toLowerCase()) {
      toast("That is already your email address.", "error");
      return;
    }
    setSavingEmail(true);
    try {
      await reauthenticateWithCredential(user, EmailAuthProvider.credential(user.email, emailPass));
      await verifyBeforeUpdateEmail(user, newEmail.trim().toLowerCase(), {
        url: `${window.location.origin}/settings`,
        handleCodeInApp: false,
      });
      // The lookup entry is written only once the new address is verified —
      // claiming it now would point recovery at an address the account may
      // never own, and password reset for it would fail with user-not-found.
      setPendingEmail(newEmail.trim().toLowerCase());
      setNewEmail("");
      setEmailPass("");
      toast(`Verification link sent to ${newEmail}. Open it, then press Refresh here.`, "success");
    } catch (err) {
      const code = (err as { code?: string })?.code;
      toast(
        code === "auth/invalid-credential" || code === "auth/wrong-password"
          ? "Your current password is wrong."
          : authMessage(err, "Could not send the verification email."),
        "error"
      );
    } finally {
      setSavingEmail(false);
    }
  }

  async function reloadSession() {
    if (!user) return;
    setReloading(true);
    try {
      await user.reload();
      const fresh = auth.currentUser;
      if (fresh?.email && fresh.email !== email) {
        await writeEmailMap(fresh.uid, fresh.email);
        await deleteDoc(doc(db, "email_map", emailKey(email))).catch(() => {});
        setEmail(fresh.email);
        setPendingEmail("");
        toast("Email updated", "success");
      } else {
        toast("Email not changed yet. Make sure you opened the verification link.", "error");
      }
    } catch (err) {
      const code = (err as { code?: string })?.code;
      // Verifying the new address revokes this session, so reload fails. That
      // means the change went through: the next sign-in updates the lookup.
      if (code === "auth/user-token-expired") {
        setPendingEmail("");
        await signOut(auth).catch(() => {});
        toast("Email changed. Sign in again with your new address.", "success");
        router.push("/login");
        return;
      }
      toast(authMessage(err, "Refresh failed. Try again."), "error");
    } finally {
      setReloading(false);
    }
  }

  async function resendVerification() {
    if (!user) return;
    setVerifyBusy(true);
    try {
      await sendEmailVerification(user);
      toast(`Verification link sent to ${user.email}.`, "success");
    } catch (err) {
      toast(authMessage(err, "Could not send the verification email."), "error");
    } finally {
      setVerifyBusy(false);
    }
  }

  async function checkVerified() {
    if (!user) return;
    setVerifyBusy(true);
    try {
      await user.reload();
      const ok = !!auth.currentUser?.emailVerified;
      setVerified(ok);
      toast(ok ? "Email address confirmed" : "Not confirmed yet. Open the link in the email first.", ok ? "success" : "info");
    } catch (err) {
      toast(authMessage(err, "Could not check. Try again."), "error");
    } finally {
      setVerifyBusy(false);
    }
  }

  const [deletePass, setDeletePass] = useState("");
  const [deleting, setDeleting] = useState(false);

  async function deleteAccount(e: React.FormEvent) {
    e.preventDefault();
    if (!user?.email) return;
    if (!deletePass) { toast("Enter your password to confirm.", "error"); return; }
    if (!window.confirm("Delete your account and every paper, note and matrix saved in it? This cannot be undone.")) return;
    setDeleting(true);
    try {
      // Re-authenticate first: deleteUser refuses an old session, and a wrong
      // password should stop everything before any data is removed.
      await reauthenticateWithCredential(user, EmailAuthProvider.credential(user.email, deletePass));
      const uid = user.uid;
      await fsDeleteAllPapers(uid);
      await Promise.allSettled([
        deleteDoc(doc(db, "users", uid, "profile", "main")),
        deleteDoc(doc(db, "recovery", uid)),
        deleteDoc(doc(db, "email_map", emailKey(user.email))),
      ]);
      await deleteUser(user);
      try {
        localStorage.removeItem(`tw_username_${uid}`);
        localStorage.removeItem(`tw_emailmap_${uid}`);
      } catch {
        // Ignore.
      }
      toast("Your account has been deleted", "success");
      router.push("/");
    } catch (err) {
      const code = (err as { code?: string })?.code;
      toast(
        code === "auth/invalid-credential" || code === "auth/wrong-password"
          ? "Your password is wrong."
          : authMessage(err, "Could not delete the account. Try again."),
        "error"
      );
    } finally {
      setDeleting(false);
    }
  }

  async function handleSignOut() {
    if (user) localStorage.removeItem(`tw_username_${user.uid}`);
    await signOut(auth);
    router.push("/");
  }

  // ── Your data (everyone) ──────────────────────────────────────────────
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [browserCount, setBrowserCount] = useState(0);
  useEffect(() => {
    localPapers().then((p) => setBrowserCount(p.length)).catch(() => setBrowserCount(0));
  }, []);

  async function downloadBackup() {
    try {
      const papers = await allPapers();
      downloadJson(
        { app: "Thesisweb", exportedAt: new Date().toISOString(), papers },
        `thesisweb-library-${new Date().toISOString().slice(0, 10)}.json`
      );
      toast(`Backup of ${papers.length} papers downloaded`, "success");
    } catch {
      toast("Could not read your library.", "error");
    }
  }

  async function importBackup(file: File) {
    setBusy(true);
    try {
      if (file.size > 20 * 1024 * 1024) throw new Error("That file is too large to be a library backup.");
      const papers = parseBackup(JSON.parse(await file.text()));
      if (papers.length === 0) throw new Error("No papers found in this file.");
      await savePapers(papers);
      toast(`Imported ${papers.length} papers into your library`, "success");
    } catch (err) {
      toast(err instanceof SyntaxError ? "This file isn't valid JSON." : err instanceof Error ? err.message : "Import failed", "error");
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function copyBrowserPapers() {
    setBusy(true);
    try {
      const papers = await localPapers();
      await savePapers(papers);
      await removeLocalPapers(papers.map((p) => p.id));
      setBrowserCount(0);
      toast(`Copied ${papers.length} papers to your account`, "success");
    } catch {
      toast("Could not copy the papers. Try again.", "error");
    } finally {
      setBusy(false);
    }
  }

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

      <Section title="Preferences" description="Saved on this device. Used every time you start a search or a citation.">
        {prefs && (
          <form onSubmit={savePrefs} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="pref-year" className="field-label">Default “Published since”</label>
                <select
                  id="pref-year"
                  value={prefs.yearsBack}
                  onChange={(e) => setPrefs({ ...prefs, yearsBack: Number(e.target.value) })}
                  className="input"
                >
                  {YEAR_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="pref-country" className="field-label">Default country focus</label>
                <div className="flex items-center gap-1">
                  <div className="flex-1">
                    <CountryCombobox
                      id="pref-country"
                      value={prefs.country}
                      onChange={(c) => setPrefs({ ...prefs, country: c })}
                    />
                  </div>
                  {prefs.country && (
                    <button
                      type="button"
                      onClick={() => setPrefs({ ...prefs, country: null })}
                      className="btn-ghost btn-sm !px-2"
                      aria-label="Clear default country"
                    >
                      <X className="h-4 w-4" aria-hidden />
                    </button>
                  )}
                </div>
              </div>
            </div>

            <label className="flex cursor-pointer items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={prefs.openAccessOnly}
                onChange={(e) => setPrefs({ ...prefs, openAccessOnly: e.target.checked })}
                className="h-4 w-4"
                style={{ accentColor: "rgb(var(--accent))" }}
              />
              Show only papers with free full text by default
            </label>

            <div>
              <span className="field-label">Default citation style</span>
              <div className="seg" role="group" aria-label="Default citation style">
                {STYLES.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    data-on={prefs.citationStyle === s.id}
                    onClick={() => setPrefs({ ...prefs, citationStyle: s.id })}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <span className="field-label">Appearance</span>
              <div className="seg" role="group" aria-label="Appearance">
                {([
                  ["light", "Light"],
                  ["dark", "Dark"],
                  ["system", "Match device"],
                ] as [ThemeChoice, string][]).map(([t, label]) => (
                  <button key={t} type="button" data-on={theme === t} onClick={() => chooseTheme(t)}>
                    {label}
                  </button>
                ))}
              </div>
              <p className="field-hint">Applies straight away.</p>
            </div>

            <button type="submit" className="btn-primary">Save preferences</button>
          </form>
        )}
      </Section>

      {user && verified === false && (
        <div role="status" className="notice notice-info">
          <p>
            <strong>Confirm your email address.</strong> Password reset links go to{" "}
            <strong className="break-all">{email}</strong>, so make sure it reaches you.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button onClick={resendVerification} disabled={verifyBusy} className="btn-secondary btn-sm">
              Send the link again
            </button>
            <button onClick={checkVerified} disabled={verifyBusy} className="btn-ghost btn-sm">
              I opened it
            </button>
          </div>
        </div>
      )}

      {user && (
        <>
          <Section title="Display name">
            <form onSubmit={saveUsername} className="flex flex-col gap-2 sm:flex-row">
              <label htmlFor="display-name" className="sr-only">Display name</label>
              <input
                id="display-name"
                className="input flex-1"
                value={username}
                maxLength={60}
                placeholder="Your display name"
                autoComplete="nickname"
                onChange={(e) => setUsername(e.target.value)}
              />
              <button type="submit" disabled={savingUsername} className="btn-primary">
                {savingUsername ? "Saving…" : "Save"}
              </button>
            </form>
          </Section>

          <Section
            title="Recovery PIN"
            description="Needed on the Forgot password page. It is the only way back into your account if you forget your password."
          >
            {hasPin === false && (
              <p role="alert" className="notice notice-danger mb-3">
                <strong>You have no recovery PIN yet.</strong>{" "}
                Set one now — without it a forgotten password cannot be reset.
              </p>
            )}
            <form onSubmit={saveMpin}>
              <label htmlFor="mpin" className="field-label">New PIN (4 to 12 digits)</label>
              <div className="flex flex-col gap-2 sm:flex-row">
                <input
                  id="mpin"
                  type="password"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={12}
                  autoComplete="off"
                  className="input flex-1"
                  value={mpin}
                  onChange={(e) => setMpin(e.target.value.replace(/\D/g, ""))}
                />
                <button type="submit" disabled={savingMpin} className="btn-primary">
                  {savingMpin ? "Saving…" : "Save PIN"}
                </button>
              </div>
            </form>
          </Section>

          <Section title="Change password">
            <form onSubmit={savePassword} className="space-y-4">
              <PasswordField id="cur-pass" label="Current password" value={currentPass} onChange={setCurrentPass} autoComplete="current-password" />
              <PasswordField id="new-pass" label="New password (at least 6 characters)" value={newPass} onChange={setNewPass} autoComplete="new-password" />
              <PasswordField id="confirm-pass" label="Confirm new password" value={confirmPass} onChange={setConfirmPass} autoComplete="new-password" />
              <button type="submit" disabled={savingPass} className="btn-primary w-full sm:w-auto">
                {savingPass ? "Updating…" : "Update password"}
              </button>
            </form>
          </Section>

          <Section title="Change email" description="We send a link to the new address. Your email only changes after you open it.">
            <form onSubmit={saveEmail} className="space-y-4">
              <div>
                <label htmlFor="new-email" className="field-label">New email address</label>
                <input
                  id="new-email"
                  type="email"
                  autoComplete="email"
                  className="input"
                  placeholder="new@email.com"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                />
              </div>
              <PasswordField id="email-pass" label="Current password, to confirm it is you" value={emailPass} onChange={setEmailPass} autoComplete="current-password" />
              <button type="submit" disabled={savingEmail} className="btn-primary w-full sm:w-auto">
                {savingEmail ? "Sending…" : "Send verification link"}
              </button>
            </form>
            {pendingEmail && (
              <div className="notice notice-info mt-4">
                <p>
                  <strong>Waiting for verification.</strong> Open the link sent to{" "}
                  <strong className="break-all">{pendingEmail}</strong>, then press the button below.
                </p>
                <button onClick={reloadSession} disabled={reloading} className="btn-secondary btn-sm mt-3">
                  {reloading ? "Checking…" : "I opened the link. Refresh."}
                </button>
              </div>
            )}
          </Section>
        </>
      )}

      <Section title="Your data" description={user ? "Your library is stored in your account." : "Your library is stored in this browser only."}>
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <button onClick={downloadBackup} className="btn-secondary btn-sm">
              <Download className="h-3.5 w-3.5" aria-hidden />
              Download library backup
            </button>
            <button onClick={() => fileRef.current?.click()} disabled={busy} className="btn-secondary btn-sm">
              <Upload className="h-3.5 w-3.5" aria-hidden />
              {busy ? "Working…" : "Import backup"}
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="application/json,.json"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) importBackup(f);
              }}
            />
          </div>
          <p className="field-hint !mt-0">
            A backup is a .json file with every saved paper, its notes, collection and synthesis matrix.
            Importing adds to your library; papers already in it are updated.
          </p>

          {user && browserCount > 0 && (
            <div className="notice notice-info">
              <p>
                This browser also has <strong>{browserCount}</strong> paper{browserCount === 1 ? "" : "s"} you saved
                while signed out.
              </p>
              <button onClick={copyBrowserPapers} disabled={busy} className="btn-secondary btn-sm mt-3">
                Copy them to my account
              </button>
            </div>
          )}

          <button
            onClick={() => { clearSearchHistory(); toast("Search history cleared", "info"); }}
            className="btn-ghost btn-sm -ml-2.5"
          >
            Clear search history
          </button>
        </div>
      </Section>

      {user ? (
        <>
          <Section title="Forgot your password?" description="Use your recovery PIN to get a reset email without the old password.">
            <Link href="/forgot-password" className="btn-secondary">Open account recovery</Link>
          </Section>
          <Section title="Sign out" description="Your saved papers stay in your account.">
            <button onClick={handleSignOut} className="btn-danger w-full sm:w-auto">Sign out of Thesisweb</button>
          </Section>
          <Section
            title="Delete account"
            description="Removes your account, saved papers, notes, matrix and recovery PIN for good. Download a library backup first if you want to keep anything."
          >
            <form onSubmit={deleteAccount} className="space-y-4">
              <PasswordField id="delete-pass" label="Password, to confirm it is you" value={deletePass} onChange={setDeletePass} autoComplete="current-password" />
              <button type="submit" disabled={deleting} className="btn-danger w-full sm:w-auto">
                {deleting ? "Deleting…" : "Delete my account"}
              </button>
            </form>
          </Section>
        </>
      ) : (
        <Section title="Account" description="Free. Keeps your library, notes and matrix on every device.">
          <Link href="/login" className="btn-primary">Sign in or create an account</Link>
        </Section>
      )}
    </div>
  );
}
