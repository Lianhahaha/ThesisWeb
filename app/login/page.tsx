"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
} from "firebase/auth";
import { doc, setDoc, getDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { useAuth } from "@/lib/auth-store";
import { toast } from "@/components/Toaster";
import { Eye, EyeOff, Loader2 } from "lucide-react";

const DEFAULT_MPIN = "0000";

async function hashMPIN(mpin: string): Promise<string> {
  const msgUint8 = new TextEncoder().encode(mpin);
  const hashBuffer = await crypto.subtle.digest("SHA-256", msgUint8);
  return Array.from(new Uint8Array(hashBuffer))
    .map(b => b.toString(16).padStart(2, "0"))
    .join("");
}

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
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <Loader2 className="animate-spin h-6 w-6 text-muted" />
      </div>
    );
  }

  if (user) return null;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email || !password) return;
    if (mode === "signup" && !username) return;

    setLoading(true);
    const pw = password.toLowerCase(); // case-insensitive

    try {
      if (mode === "login") {
        const cred = await signInWithEmailAndPassword(auth, email, pw);
        // Cache password locally so settings can pre-fill it
        localStorage.setItem(`tw_pw_${cred.user.uid}`, pw);
        toast("Welcome back!", "success");
        router.push("/library");

      } else {
        const cred = await createUserWithEmailAndPassword(auth, email, pw);
        const uid = cred.user.uid;
        const defaultMpinHash = await hashMPIN(DEFAULT_MPIN);
        const normalizedEmail = email.toLowerCase().replace(/\./g, "_");

        // Save profile — includes stored password and default MPIN
        await setDoc(doc(db, "users", uid, "profile", "main"), {
          username,
          storedPw: pw,
          mpinHash: defaultMpinHash,
          createdAt: Date.now(),
        });

        // Save email → uid lookup map (for forgot-password flow)
        await setDoc(doc(db, "email_map", normalizedEmail), { uid, email: email.toLowerCase() });

        // Cache locally
        localStorage.setItem(`tw_pw_${uid}`, pw);
        localStorage.setItem(`tw_username_${uid}`, username);

        toast("Account created successfully!", "success");
        router.push("/library");
      }
    } catch (err: any) {
      toast(err.message || "Authentication failed", "error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-[400px] mx-auto mt-12 p-6 rounded-lg border bg-surface border-border">
      <h1 className="text-xl font-semibold text-text text-center mb-6">
        {mode === "login" ? "Sign in to ThesisWeb" : "Create an account"}
      </h1>

      <div className="flex gap-2 mb-6">
        <button
          className={`flex-1 py-1.5 text-sm font-medium border-b-2 transition-colors ${mode === "login" ? "border-brand-500 text-text" : "border-transparent text-muted hover:text-text"}`}
          onClick={() => setMode("login")}
        >
          Sign In
        </button>
        <button
          className={`flex-1 py-1.5 text-sm font-medium border-b-2 transition-colors ${mode === "signup" ? "border-brand-500 text-text" : "border-transparent text-muted hover:text-text"}`}
          onClick={() => setMode("signup")}
        >
          Sign Up
        </button>
      </div>

      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        {mode === "signup" && (
          <div>
            <label className="block text-xs font-medium text-text mb-1">Username</label>
            <input
              required
              autoFocus
              className="input w-full"
              placeholder="e.g. Researcher123"
              value={username}
              onChange={e => setUsername(e.target.value)}
            />
          </div>
        )}

        <div>
          <label className="block text-xs font-medium text-text mb-1">Email address</label>
          <input
            type="email"
            required
            className="input w-full"
            placeholder="you@example.com"
            value={email}
            onChange={e => setEmail(e.target.value)}
          />
        </div>

        <div>
          <div className="flex justify-between items-end mb-1">
            <label className="block text-xs font-medium text-text">Password (case insensitive)</label>
            {mode === "login" && (
              <button
                type="button"
                onClick={() => router.push("/forgot-password")}
                className="text-[11px] text-brand-500 hover:underline"
              >
                Forgot password?
              </button>
            )}
          </div>
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              required
              minLength={6}
              className="input w-full pr-9"
              placeholder="••••••••"
              value={password}
              onChange={e => setPassword(e.target.value)}
            />
            <button
              type="button"
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted hover:text-text p-1"
              onClick={() => setShowPassword(!showPassword)}
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          {mode === "signup" && (
            <p className="text-[10px] text-muted mt-1.5">
              <strong className="text-amber-500">Do not use your real Gmail password here!</strong>{" "}
              Create a brand new password just for ThesisWeb. Min 6 characters.
              <br />
              <span className="text-muted/70">Default recovery MPIN will be <strong className="text-text">0000</strong> — change it in Settings after signing in.</span>
            </p>
          )}
        </div>

        <button type="submit" disabled={loading} className="btn-primary w-full mt-2 justify-center">
          {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
          {mode === "login" ? "Sign in" : "Create account"}
        </button>
      </form>
    </div>
  );
}
