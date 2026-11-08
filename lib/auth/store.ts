import { create } from "zustand";
import type { User, Unsubscribe } from "firebase/auth";

interface AuthState {
  user: User | null;
  loading: boolean;
  initialized: boolean;
}

export const useAuth = create<AuthState>(() => ({
  user: null,
  loading: true,
  initialized: false,
}));

// Setup listener (runs once on the client, guarded against HMR re-registration).
// Firebase is loaded on demand so it stays out of the first bundle; until it
// answers, `initialized` stays false and the header shows no account controls.
let _authUnsub: Unsubscribe | null = null;
if (typeof window !== "undefined" && !_authUnsub) {
  void (async () => {
    try {
      const [{ auth }, { onAuthStateChanged }] = await Promise.all([
        import("@/lib/firebase"),
        import("firebase/auth"),
      ]);
      _authUnsub = onAuthStateChanged(auth, (user) => {
        useAuth.setState({ user, loading: false, initialized: true });
      });
    } catch {
      // Firebase unavailable (blocked or misconfigured): the app still searches.
      useAuth.setState({ loading: false, initialized: true });
    }
  })();
}
