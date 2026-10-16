"use client";

import { useEffect, useState } from "react";
import { doc, setDoc } from "firebase/firestore";
import {
  EmailAuthProvider,
  reauthenticateWithCredential,
  sendEmailVerification,
  updatePassword,
  verifyBeforeUpdateEmail,
  type User,
} from "firebase/auth";
import { auth, db } from "@/lib/firebase";
import { cacheUsername } from "@/lib/auth/username-cache";
import { signOutAndForget } from "@/lib/auth/sign-out";
import { authMessage } from "@/lib/auth/errors";
import { hasPassword } from "@/lib/auth/google";
import { toast } from "@/components/Toaster";
import { PasswordField, Section } from "@/components/settings/parts";

/**
 * The signed-in account: email confirmation, display name, and, for email
 * accounts, password and email changes. The page owns the name and email
 * because its heading shows them.
 */
export function AccountSections({
  user,
  username,
  onUsername,
  email,
  onEmail,
}: {
  user: User;
  username: string;
  onUsername: (name: string) => void;
  email: string;
  onEmail: (email: string) => void;
}) {

  const [savingUsername, setSavingUsername] = useState(false);

  const [currentPass, setCurrentPass] = useState("");
  const [newPass, setNewPass] = useState("");
  const [confirmPass, setConfirmPass] = useState("");
  const [savingPass, setSavingPass] = useState(false);

  const [newEmail, setNewEmail] = useState("");
  const [emailPass, setEmailPass] = useState("");
  const [savingEmail, setSavingEmail] = useState(false);
  const [pendingEmail, setPendingEmail] = useState("");
  const [reloading, setReloading] = useState(false);

  // null until known, so the notice never flashes for verified accounts.
  const [verified, setVerified] = useState<boolean | null>(null);
  const [verifyBusy, setVerifyBusy] = useState(false);
  useEffect(() => setVerified(user.emailVerified), [user]);

  async function saveUsername(e: React.FormEvent) {
    e.preventDefault();
    const name = username.trim().slice(0, 60);
    if (!name) return;
    setSavingUsername(true);
    try {
      await setDoc(doc(db, "users", user.uid, "profile", "main"), { username: name }, { merge: true });
      cacheUsername(user.uid, name);
      toast("Display name updated", "success");
    } catch (err) {
      toast(err instanceof Error ? err.message : "Could not update the display name", "error");
    } finally {
      setSavingUsername(false);
    }
  }

  async function savePassword(e: React.FormEvent) {
    e.preventDefault();
    if (!user.email) return;
    if (!currentPass) { toast("Enter your current password first.", "error"); return; }
    if (newPass.length < 6) { toast("The new password must be at least 6 characters.", "error"); return; }
    if (newPass !== confirmPass) { toast("The two new passwords don't match.", "error"); return; }
    if (newPass === currentPass) { toast("The new password is the same as the current one.", "error"); return; }
    setSavingPass(true);
    try {
      await reauthenticateWithCredential(user, EmailAuthProvider.credential(user.email, currentPass));
      await updatePassword(user, newPass);
      setCurrentPass("");
      setNewPass("");
      setConfirmPass("");
      toast("Password updated", "success");
    } catch (err) {
      const code = (err as { code?: string })?.code;
      toast(
        code === "auth/invalid-credential" || code === "auth/wrong-password"
          ? "Your current password is wrong."
          : authMessage(err, "Could not update the password."),
        "error"
      );
    } finally {
      setSavingPass(false);
    }
  }

  async function saveEmail(e: React.FormEvent) {
    e.preventDefault();
    if (!user.email || !newEmail || !emailPass) return;
    if (newEmail.trim().toLowerCase() === user.email.toLowerCase()) {
      toast("That is already your email address.", "error");
      return;
    }
    setSavingEmail(true);
    try {
      await reauthenticateWithCredential(user, EmailAuthProvider.credential(user.email, emailPass));
      await verifyBeforeUpdateEmail(user, newEmail.trim().toLowerCase(), {
        url: `${window.location.origin}/settings`,
        handleCodeInApp: false,
      });
      setPendingEmail(newEmail.trim().toLowerCase());
      setNewEmail("");
      setEmailPass("");
      toast(`Verification link sent to ${newEmail}. Open it, then press Refresh here.`, "success");
    } catch (err) {
      const code = (err as { code?: string })?.code;
      toast(
        code === "auth/invalid-credential" || code === "auth/wrong-password"
          ? "Your current password is wrong."
          : authMessage(err, "Could not send the verification email."),
        "error"
      );
    } finally {
      setSavingEmail(false);
    }
  }

  async function reloadSession() {
    setReloading(true);
    try {
      await user.reload();
      const fresh = auth.currentUser;
      if (fresh?.email && fresh.email !== email) {
        onEmail(fresh.email);
        setPendingEmail("");
        toast("Email updated", "success");
      } else {
        toast("Email not changed yet. Make sure you opened the verification link.", "error");
      }
    } catch (err) {
      const code = (err as { code?: string })?.code;
      // Verifying the new address revokes this session, so reload fails. That
      // means the change went through.
      if (code === "auth/user-token-expired") {
        setPendingEmail("");
        toast("Email changed. Sign in again with your new address.", "success");
        await signOutAndForget(user.uid, { to: "/login", delayMs: 1500 });
        return;
      }
      toast(authMessage(err, "Refresh failed. Try again."), "error");
    } finally {
      setReloading(false);
    }
  }

  async function resendVerification() {
    setVerifyBusy(true);
    try {
      await sendEmailVerification(user);
      toast(`Verification link sent to ${user.email}.`, "success");
    } catch (err) {
      toast(authMessage(err, "Could not send the verification email."), "error");
    } finally {
      setVerifyBusy(false);
    }
  }

  async function checkVerified() {
    setVerifyBusy(true);
    try {
      await user.reload();
      const ok = !!auth.currentUser?.emailVerified;
      setVerified(ok);
      toast(ok ? "Email address confirmed" : "Not confirmed yet. Open the link in the email first.", ok ? "success" : "info");
    } catch (err) {
      toast(authMessage(err, "Could not check. Try again."), "error");
    } finally {
      setVerifyBusy(false);
    }
  }

  return (
    <>
      {verified === false && (
        <div role="status" className="notice notice-info">
          <p>
            <strong>Confirm your email address.</strong> Password reset links go to{" "}
            <strong className="break-all">{email}</strong>, so make sure it reaches you.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button onClick={resendVerification} disabled={verifyBusy} className="btn-secondary btn-sm">
              Send the link again
            </button>
            <button onClick={checkVerified} disabled={verifyBusy} className="btn-ghost btn-sm">
              I opened it
            </button>
          </div>
        </div>
      )}

      <Section title="Display name">
        <form onSubmit={saveUsername} className="flex flex-col gap-2 sm:flex-row">
          <label htmlFor="display-name" className="sr-only">Display name</label>
          <input
            id="display-name"
            className="input flex-1"
            value={username}
            maxLength={60}
            placeholder="Your display name"
            autoComplete="nickname"
            onChange={(e) => onUsername(e.target.value)}
          />
          <button type="submit" disabled={savingUsername} className="btn-primary">
            {savingUsername ? "Saving…" : "Save"}
          </button>
        </form>
      </Section>

      {!hasPassword(user) && (
        <Section title="Signed in with Google" description="Your password and recovery are handled by your Google account.">
          <p className="text-sm text-muted break-all">{user.email}</p>
        </Section>
      )}

      {hasPassword(user) && (
        <Section title="Change password">
          <form onSubmit={savePassword} className="space-y-4">
            <PasswordField id="cur-pass" label="Current password" value={currentPass} onChange={setCurrentPass} autoComplete="current-password" />
            <PasswordField id="new-pass" label="New password (at least 6 characters)" value={newPass} onChange={setNewPass} autoComplete="new-password" />
            <PasswordField id="confirm-pass" label="Confirm new password" value={confirmPass} onChange={setConfirmPass} autoComplete="new-password" />
            <button type="submit" disabled={savingPass} className="btn-primary w-full sm:w-auto">
              {savingPass ? "Updating…" : "Update password"}
            </button>
          </form>
        </Section>
      )}

      {hasPassword(user) && (
        <Section title="Change email" description="We send a link to the new address. Your email only changes after you open it.">
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
            <PasswordField id="email-pass" label="Current password, to confirm it is you" value={emailPass} onChange={setEmailPass} autoComplete="current-password" />
            <button type="submit" disabled={savingEmail} className="btn-primary w-full sm:w-auto">
              {savingEmail ? "Sending…" : "Send verification link"}
            </button>
          </form>
          {pendingEmail && (
            <div className="notice notice-info mt-4">
              <p>
                <strong>Waiting for verification.</strong> Open the link sent to{" "}
                <strong className="break-all">{pendingEmail}</strong>, then press the button below.
              </p>
              <button onClick={reloadSession} disabled={reloading} className="btn-secondary btn-sm mt-3">
                {reloading ? "Checking…" : "I opened the link. Refresh."}
              </button>
            </div>
          )}
        </Section>
      )}
    </>
  );
}
