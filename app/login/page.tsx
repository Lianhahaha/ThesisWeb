"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import { Eye, EyeOff } from "lucide-react";
import { auth, db } from "@/lib/firebase";
import { useAuth } from "@/lib/auth-store";
import { toast } from "@/components/Toaster";
import { hashMPIN } from "@/lib/utils";

const DEFAULT_MPIN = "0000";

export default function LoginPage() {
  const router = useRouter();
  const { user, initialized } = useAuth();

  const [mode, setMode] = useState<"login" | "signup">("login");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");

  useEffect(() => {
    if (initialized && user) router.replace("/library");
  }, [initialized, user, router]);

  if (!initialized) {
    return <p role="status" className="py-20 text-center text-muted">Loading…</p>;
  }
  if (user) return null;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email || !password) return;
    if (mode === "signup" && !username) return;

    setLoading(true);
    try {
      if (mode === "login") {
        await signInWithEmailAndPassword(auth, email, password);
        toast("Signed in", "success");
        router.push("/library");
      } else {
        const cred = await createUserWithEmailAndPassword(auth, email, password);
        const uid = cred.user.uid;
        const normalizedEmail = email.toLowerCase().replace(/\./g, "_");

        // Profile holds the display name and a hashed recovery PIN. Never a password.
        await setDoc(doc(db, "users", uid, "profile", "main"), {
          username,
          mpinHash: await hashMPIN(DEFAULT_MPIN),
          createdAt: Date.now(),
        });
        // email → uid map, used by the forgot-password flow.
        await setDoc(doc(db, "email_map", normalizedEmail), { uid, email: email.toLowerCase() });

        localStorage.setItem(`tw_username_${uid}`, username);
        toast("Account created", "success");
        router.push("/library");
      }
    } catch (err) {
      toast(err instanceof Error ? err.message : "Authentication failed", "error");
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

      <div className="seg mt-6 w-full" role="group" aria-label="Sign in or sign up">
        <button type="button" className="flex-1" data-on={mode === "login"} onClick={() => setMode("login")}>
          Sign in
        </button>
        <button type="button" className="flex-1" data-on={mode === "signup"} onClick={() => setMode("signup")}>
          Sign up
        </button>
      </div>

      <form onSubmit={onSubmit} className="panel mt-4 space-y-4">
        {mode === "signup" && (
          <div>
            <label htmlFor="username" className="field-label">Display name</label>
            <input
              id="username"
              required
              autoFocus
              autoComplete="nickname"
              className="input"
              placeholder="e.g. Lian"
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
          <p className="notice notice-info">
            Your recovery PIN starts as <strong>0000</strong>. Change it in Account settings once
            you are signed in.
          </p>
        )}

        <button type="submit" disabled={loading} className="btn-primary w-full">
          {loading ? "Please wait…" : mode === "login" ? "Sign in" : "Create account"}
        </button>
      </form>
    </div>
  );
}
