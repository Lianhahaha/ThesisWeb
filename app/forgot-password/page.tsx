"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { auth, db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";
import { sendPasswordResetEmail } from "firebase/auth";
import { toast } from "@/components/Toaster";
import { Loader2, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { hashMPIN } from "@/lib/utils";

type Step = "email" | "mpin" | "done";

export default function ForgotPasswordPage() {
  const router = useRouter();

  const [step, setStep] = useState<Step>("email");
  const [loading, setLoading] = useState(false);

  const [email, setEmail] = useState("");
  const [mpin, setMpin] = useState("");

  // Stored after successful MPIN verify
  const [uid, setUid] = useState("");

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

      // MPIN verified — send a Firebase password reset email to the user's address
      await sendPasswordResetEmail(auth, email.toLowerCase());
      setStep("done");
    } catch (err: any) {
      toast(err.message, "error");
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
        {(["email", "mpin", "done"] as Step[]).map((s, i) => (
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

      {step === "done" && (
        <div className="text-center space-y-4">
          <p className="text-sm text-muted">
            A password reset link has been sent to <strong className="text-text">{email}</strong>.
            Check your inbox and follow the link to set a new password.
          </p>
          <button
            onClick={() => router.push("/login")}
            className="btn-primary w-full justify-center"
          >
            Back to login
          </button>
        </div>
      )}
    </div>
  );
}
