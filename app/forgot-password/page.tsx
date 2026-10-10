"use client";

import { useState } from "react";
import Link from "next/link";
import { sendPasswordResetEmail } from "firebase/auth";
import { ArrowLeft } from "lucide-react";
import { auth } from "@/lib/firebase";
import { toast } from "@/components/Toaster";
import { authMessage } from "@/lib/auth/errors";

/**
 * Forgotten password: Firebase emails a reset link to the address. The page
 * says the same thing whether or not an account uses that address, so it
 * can't be used to find out who has signed up.
 */
export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sentTo, setSentTo] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const address = email.trim().toLowerCase();
    if (!address) return;
    setLoading(true);
    try {
      await sendPasswordResetEmail(auth, address, { url: `${window.location.origin}/login` });
      setSentTo(address);
    } catch (err) {
      const code = (err as { code?: string })?.code;
      // Same answer as a success: whether an address has an account stays private.
      if (code === "auth/user-not-found") setSentTo(address);
      else toast(authMessage(err, "Could not send the reset link. Try again."), "error");
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

      <p className="eyebrow">Account</p>
      <h1 className="display mt-3 text-3xl">Reset your password</h1>
      <p className="mt-2 text-muted">
        Signed up with Google? There is no Thesisweb password to reset: go back and use{" "}
        <em>Continue with Google</em>.
      </p>

      {sentTo ? (
        <div className="panel mt-6 space-y-4">
          <p role="status" className="notice notice-ok">
            If an account uses <strong className="break-all">{sentTo}</strong>, a link to set a new password is
            on its way. Check your spam folder if it doesn&apos;t arrive within a few minutes.
          </p>
          <div className="flex flex-wrap gap-2">
            <Link href="/login" className="btn-primary">Back to sign in</Link>
            <button type="button" onClick={() => setSentTo(null)} className="btn-ghost">
              Use a different email
            </button>
          </div>
        </div>
      ) : (
        <form onSubmit={onSubmit} className="panel mt-6 space-y-4">
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
            <p className="field-hint">The address you signed up with. We email it a reset link.</p>
          </div>
          <button type="submit" disabled={loading} className="btn-primary w-full">
            {loading ? "Sending…" : "Send reset link"}
          </button>
        </form>
      )}
    </div>
  );
}
