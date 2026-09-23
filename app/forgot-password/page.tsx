"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { sendPasswordResetEmail } from "firebase/auth";
import { ArrowLeft } from "lucide-react";
import { auth } from "@/lib/firebase";
import { toast } from "@/components/Toaster";
import { checkRecoveryPin, lookupUid } from "@/lib/recovery";

type Step = "email" | "mpin" | "done";

const STEP_NUMBER: Record<Step, number> = { email: 1, mpin: 2, done: 3 };

export default function ForgotPasswordPage() {
  const router = useRouter();

  const [step, setStep] = useState<Step>("email");
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [mpin, setMpin] = useState("");
  // Set once the email is matched to an account.
  const [uid, setUid] = useState("");

  async function handleEmailSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email) return;
    setLoading(true);
    try {
      const found = await lookupUid(email);
      if (!found) throw new Error("No account found with that email address.");
      setUid(found);
      setStep("mpin");
    } catch (err) {
      toast(err instanceof Error ? err.message : "Email lookup failed", "error");
    } finally {
      setLoading(false);
    }
  }

  async function handleMpinSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!mpin || !uid) return;
    setLoading(true);
    try {
      if (!(await checkRecoveryPin(uid, mpin))) {
        throw new Error("That PIN does not match this account.");
      }

      await sendPasswordResetEmail(auth, email.toLowerCase());
      setStep("done");
    } catch (err) {
      toast(err instanceof Error ? err.message : "Verification failed", "error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto mt-4 max-w-md sm:mt-12">
      <Link href="/login" className="btn-ghost btn-sm -ml-2.5 mb-4">
        <ArrowLeft className="h-4 w-4" aria-hidden />
        Back to sign in
      </Link>

      <p className="eyebrow">Step {STEP_NUMBER[step]} of 3</p>
      <h1 className="display mt-3 text-3xl">Recover your account</h1>

      {step === "email" && (
        <form onSubmit={handleEmailSubmit} className="panel mt-6 space-y-4">
          <div>
            <label htmlFor="email" className="field-label">Email address</label>
            <input
              id="email"
              type="email"
              required
              autoFocus
              autoComplete="email"
              className="input"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <p className="field-hint">The address you signed up with.</p>
          </div>
          <button type="submit" disabled={loading} className="btn-primary w-full">
            {loading ? "Checking…" : "Continue"}
          </button>
        </form>
      )}

      {step === "mpin" && (
        <form onSubmit={handleMpinSubmit} className="panel mt-6 space-y-4">
          <div>
            <label htmlFor="mpin" className="field-label">Recovery PIN</label>
            <input
              id="mpin"
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              required
              autoFocus
              autoComplete="off"
              className="input"
              placeholder="4 to 12 digits"
              value={mpin}
              onChange={(e) => setMpin(e.target.value)}
            />
            <p className="field-hint">The PIN you chose in Settings.</p>
          </div>
          <p className="notice notice-info">
            Without the PIN this account cannot be recovered.
          </p>
          <button type="submit" disabled={loading} className="btn-primary w-full">
            {loading ? "Checking…" : "Verify PIN"}
          </button>
        </form>
      )}

      {step === "done" && (
        <div className="panel mt-6 space-y-4">
          <p className="notice notice-ok">
            A password reset link was sent to <strong>{email}</strong>. Open it to set a new
            password. Check your spam folder if it does not arrive shortly.
          </p>
          <button onClick={() => router.push("/login")} className="btn-primary w-full">
            Back to sign in
          </button>
        </div>
      )}
    </div>
  );
}
