"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { deleteDoc, doc } from "firebase/firestore";
import { deleteUser, EmailAuthProvider, reauthenticateWithCredential, sendPasswordResetEmail, signOut, type User } from "firebase/auth";
import { auth, db } from "@/lib/firebase";
import { clearCachedUsername } from "@/lib/auth/username-cache";
import { authMessage } from "@/lib/auth/errors";
import { confirmWithGoogle, googleErrorMessage, hasPassword } from "@/lib/auth/google";
import { fsDeleteAllPapers } from "@/lib/library/firestore";
import { GoogleButton } from "@/components/GoogleButton";
import { toast } from "@/components/Toaster";
import { PasswordField, Section } from "@/components/settings/parts";

/** Reset link, sign out and account deletion, for a signed-in account. */
export function AccountActions({ user }: { user: User }) {
  const router = useRouter();
  const [resetBusy, setResetBusy] = useState(false);
  const [deletePass, setDeletePass] = useState("");
  const [deleting, setDeleting] = useState(false);

  async function sendResetLink() {
    if (!user.email) return;
    setResetBusy(true);
    try {
      await sendPasswordResetEmail(auth, user.email, { url: `${window.location.origin}/login` });
      toast(`Reset link sent to ${user.email}.`, "success");
    } catch (err) {
      toast(authMessage(err, "Could not send the reset link. Try again."), "error");
    } finally {
      setResetBusy(false);
    }
  }

  async function deleteAccount(e?: React.FormEvent) {
    e?.preventDefault();
    const withPassword = hasPassword(user);
    if (withPassword && !deletePass) { toast("Enter your password to confirm.", "error"); return; }
    if (!window.confirm("Delete your account and every paper, note and matrix saved in it? This cannot be undone.")) return;
    setDeleting(true);
    try {
      // Re-authenticate first: deleteUser refuses an old session, and a wrong
      // password (or a different Google account) should stop everything
      // before any data is removed.
      try {
        if (withPassword && user.email) {
          await reauthenticateWithCredential(user, EmailAuthProvider.credential(user.email, deletePass));
        } else {
          await confirmWithGoogle(user);
        }
      } catch (err) {
        const message = withPassword ? null : googleErrorMessage(err);
        if (!withPassword && !message) return; // closed the Google window
        throw message ? new Error(message) : err;
      }
      const uid = user.uid;
      await fsDeleteAllPapers(uid);
      await deleteDoc(doc(db, "users", uid, "profile", "main")).catch(() => {});
      await deleteUser(user);
      clearCachedUsername(uid);
      toast("Your account has been deleted", "success");
      router.push("/");
    } catch (err) {
      const code = (err as { code?: string })?.code;
      toast(
        code === "auth/invalid-credential" || code === "auth/wrong-password"
          ? "Your password is wrong."
          : err instanceof Error && !code
          ? err.message
          : authMessage(err, "Could not delete the account. Try again."),
        "error"
      );
    } finally {
      setDeleting(false);
    }
  }

  async function handleSignOut() {
    clearCachedUsername(user.uid);
    await signOut(auth);
    router.push("/");
  }

  return (
    <>
      {hasPassword(user) && (
        <Section title="Forgot your password?" description={`We email a link to ${user.email ?? "your address"} to set a new one.`}>
          <button onClick={sendResetLink} disabled={resetBusy} className="btn-secondary">
            {resetBusy ? "Sending…" : "Email me a reset link"}
          </button>
        </Section>
      )}
      <Section title="Sign out" description="Your saved papers stay in your account.">
        <button onClick={handleSignOut} className="btn-danger w-full sm:w-auto">Sign out of Thesisweb</button>
      </Section>
      <Section
        title="Delete account"
        description="Removes your account, saved papers, notes and matrix for good. Download a library backup first if you want to keep anything."
      >
        {hasPassword(user) ? (
          <form onSubmit={deleteAccount} className="space-y-4">
            <PasswordField id="delete-pass" label="Password, to confirm it is you" value={deletePass} onChange={setDeletePass} autoComplete="current-password" />
            <button type="submit" disabled={deleting} className="btn-danger w-full sm:w-auto">
              {deleting ? "Deleting…" : "Delete my account"}
            </button>
          </form>
        ) : (
          <div className="max-w-xs">
            <GoogleButton onClick={() => deleteAccount()} busy={deleting} label="Confirm with Google and delete" />
          </div>
        )}
      </Section>
    </>
  );
}
