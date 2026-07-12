"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-store";
import { auth, db } from "@/lib/firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";
import {
  updatePassword,
  reauthenticateWithCredential,
  EmailAuthProvider,
  deleteUser,
  sendPasswordResetEmail,
  verifyBeforeUpdateEmail,
} from "firebase/auth";
import { signOut } from "firebase/auth";
import Link from "next/link";
import { toast } from "@/components/Toaster";
import { Eye, EyeOff, Loader2, User, Lock, Hash, LogOut, Trash2, Mail, AtSign } from "lucide-react";

async function hashMPIN(mpin: string): Promise<string> {
  const msgUint8 = new TextEncoder().encode(mpin);
  const hashBuffer = await crypto.subtle.digest("SHA-256", msgUint8);
  return Array.from(new Uint8Array(hashBuffer))
    .map(b => b.toString(16).padStart(2, "0"))
    .join("");
}

function Section({ title, icon: Icon, children }: { title: string; icon: React.ElementType; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-border bg-surface p-5">
      <div className="flex items-center gap-2 mb-4">
        <Icon className="h-4 w-4 text-muted" />
        <h2 className="text-sm font-semibold text-text">{title}</h2>
      </div>
      {children}
    </div>
  );
}

function PasswordField({
  label, value, onChange, placeholder
}: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  const [show, setShow] = useState(false);
  return (
    <div>
      <label className="block text-xs font-medium text-muted mb-1">{label}</label>
      <div className="relative">
        <input
          type={show ? "text" : "password"}
          className="input w-full pr-9"
          value={value}
          placeholder={placeholder}
          onChange={e => onChange(e.target.value)}
        />
        <button
          type="button"
          className="absolute right-2 top-1/2 -translate-y-1/2 text-muted hover:text-text p-1"
          onClick={() => setShow(s => !s)}
        >
          {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
    </div>
  );
}

export default function SettingsPage() {
  const router = useRouter();
  const { user, initialized } = useAuth();

  // State
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [profileLoaded, setProfileLoaded] = useState(false);

  const [currentPass, setCurrentPass] = useState("");
  const [newPass, setNewPass] = useState("");
  const [savingPass, setSavingPass] = useState(false);

  const [mpin, setMpin] = useState("");
  const [savingMpin, setSavingMpin] = useState(false);

  const [savingUsername, setSavingUsername] = useState(false);

  const [newEmail, setNewEmail] = useState("");
  const [emailPass, setEmailPass] = useState("");
  const [savingEmail, setSavingEmail] = useState(false);
  const [pendingEmail, setPendingEmail] = useState(""); // set after verification link sent
  const [reloading, setReloading] = useState(false);

  // Pre-fill current password from localStorage cache
  useEffect(() => {
    if (!user) return;
    const cached = localStorage.getItem(`tw_pw_${user.uid}`);
    if (cached) setCurrentPass(cached);
  }, [user]);

  // Redirect if not logged in
  useEffect(() => {
    if (initialized && !user) router.replace("/login");
  }, [initialized, user, router]);

  // Load profile — instant from cache, background from Firestore
  useEffect(() => {
    if (!user) return;
    setEmail(user.email || "");

    const cached = localStorage.getItem(`tw_username_${user.uid}`);
    if (cached) {
      setUsername(cached);
      setProfileLoaded(true);
    }

    // Always refresh from Firestore in background
    getDoc(doc(db, "users", user.uid, "profile", "main"))
      .then(snap => {
        if (snap.exists()) {
          const name = snap.data().username || "";
          setUsername(name);
          localStorage.setItem(`tw_username_${user.uid}`, name);
        }
        setProfileLoaded(true);
      })
      .catch(() => setProfileLoaded(true));
  }, [user]);

  async function saveUsername(e: React.FormEvent) {
    e.preventDefault();
    if (!user || !username.trim()) return;
    setSavingUsername(true);
    try {
      const timeout = new Promise((_, reject) => setTimeout(() => reject(new Error("Request timed out. Is Firestore enabled in your Firebase console?")), 5000));
      await Promise.race([
        setDoc(doc(db, "users", user.uid, "profile", "main"), { username: username.trim(), createdAt: Date.now() }, { merge: true }),
        timeout
      ]);
      localStorage.setItem(`tw_username_${user.uid}`, username.trim());
      // Notify header to re-read the username
      window.dispatchEvent(new CustomEvent("tw:usernameChanged", { detail: username.trim() }));
      toast("Username updated", "success");
    } catch (err: any) {
      toast(err.message || "Failed to update username", "error");
    } finally {
      setSavingUsername(false);
    }
  }

  async function saveMpin(e: React.FormEvent) {
    e.preventDefault();
    if (!user || !mpin) return;
    if (!/^\d+$/.test(mpin) || mpin.length < 4) {
      toast("MPIN must be at least 4 digits (numbers only)", "error");
      return;
    }
    setSavingMpin(true);
    try {
      const mpinHash = await hashMPIN(mpin);
      await setDoc(
        doc(db, "users", user.uid, "profile", "main"),
        { mpinHash },
        { merge: true }
      );
      setMpin("");
      toast("MPIN saved successfully", "success");
    } catch {
      toast("Failed to save MPIN", "error");
    } finally {
      setSavingMpin(false);
    }
  }

  async function savePassword(e: React.FormEvent) {
    e.preventDefault();
    if (!user || !user.email) return;
    if (!currentPass) { toast("Enter your current password first", "error"); return; }
    if (newPass.length < 6) { toast("New password must be at least 6 characters", "error"); return; }

    setSavingPass(true);
    try {
      const pwLower = newPass.toLowerCase();
      const credential = EmailAuthProvider.credential(user.email, currentPass.toLowerCase());
      await reauthenticateWithCredential(user, credential);
      await updatePassword(user, pwLower);
      // Update cached password everywhere
      await setDoc(doc(db, "users", user.uid, "profile", "main"), { storedPw: pwLower }, { merge: true });
      localStorage.setItem(`tw_pw_${user.uid}`, pwLower);
      setCurrentPass(pwLower);
      setNewPass("");
      toast("Password updated", "success");
    } catch (err: any) {
      toast(err.message || "Failed to update password", "error");
    } finally {
      setSavingPass(false);
    }
  }

  async function sendReset() {
    if (!user?.email) return;
    try {
      await sendPasswordResetEmail(auth, user.email);
      toast(`Reset link sent to ${user.email}`, "success");
    } catch {
      toast("Failed to send reset email", "error");
    }
  }

  async function saveEmail(e: React.FormEvent) {
    e.preventDefault();
    if (!user || !user.email || !newEmail || !emailPass) return;
    setSavingEmail(true);
    try {
      const credential = EmailAuthProvider.credential(user.email, emailPass.toLowerCase());
      await reauthenticateWithCredential(user, credential);

      // Pass continueUrl so Firebase redirects back to /settings after verification
      const continueUrl = typeof window !== "undefined"
        ? `${window.location.origin}/settings`
        : "http://localhost:3000/settings";

      await verifyBeforeUpdateEmail(user, newEmail.toLowerCase(), {
        url: continueUrl,
        handleCodeInApp: false,
      });

      // Pre-stage the Firestore email_map
      const oldKey = user.email.toLowerCase().replace(/\./g, "_");
      const newKey = newEmail.toLowerCase().replace(/\./g, "_");
      const { deleteDoc } = await import("firebase/firestore");
      await deleteDoc(doc(db, "email_map", oldKey));
      await setDoc(doc(db, "email_map", newKey), { uid: user.uid, email: newEmail.toLowerCase() });

      setPendingEmail(newEmail.toLowerCase());
      setNewEmail("");
      setEmailPass("");
      toast(`Verification link sent to ${newEmail}. Check that inbox and click the link, then come back and press "Refresh Session".`, "success");
    } catch (err: any) {
      toast(err.message || "Failed to send verification email", "error");
    } finally {
      setSavingEmail(false);
    }
  }

  async function reloadSession() {
    if (!user) return;
    setReloading(true);
    try {
      await user.reload(); // Pulls fresh data from Firebase servers
      // user.email is now updated if the link was clicked
      const freshUser = auth.currentUser;
      if (freshUser?.email && freshUser.email !== email) {
        setEmail(freshUser.email);
        setPendingEmail("");
        toast("Email updated successfully!", "success");
      } else {
        toast("Email not changed yet — make sure you clicked the verification link.", "error");
      }
    } catch (err: any) {
      toast(err.message || "Reload failed", "error");
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
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <Loader2 className="animate-spin h-6 w-6 text-muted" />
      </div>
    );
  }

  return (
    <div className="max-w-[600px] mx-auto px-4 py-8 space-y-4">

      {/* Header — username, no logo */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-text">
          {username || user.email || "Account"}
        </h1>
        <p className="text-sm text-muted mt-0.5">{email}</p>
      </div>

      {/* Username */}
      <Section title="Display Name" icon={User}>
        <form onSubmit={saveUsername} className="flex gap-2">
          <input
            className="input flex-1"
            value={username}
            placeholder="Your display name"
            onChange={e => setUsername(e.target.value)}
          />
          <button type="submit" disabled={savingUsername} className="btn-primary shrink-0">
            {savingUsername ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}
          </button>
        </form>
      </Section>

      {/* MPIN */}
      <Section title="Recovery MPIN" icon={Hash}>
        <form onSubmit={saveMpin} className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-muted mb-1">New MPIN (digits only, min 4)</label>
            <div className="flex gap-2">
              <input
                type="number"
                className="input flex-1 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                placeholder="e.g. 12345678"
                value={mpin}
                onChange={e => setMpin(e.target.value)}
              />
              <button type="submit" disabled={savingMpin} className="btn-primary shrink-0">
                {savingMpin ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}
              </button>
            </div>
          </div>
          <p className="text-[11px] text-muted">
            Your MPIN is stored securely and can be used as a backup way to verify your identity. Any length — the longer the better.
          </p>
        </form>
      </Section>

      {/* Change Password */}
      <Section title="Change Password" icon={Lock}>
        <form onSubmit={savePassword} className="space-y-3">
          <PasswordField
            label="Current password"
            value={currentPass}
            onChange={setCurrentPass}
            placeholder="Your current password"
          />
          <PasswordField
            label="New password (case insensitive, min 6 chars)"
            value={newPass}
            onChange={setNewPass}
            placeholder="New password"
          />
          <button type="submit" disabled={savingPass} className="btn-primary w-full justify-center">
            {savingPass ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Update Password
          </button>
        </form>
      </Section>

      {/* Change Email */}
      <Section title="Change Email" icon={AtSign}>
        <form onSubmit={saveEmail} className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-muted mb-1">New email address</label>
            <input type="email" className="input w-full" placeholder="new@email.com" value={newEmail} onChange={e => setNewEmail(e.target.value)} />
          </div>
          <PasswordField label="Current password (to verify it's you)" value={emailPass} onChange={setEmailPass} placeholder="Your current password" />
          <p className="text-[11px] text-muted">
            A verification link will be sent to your new email. Your email won't change until you click that link.
          </p>
          <button type="submit" disabled={savingEmail} className="btn-primary w-full justify-center">
            {savingEmail ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Send Verification Link
          </button>
        </form>

        {/* Show this after the link is sent */}
        {pendingEmail && (
          <div className="mt-4 rounded-md border border-amber-500/30 bg-amber-500/10 p-3 space-y-2">
            <p className="text-xs text-amber-400 font-medium">⏳ Waiting for verification</p>
            <p className="text-[11px] text-muted">
              Check your inbox at <strong className="text-text">{pendingEmail}</strong> and click the verification link. Then press the button below.
            </p>
            <button
              onClick={reloadSession}
              disabled={reloading}
              className="flex items-center gap-2 text-sm font-medium text-brand-500 hover:text-brand-400 transition-colors disabled:opacity-50"
            >
              {reloading ? <Loader2 className="h-4 w-4 animate-spin" /> : <span>↻</span>}
              I clicked the link — Refresh Session
            </button>
          </div>
        )}
      </Section>

      {/* Forgot / Recovery link */}
      <Section title="Forgot Your Password?" icon={Mail}>
        <p className="text-sm text-muted mb-3">
          Use your <strong className="text-text">MPIN</strong> to recover access without needing your old password.
          Default MPIN for new accounts is <strong className="text-text">0000</strong> — update it above!
        </p>
        <Link href="/forgot-password" className="btn-secondary w-full justify-center text-center block">
          Go to Recovery Page
        </Link>
      </Section>

      {/* Danger zone */}
      <Section title="Session" icon={LogOut}>
        <button
          onClick={handleSignOut}
          className="flex items-center gap-2 text-sm text-red-500 hover:text-red-400 transition-colors"
        >
          <LogOut className="h-4 w-4" />
          Sign out of ThesisWeb
        </button>
      </Section>

    </div>
  );
}
