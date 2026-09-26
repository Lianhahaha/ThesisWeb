/**
 * Firebase Auth error codes in plain words. Without this, users see raw
 * strings like "Firebase: Error (auth/operation-not-allowed)."
 */
export function authMessage(err: unknown, fallback = "Something went wrong. Try again."): string {
  const code = (err as { code?: string })?.code ?? "";
  switch (code) {
    case "auth/invalid-credential":
    case "auth/invalid-login-credentials":
    case "auth/wrong-password":
    case "auth/user-not-found":
      return "Wrong email or password.";
    case "auth/email-already-in-use":
      return "An account with this email already exists. Sign in instead.";
    case "auth/invalid-email":
    case "auth/missing-email":
      return "That email address doesn't look right.";
    case "auth/missing-password":
      return "Enter your password.";
    case "auth/weak-password":
    case "auth/password-does-not-meet-requirements":
      return "That password is too weak. Choose a longer one.";
    case "auth/user-disabled":
      return "This account has been disabled. Contact us if you think this is a mistake.";
    case "auth/too-many-requests":
      return "Too many attempts. Wait a few minutes and try again.";
    case "auth/network-request-failed":
      return "No connection. Check your internet and try again.";
    case "auth/requires-recent-login":
    case "auth/user-token-expired":
      return "For your security, sign in again and retry.";
    case "auth/operation-not-allowed":
      return "Email sign-in is turned off for this site right now. Try again later.";
    case "auth/unauthorized-continue-uri":
    case "auth/unauthorized-domain":
      return "This site isn't set up to send account emails yet. Try again later.";
    case "auth/quota-exceeded":
      return "We've hit today's limit for account emails. Try again tomorrow.";
    case "auth/internal-error":
      return "The sign-in service had a problem. Try again in a moment.";
    default:
      return fallback;
  }
}
