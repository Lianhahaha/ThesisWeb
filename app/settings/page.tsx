"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { doc, getDoc, setDoc } from "firebase/firestore";
import {
  updatePassword,
  reauthenticateWithCredential,
  EmailAuthProvider,
  verifyBeforeUpdateEmail,
  signOut,
} from "firebase/auth";
import { Eye, EyeOff } from "lucide-react";
import { auth, db } from "@/lib/firebase";
import { useAuth } from "@/lib/auth-store";
import { toast } from "@/components/Toaster";
import { hashMPIN } from "@/lib/utils";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="panel" aria-label={title}>
      <h2 className="text-lg">{title}</h2>
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

export default function SettingsPage() {
  const router = useRouter();
  const { user, initialized } = useAuth();

  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");

  const [currentPass, setCurrentPass] = useState("");
  const [newPass, setNewPass] = useState("");
  const [savingPass, setSavingPass] = useState(false);

  const [mpin, setMpin] = useState("");
  const [savingMpin, setSavingMpin] = useState(false);
  const [savingUsername, setSavingUsername] = useState(false);

  const [newEmail, setNewEmail] = useState("");
  const [emailPass, setEmailPass] = useState("");
  const [savingEmail, setSavingEmail] = useState(false);
  const [pendingEmail, setPendingEmail] = useState("");
  const [reloading, setReloading] = useState(false);

  useEffect(() => {
    if (initialized && !user) router.replace("/login");
  }, [initialized, user, router]);

  // Show the cached name instantly, then refresh it from Firestore.
  useEffect(() => {
    if (!user) return;
    setEmail(user.email || "");

    const cached = localStorage.getItem(`tw_username_${user.uid}`);
    if (cached) setUsername(cached);

    getDoc(doc(db, "users", user.uid, "profile", "main"))
      .then((snap) => {
        if (!snap.exists()) return;
        const name = snap.data().username || "";
        setUsername(name);
        localStorage.setItem(`tw_username_${user.uid}`, name);
      })
      .catch(() => {});
  }, [user]);

  async function saveUsername(e: React.FormEvent) {
    e.preventDefault();
    if (!user || !username.trim()) return;
    setSavingUsername(true);
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);
      await Promise.race([
        setDoc(
          doc(db, "users", user.uid, "profile", "main"),
          { username: username.trim(), createdAt: Date.now() },
          { merge: true }
        ),
        new Promise<never>((_, reject) => {
          controller.signal.addEventListener("abort", () =>
            reject(new Error("Request timed out. Is Firestore enabled in your Firebase console?"))
          );
        }),
      ]);
      clearTimeout(timeout);
      localStorage.setItem(`tw_username_${user.uid}`, username.trim());
      // Tell the header to re-read the name.
      window.dispatchEvent(new CustomEvent("tw:usernameChanged", { detail: username.trim() }));
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
    if (!/^\d+$/.test(mpin) || mpin.length < 4) {
      toast("The PIN must be at least 4 digits, numbers only.", "error");
      return;
    }
    setSavingMpin(true);
    try {
      await setDoc(
        doc(db, "users", user.uid, "profile", "main"),
        { mpinHash: await hashMPIN(mpin) },
        { merge: true }
      );
      setMpin("");
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

    setSavingPass(true);
    try {
      await reauthenticateWithCredential(user, EmailAuthProvider.credential(user.email, currentPass));
      await updatePassword(user, newPass);
      setCurrentPass("");
      setNewPass("");
      toast("Password updated", "success");
    } catch (err) {
      toast(err instanceof Error ? err.message : "Could not update the password", "error");
    } finally {
      setSavingPass(false);
    }
  }

  async function saveEmail(e: React.FormEvent) {
    e.preventDefault();
    if (!user?.email || !newEmail || !emailPass) return;
    setSavingEmail(true);
    try {
      await reauthenticateWithCredential(user, EmailAuthProvider.credential(user.email, emailPass));

      // continueUrl brings the user back here after they verify.
      const continueUrl =
        typeof window !== "undefined"
          ? `${window.location.origin}/settings`
          : "http://localhost:3000/settings";

      await verifyBeforeUpdateEmail(user, newEmail.toLowerCase(), {
        url: continueUrl,
        handleCodeInApp: false,
      });

      // Stage the new lookup entry; the old one is removed only once verified.
      const newKey = newEmail.toLowerCase().replace(/\./g, "_");
      await setDoc(doc(db, "email_map", newKey), { uid: user.uid, email: newEmail.toLowerCase() });

      setPendingEmail(newEmail.toLowerCase());
      setNewEmail("");
      setEmailPass("");
      toast(`Verification link sent to ${newEmail}. Open it, then press Refresh here.`, "success");
    } catch (err) {
      toast(err instanceof Error ? err.message : "Could not send the verification email", "error");
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
        // Verified: the old lookup entry can go now.
        const oldKey = email.toLowerCase().replace(/\./g, "_");
        const { deleteDoc } = await import("firebase/firestore");
        await deleteDoc(doc(db, "email_map", oldKey)).catch(() => {});
        setEmail(fresh.email);
        setPendingEmail("");
        toast("Email updated", "success");
      } else {
        toast("Email not changed yet. Make sure you opened the verification link.", "error");
      }
    } catch (err) {
      toast(err instanceof Error ? err.message : "Refresh failed", "error");
    } finally {
      setReloading(false);
    }
  }

  async function handleSignOut() {
    if (user) localStorage.removeItem(`tw_username_${user.uid}`);
    await signOut(auth);
    router.push("/");
  }

  if (!initialized || !user) {
    return <p role="status" className="py-20 text-center text-muted">Loading…</p>;
  }

  return (
    <div className="mx-auto max-w-xl space-y-4">
      <header className="mb-2">
        <p className="overline">Account</p>
        <h1 className="display mt-3 text-3xl">{username || email || "Account"}</h1>
        <p className="mt-2 text-muted">{email}</p>
      </header>

      <Section title="Display name">
        <form onSubmit={saveUsername} className="flex flex-col gap-2 sm:flex-row">
          <label htmlFor="display-name" className="sr-only">Display name</label>
          <input
            id="display-name"
            className="input flex-1"
            value={username}
            placeholder="Your display name"
            autoComplete="nickname"
            onChange={(e) => setUsername(e.target.value)}
          />
          <button type="submit" disabled={savingUsername} className="btn-primary">
            {savingUsername ? "Saving…" : "Save"}
          </button>
        </form>
      </Section>

      <Section title="Recovery PIN">
        <form onSubmit={saveMpin}>
          <label htmlFor="mpin" className="field-label">New PIN</label>
          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              id="mpin"
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              autoComplete="off"
              className="input flex-1"
              placeholder="At least 4 digits"
              value={mpin}
              onChange={(e) => setMpin(e.target.value)}
            />
            <button type="submit" disabled={savingMpin} className="btn-primary">
              {savingMpin ? "Saving…" : "Save PIN"}
            </button>
          </div>
          <p className="field-hint">
            Digits only. You need this to recover the account if you forget your password. New
            accounts start at <strong>0000</strong>, so change it.
          </p>
        </form>
      </Section>

      <Section title="Change password">
        <form onSubmit={savePassword} className="space-y-4">
          <PasswordField
            id="cur-pass"
            label="Current password"
            value={currentPass}
            onChange={setCurrentPass}
            autoComplete="current-password"
          />
          <PasswordField
            id="new-pass"
            label="New password (at least 6 characters)"
            value={newPass}
            onChange={setNewPass}
            autoComplete="new-password"
          />
          <button type="submit" disabled={savingPass} className="btn-primary w-full sm:w-auto">
            {savingPass ? "Updating…" : "Update password"}
          </button>
        </form>
      </Section>

      <Section title="Change email">
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
          <PasswordField
            id="email-pass"
            label="Current password, to confirm it is you"
            value={emailPass}
            onChange={setEmailPass}
            autoComplete="current-password"
          />
          <p className="field-hint">
            We send a link to the new address. Your email does not change until you open it.
          </p>
          <button type="submit" disabled={savingEmail} className="btn-primary w-full sm:w-auto">
            {savingEmail ? "Sending…" : "Send verification link"}
          </button>
        </form>

        {pendingEmail && (
          <div className="notice notice-info mt-4">
            <p>
              <strong>Waiting for verification.</strong> Open the link sent to{" "}
              <strong>{pendingEmail}</strong>, then press the button below.
            </p>
            <button
              onClick={reloadSession}
              disabled={reloading}
              className="btn-secondary btn-sm mt-3"
            >
              {reloading ? "Checking…" : "I opened the link. Refresh."}
            </button>
          </div>
        )}
      </Section>

      <Section title="Forgot your password?">
        <p className="text-muted">
          Use your recovery PIN to get a reset email without knowing the old password.
        </p>
        <Link href="/forgot-password" className="btn-secondary mt-4 w-full sm:w-auto">
          Open account recovery
        </Link>
      </Section>

      <Section title="Sign out">
        <p className="text-muted">
          Your saved papers stay in your account. On a shared computer, sign out when you finish.
        </p>
        <button onClick={handleSignOut} className="btn-danger mt-4 w-full sm:w-auto">
          Sign out of ThesisWeb
        </button>
      </Section>
    </div>
  );
}
