import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  sendPasswordResetEmail,
  signInAnonymously,
  signOut as fbSignOut,
  updateProfile as fbUpdateProfile,
  updateEmail as fbUpdateEmail,
  updatePassword as fbUpdatePassword,
  reauthenticateWithCredential,
  EmailAuthProvider,
  User as FirebaseUser,
} from "firebase/auth";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { auth, db, googleProvider, firebaseConfigured } from "@/lib/firebase";

function authNotConfiguredError(): Error {
  return new Error(
    "Authentication is not configured in this environment. Add the Firebase env vars (VITE_GOOGLE_API_KEY, VITE_FIREBASE_PROJECT_ID, VITE_FIREBASE_APP_ID) to enable sign-in.",
  );
}

export type AppRole = "admin" | "analyst" | "viewer";

export interface AppUser {
  id: string;
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL?: string | null;
  user_metadata: {
    display_name?: string | null;
    full_name?: string | null;
  };
}

interface AuthContextType {
  session: AppUser | null;
  user: AppUser | null;
  roles: AppRole[];
  loading: boolean;
  signOut: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, displayName?: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signInAsGuest: () => Promise<void>;
  sendPasswordReset: (email: string) => Promise<void>;
  updatePassword: (currentPassword: string, newPassword: string) => Promise<void>;
  hasPasswordProvider: () => boolean;
  hasRole: (role: AppRole) => boolean;
  updateProfile: (data: { displayName?: string; email?: string }) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function toAppUser(fb: FirebaseUser): AppUser {
  return {
    id: fb.uid,
    uid: fb.uid,
    email: fb.email,
    displayName: fb.displayName,
    photoURL: fb.photoURL,
    user_metadata: {
      display_name: fb.displayName,
      full_name: fb.displayName,
    },
  };
}

function withTimeout<T>(p: Promise<T>, ms: number, fallback: T): Promise<T> {
  return new Promise<T>((resolve) => {
    let done = false;
    const t = setTimeout(() => {
      if (!done) {
        done = true;
        resolve(fallback);
      }
    }, ms);
    p.then((v) => {
      if (!done) {
        done = true;
        clearTimeout(t);
        resolve(v);
      }
    }).catch(() => {
      if (!done) {
        done = true;
        clearTimeout(t);
        resolve(fallback);
      }
    });
  });
}

async function ensureUserDoc(fb: FirebaseUser, role: AppRole = "analyst"): Promise<AppRole[]> {
  const ref = doc(db, "users", fb.uid);
  const snap = await withTimeout(getDoc(ref), 4000, null as null | Awaited<ReturnType<typeof getDoc>>);
  if (!snap) return [role];
  if (!snap.exists()) {
    await withTimeout(
      setDoc(ref, {
        uid: fb.uid,
        email: fb.email,
        displayName: fb.displayName,
        photoURL: fb.photoURL,
        roles: [role],
        createdAt: serverTimestamp(),
      }),
      4000,
      undefined,
    );
    return [role];
  }
  const data = snap.data();
  return (data.roles as AppRole[]) ?? [role];
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null);
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!firebaseConfigured) {
      // No Firebase keys in this environment — render the app in unauthenticated mode.
      setUser(null);
      setRoles([]);
      setLoading(false);
      return;
    }

    // Handle Google redirect result on mount (in case user just came back from a Google sign-in redirect).
    getRedirectResult(auth).catch((err) => {
      console.warn("[auth] getRedirectResult error:", err);
    });

    const unsub = onAuthStateChanged(auth, (fb) => {
      if (fb) {
        // Set user immediately so the UI can react without waiting on Firestore.
        setUser(toAppUser(fb));
        setRoles(["analyst"]);
        setLoading(false);
        // Fetch real roles in the background; don't block the UI.
        ensureUserDoc(fb)
          .then((r) => setRoles(r))
          .catch(() => setRoles(["analyst"]));
      } else {
        setUser(null);
        setRoles([]);
        setLoading(false);
      }
    });
    return () => unsub();
  }, []);

  const signIn = async (email: string, password: string) => {
    if (!firebaseConfigured) throw authNotConfiguredError();
    await signInWithEmailAndPassword(auth, email, password);
  };

  const signUp = async (email: string, password: string, displayName?: string) => {
    if (!firebaseConfigured) throw authNotConfiguredError();
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    if (displayName) {
      await fbUpdateProfile(cred.user, { displayName });
    }
    await ensureUserDoc(cred.user);
  };

  const signInWithGoogle = async () => {
    if (!firebaseConfigured) throw authNotConfiguredError();
    try {
      const cred = await signInWithPopup(auth, googleProvider);
      ensureUserDoc(cred.user).catch(() => {});
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code ?? "";
      // Popups are blocked or unsupported inside the Replit preview iframe; fall back to redirect.
      if (
        code === "auth/popup-blocked" ||
        code === "auth/popup-closed-by-user" ||
        code === "auth/cancelled-popup-request" ||
        code === "auth/operation-not-supported-in-this-environment" ||
        code === "auth/unauthorized-domain"
      ) {
        await signInWithRedirect(auth, googleProvider);
        return;
      }
      throw err;
    }
  };

  const signInAsGuest = async () => {
    if (!firebaseConfigured) throw authNotConfiguredError();
    const cred = await signInAnonymously(auth);
    if (!cred.user.displayName) {
      try {
        await fbUpdateProfile(cred.user, { displayName: "Guest" });
      } catch {
        /* ignore */
      }
    }
    ensureUserDoc(cred.user, "viewer").catch(() => {});
  };

  const signOut = async () => {
    await fbSignOut(auth);
  };

  const sendPasswordReset = async (email: string) => {
    await sendPasswordResetEmail(auth, email);
  };

  const hasPasswordProvider = () =>
    !!auth.currentUser?.providerData.some((p) => p.providerId === "password");

  const updatePassword = async (currentPassword: string, newPassword: string) => {
    const cu = auth.currentUser;
    if (!cu || !cu.email) throw new Error("You must be signed in with email/password to change your password.");
    if (!hasPasswordProvider()) {
      throw new Error("Your account uses Google sign-in. Manage your password from your Google account.");
    }
    const cred = EmailAuthProvider.credential(cu.email, currentPassword);
    await reauthenticateWithCredential(cu, cred);
    await fbUpdatePassword(cu, newPassword);
  };

  const updateProfile = async (data: { displayName?: string; email?: string }) => {
    if (!auth.currentUser) return;
    if (data.displayName !== undefined) {
      await fbUpdateProfile(auth.currentUser, { displayName: data.displayName });
    }
    if (data.email && data.email !== auth.currentUser.email) {
      await fbUpdateEmail(auth.currentUser, data.email);
    }
    await setDoc(
      doc(db, "users", auth.currentUser.uid),
      {
        displayName: data.displayName ?? auth.currentUser.displayName,
        email: data.email ?? auth.currentUser.email,
        updatedAt: serverTimestamp(),
      },
      { merge: true },
    );
    setUser(toAppUser(auth.currentUser));
  };

  const hasRole = (role: AppRole) => roles.includes(role);

  return (
    <AuthContext.Provider
      value={{ session: user, user, roles, loading, signOut, signIn, signUp, signInWithGoogle, signInAsGuest, sendPasswordReset, updatePassword, hasPasswordProvider, hasRole, updateProfile }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
