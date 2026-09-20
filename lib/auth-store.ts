import { create } from "zustand";
import { User, onAuthStateChanged, Unsubscribe } from "firebase/auth";
import { auth } from "./firebase";

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
  });
}
