"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { doc, getDoc } from "firebase/firestore";
import { sendPasswordResetEmail } from "firebase/auth";
import { ArrowLeft } from "lucide-react";
import { auth, db } from "@/lib/firebase";
import { toast } from "@/components/Toaster";
import { hashMPIN } from "@/lib/utils";

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
      // email_map is written at signup and maps an address to its uid.
      const normalizedEmail = email.toLowerCase().replace(/\./g, "_");
      const mapSnap = await getDoc(doc(db, "email_map", normalizedEmail));
      if (!mapSnap.exists()) throw new Error("No account found with that email address.");
      setUid(mapSnap.data().uid);
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
      const profileSnap = await getDoc(doc(db, "users", uid, "profile", "main"));
      if (!profileSnap.exists()) throw new Error("Profile not found.");

      const savedHash = profileSnap.data().mpinHash || "";
      if ((await hashMPIN(mpin)) !== savedHash) {
        throw new Error("Incorrect PIN. If you never set one, try the default: 0000");
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
              placeholder="e.g. 0000"
              value={mpin}
              onChange={(e) => setMpin(e.target.value)}
            />
            <p className="field-hint">If you never set one, try <strong>0000</strong>.</p>
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
