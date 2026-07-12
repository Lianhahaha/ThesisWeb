"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { auth, db } from "@/lib/firebase";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { signInWithEmailAndPassword, updatePassword } from "firebase/auth";
import { toast } from "@/components/Toaster";
import { Loader2, ArrowLeft, Eye, EyeOff } from "lucide-react";
import Link from "next/link";

async function hashMPIN(mpin: string): Promise<string> {
  const msgUint8 = new TextEncoder().encode(mpin);
  const hashBuffer = await crypto.subtle.digest("SHA-256", msgUint8);
  return Array.from(new Uint8Array(hashBuffer))
    .map(b => b.toString(16).padStart(2, "0"))
    .join("");
}

type Step = "email" | "mpin" | "newpw";

export default function ForgotPasswordPage() {
  const router = useRouter();

  const [step, setStep] = useState<Step>("email");
  const [loading, setLoading] = useState(false);

  const [email, setEmail] = useState("");
  const [mpin, setMpin] = useState("");
  const [newPw, setNewPw] = useState("");
  const [showPw, setShowPw] = useState(false);

  // Stored after successful MPIN verify
  const [uid, setUid] = useState("");
  const [storedPw, setStoredPw] = useState("");

  async function handleEmailSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email) return;
    setLoading(true);
    try {
      // Look up UID from the email_map collection we created on signup
      const normalizedEmail = email.toLowerCase().replace(/\./g, "_");
      const mapSnap = await getDoc(doc(db, "email_map", normalizedEmail));
      if (!mapSnap.exists()) {
        throw new Error("No account found with that email address.");
      }
      setUid(mapSnap.data().uid);
      setStep("mpin");
    } catch (err: any) {
      toast(err.message || "Email lookup failed", "error");
    } finally {
      setLoading(false);
    }
  }

  async function handleMpinSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!mpin || !uid) return;
    setLoading(true);
    try {
      const profileSnap = await getDoc(doc(db, "users", uid, "profile", "main"));
      if (!profileSnap.exists()) throw new Error("Profile not found.");

      const data = profileSnap.data();
      const savedHash = data.mpinHash || "";
      const enteredHash = await hashMPIN(mpin);

      if (enteredHash !== savedHash) {
        throw new Error("Incorrect MPIN. If you never set one, try the default: 0000");
      }

      // MPIN matched — retrieve stored password so we can reauthenticate
      const pw = data.storedPw || "";
      if (!pw) throw new Error("No stored password found. Please use the email reset link instead.");

      setStoredPw(pw);
      setStep("newpw");
    } catch (err: any) {
      toast(err.message, "error");
    } finally {
      setLoading(false);
    }
  }

  async function handleNewPwSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!newPw || newPw.length < 6) {
      toast("Password must be at least 6 characters", "error");
      return;
    }
    setLoading(true);
    try {
      const lowEmail = email.toLowerCase();
      const newPwLower = newPw.toLowerCase();

      // Sign in with stored old password, then update to new one
      const cred = await signInWithEmailAndPassword(auth, lowEmail, storedPw);
      await updatePassword(cred.user, newPwLower);

      // Update stored password in Firestore
      await updateDoc(doc(db, "users", uid, "profile", "main"), { storedPw: newPwLower });
      localStorage.setItem(`tw_pw_${uid}`, newPwLower);

      toast("Password reset successfully! Redirecting to library…", "success");
      setTimeout(() => router.push("/library"), 1500);
    } catch (err: any) {
      toast(err.message || "Reset failed", "error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-[400px] mx-auto mt-12 p-6 rounded-lg border bg-surface border-border">
      <Link href="/login" className="flex items-center gap-1 text-xs text-muted hover:text-text mb-6">
        <ArrowLeft className="h-3 w-3" /> Back to login
      </Link>

      <h1 className="text-xl font-semibold text-text text-center mb-2">Recover Account</h1>

      {/* Step indicators */}
      <div className="flex items-center gap-2 justify-center mb-6">
        {(["email", "mpin", "newpw"] as Step[]).map((s, i) => (
          <div key={s} className="flex items-center gap-2">
            <div
              className="h-2 w-2 rounded-full transition-colors"
              style={{ backgroundColor: step === s ? "rgb(var(--accent))" : "rgb(var(--border2))" }}
            />
            {i < 2 && <div className="h-px w-6" style={{ backgroundColor: "rgb(var(--border2))" }} />}
          </div>
        ))}
      </div>

      {step === "email" && (
        <form onSubmit={handleEmailSubmit} className="flex flex-col gap-4">
          <p className="text-sm text-muted text-center mb-2">Enter the email address you used to sign up.</p>
          <div>
            <label className="block text-xs font-medium text-text mb-1">Email address</label>
            <input
              type="email"
              required
              autoFocus
              className="input w-full"
              placeholder="you@example.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
            />
          </div>
          <button type="submit" disabled={loading} className="btn-primary w-full justify-center">
            {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Next
          </button>
        </form>
      )}

      {step === "mpin" && (
        <form onSubmit={handleMpinSubmit} className="flex flex-col gap-4">
          <p className="text-sm text-muted text-center mb-2">
            Enter your recovery MPIN. If you never set one, try <strong className="text-text">0000</strong>.
          </p>
          <div>
            <label className="block text-xs font-medium text-text mb-1">Recovery MPIN</label>
            <input
              type="number"
              required
              autoFocus
              className="input w-full [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              placeholder="e.g. 0000"
              value={mpin}
              onChange={e => setMpin(e.target.value)}
            />
          </div>
          <p className="text-[11px] text-muted text-center">
            ⚠️ If the MPIN is wrong and you have no way to recover it, the account cannot be accessed.
          </p>
          <button type="submit" disabled={loading} className="btn-primary w-full justify-center">
            {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Verify MPIN
          </button>
        </form>
      )}

      {step === "newpw" && (
        <form onSubmit={handleNewPwSubmit} className="flex flex-col gap-4">
          <p className="text-sm text-muted text-center mb-2">MPIN verified! Set your new password.</p>
          <div>
            <label className="block text-xs font-medium text-text mb-1">New Password (case insensitive)</label>
            <div className="relative">
              <input
                type={showPw ? "text" : "password"}
                required
                minLength={6}
                autoFocus
                className="input w-full pr-9"
                placeholder="Min 6 characters"
                value={newPw}
                onChange={e => setNewPw(e.target.value)}
              />
              <button
                type="button"
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted hover:text-text p-1"
                onClick={() => setShowPw(s => !s)}
              >
                {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>
          <button type="submit" disabled={loading} className="btn-primary w-full justify-center">
            {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Reset Password
          </button>
        </form>
      )}
    </div>
  );
}
