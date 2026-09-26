import { create } from "zustand";
import { User, onAuthStateChanged, Unsubscribe } from "firebase/auth";
import { auth } from "./firebase";
import { syncEmailMap } from "./recovery";

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

// Setup listener (runs once on the client, guarded against HMR re-registration)
let _authUnsub: Unsubscribe | null = null;
if (typeof window !== "undefined" && !_authUnsub) {
  _authUnsub = onAuthStateChanged(auth, (user) => {
    useAuth.setState({ user, loading: false, initialized: true });
    // Keep account recovery able to find this account by its current email.
    if (user?.email) syncEmailMap(user.uid, user.email).catch(() => {});
  });
}
