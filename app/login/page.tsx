"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, sendEmailVerification } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import { Eye, EyeOff } from "lucide-react";
import { auth, db } from "@/lib/firebase";
import { useAuth } from "@/lib/auth/store";
import { cacheUsername } from "@/lib/auth/username-cache";
import { toast } from "@/components/Toaster";
import { trackEvent } from "@/lib/analytics-events";
import { authMessage } from "@/lib/auth/errors";
import { googleErrorMessage, isInAppBrowser, signInWithGoogle } from "@/lib/auth/google";
import { GoogleButton } from "@/components/GoogleButton";

export default function LoginPage() {
  const router = useRouter();
  const { user, initialized } = useAuth();

  const [mode, setMode] = useState<"login" | "signup">("login");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [username, setUsername] = useState("");
  const [googleBusy, setGoogleBusy] = useState(false);
  // Google refuses to sign in inside Facebook/Messenger's own browser.
  const [inApp, setInApp] = useState(false);

  useEffect(() => {
    if (initialized && user) router.replace("/library");
  }, [initialized, user, router]);
  useEffect(() => setInApp(isInAppBrowser(navigator.userAgent)), []);

  async function continueWithGoogle() {
    setGoogleBusy(true);
    try {
      const { isNew } = await signInWithGoogle();
      toast(isNew ? "Account created with Google" : "Signed in", "success");
      trackEvent(isNew ? "sign_up" : "login", { method: "google" });
      router.push("/library");
    } catch (err) {
      const message = googleErrorMessage(err);
      if (message) toast(message, "error");
    } finally {
      setGoogleBusy(false);
    }
  }

  const mismatch = mode === "signup" && confirm.length > 0 && confirm !== password;

  if (!initialized) {
    return <p role="status" className="py-20 text-center text-muted">Loading…</p>;
  }
  if (user) return null;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email || !password) return;
    // `required` accepts a name of only spaces, which would save as "".
    if (mode === "signup" && !username.trim()) {
      toast("Enter a display name.", "error");
      return;
    }
    // A mistyped password at sign-up locks a new account out until a reset email arrives.
    if (mode === "signup" && password !== confirm) {
      toast("The two passwords don't match.", "error");
      return;
    }

    setLoading(true);
    try {
      if (mode === "login") {
        await signInWithEmailAndPassword(auth, email, password);
        toast("Signed in", "success");
        trackEvent("login", { method: "password" });
        router.push("/library");
      } else {
        // Signing up signs the user in straight away. The verification email
        // doesn't block anything; it catches a mistyped address while the
        // user can still fix it, since password resets go to that address.
        const cred = await createUserWithEmailAndPassword(auth, email, password);
        const uid = cred.user.uid;
        sendEmailVerification(cred.user).catch(() => {});
        const name = username.trim().slice(0, 60);

        // The account exists at this point. If the profile write fails (offline)
        // the user can still use the app, so warn instead of failing the sign-up.
        try {
          await setDoc(doc(db, "users", uid, "profile", "main"), { username: name, createdAt: Date.now() });
        } catch {
          toast("Account created, but your display name could not be saved yet. Set it in Settings.", "info");
        }

        // The header may have looked before the profile existed; tell it now.
        cacheUsername(uid, name);
        toast(`Account created. We sent a link to ${email} to confirm the address.`, "success");
        trackEvent("sign_up", { method: "password" });
        router.push("/library");
      }
    } catch (err) {
      toast(authMessage(err, "Sign-in failed. Try again."), "error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto mt-4 max-w-md sm:mt-12">
      <p className="eyebrow">Account</p>
      <h1 className="display mt-3 text-3xl">
        {mode === "login" ? "Sign in" : "Create an account"}
      </h1>
      <p className="mt-2 text-muted">
        An account keeps your saved papers on every device. Searching works without one.
      </p>

      <p role="status" className="notice notice-danger mt-6">
        <strong>Accounts are still under development.</strong>{" "}
        Sign-in works, but expect rough edges, and saved papers could be lost while this is being
        built. Keep your own copy of anything important — <em>Export references</em> in Library
        downloads your whole library. Searching works without an account.
      </p>

      <div className="seg mt-4 w-full" role="group" aria-label="Sign in or sign up">
        <button type="button" className="flex-1" data-on={mode === "login"} onClick={() => setMode("login")}>
          Sign in
        </button>
        <button type="button" className="flex-1" data-on={mode === "signup"} onClick={() => setMode("signup")}>
          Sign up
        </button>
      </div>

      <div className="panel mt-4">
        {inApp && (
          <p className="notice notice-info mb-3 text-sm">
            Google sign-in doesn&apos;t work inside Facebook or Messenger. Open this page in Chrome or Safari
            (menu → <em>Open in browser</em>), or use email below.
          </p>
        )}
        <GoogleButton onClick={continueWithGoogle} busy={googleBusy} />
        <p className="field-hint text-center">No new password to remember. Uses your Google account&apos;s name and email.</p>
      </div>

      <p className="my-4 text-center text-xs text-subtle">or with email and password</p>

      <form onSubmit={onSubmit} className="panel space-y-4">
        {mode === "signup" && (
          <div>
            <label htmlFor="username" className="field-label">Display name</label>
            <input
              id="username"
              required
              autoFocus
              autoComplete="nickname"
              maxLength={60}
              className="input"
              placeholder="What we should call you"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
          </div>
        )}

        <div>
          <label htmlFor="email" className="field-label">Email address</label>
          <input
            id="email"
            type="email"
            required
            autoComplete="email"
            className="input"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>

        <div>
          <div className="flex items-baseline justify-between">
            <label htmlFor="password" className="field-label">Password</label>
            {mode === "login" && (
              <Link href="/forgot-password" className="mb-1.5 text-xs text-accent underline">
                Forgot password?
              </Link>
            )}
          </div>
          <div className="relative">
            <input
              id="password"
              type={showPassword ? "text" : "password"}
              required
              minLength={6}
              autoComplete={mode === "login" ? "current-password" : "new-password"}
              className="input pr-12"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              aria-label={showPassword ? "Hide password" : "Show password"}
              className="absolute right-0 top-0 flex h-full w-11 items-center justify-center text-muted hover:text-text"
            >
              {showPassword ? <EyeOff className="h-4 w-4" aria-hidden /> : <Eye className="h-4 w-4" aria-hidden />}
            </button>
          </div>
          {mode === "signup" && (
            <p className="field-hint">
              At least 6 characters. Use a new password made for Thesisweb, never your email password.
            </p>
          )}
        </div>

        {mode === "signup" && (
          <div>
            <label htmlFor="confirm-password" className="field-label">Confirm password</label>
            <input
              id="confirm-password"
              type={showPassword ? "text" : "password"}
              required
              autoComplete="new-password"
              className="input"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              aria-invalid={mismatch}
              aria-describedby={mismatch ? "confirm-hint" : undefined}
            />
            {mismatch && (
              <p id="confirm-hint" className="field-hint text-danger">Doesn&apos;t match the password above.</p>
            )}
          </div>
        )}

        <button type="submit" disabled={loading} className="btn-primary w-full">
          {loading ? "Please wait…" : mode === "login" ? "Sign in" : "Create account"}
        </button>
      </form>
    </div>
  );
}
