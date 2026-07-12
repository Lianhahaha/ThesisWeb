import { create } from "zustand";
import { User, onAuthStateChanged } from "firebase/auth";
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

// Setup listener (runs once on the client)
if (typeof window !== "undefined") {
  onAuthStateChanged(auth, (user) => {
    useAuth.setState({ user, loading: false, initialized: true });
  });
}
