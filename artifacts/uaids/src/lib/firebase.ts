import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import {
  getAuth,
  GoogleAuthProvider,
  type Auth,
  type Unsubscribe,
} from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore";

const apiKey =
  (import.meta.env.VITE_FIREBASE_API_KEY as string) ||
  (import.meta.env.GOOGLE_API_KEY as string) ||
  "";
const projectId = (import.meta.env.VITE_FIREBASE_PROJECT_ID as string) || "";
const appId = (import.meta.env.VITE_FIREBASE_APP_ID as string) || "";
const messagingSenderId =
  (import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID as string) || "";
const measurementId =
  (import.meta.env.VITE_FIREBASE_MEASUREMENT_ID as string) || "";
const storageBucket =
  (import.meta.env.VITE_FIREBASE_STORAGE_BUCKET as string) ||
  (projectId ? `${projectId}.firebasestorage.app` : "");

export const firebaseConfigured = Boolean(apiKey && projectId && appId);

const firebaseConfig = {
  apiKey,
  authDomain:
    (import.meta.env.VITE_FIREBASE_AUTH_DOMAIN as string) ||
    (projectId ? `${projectId}.firebaseapp.com` : ""),
  projectId,
  storageBucket,
  appId,
  ...(messagingSenderId ? { messagingSenderId } : {}),
  ...(measurementId ? { measurementId } : {}),
};

function authNotConfiguredError(): Error {
  return new Error(
    "Authentication is not configured. Add Firebase env vars (VITE_FIREBASE_API_KEY, VITE_FIREBASE_PROJECT_ID, VITE_FIREBASE_APP_ID).",
  );
}

function makeStubAuth(): Auth {
  const stub = {
    currentUser: null,
    onAuthStateChanged: ((cb: (u: null) => void): Unsubscribe => {
      try {
        cb(null);
      } catch {
        /* ignore */
      }
      return () => {};
    }) as unknown as Auth["onAuthStateChanged"],
    signOut: async () => {},
    setPersistence: async () => {},
    languageCode: null,
    tenantId: null,
    settings: {},
  } as unknown as Auth;
  return stub;
}

function makeStubFirestore(): Firestore {
  const handler: ProxyHandler<object> = {
    get() {
      throw authNotConfiguredError();
    },
  };
  return new Proxy({}, handler) as unknown as Firestore;
}

let _firebaseApp: FirebaseApp | null = null;
let _auth: Auth;
let _db: Firestore;
let _googleProvider: GoogleAuthProvider;

if (firebaseConfigured) {
  try {
    _firebaseApp = getApps().length ? getApp() : initializeApp(firebaseConfig);
    _auth = getAuth(_firebaseApp);
    _db = getFirestore(_firebaseApp);
    _googleProvider = new GoogleAuthProvider();
    _googleProvider.setCustomParameters({ prompt: "select_account" });
  } catch (err) {
    console.warn("[firebase] init failed; running in unauthenticated mode:", err);
    _auth = makeStubAuth();
    _db = makeStubFirestore();
    _googleProvider = new GoogleAuthProvider();
  }
} else {
  console.warn(
    "[firebase] env vars not set — running in unauthenticated mode. Add VITE_FIREBASE_API_KEY, VITE_FIREBASE_PROJECT_ID, VITE_FIREBASE_APP_ID to enable sign-in.",
  );
  _auth = makeStubAuth();
  _db = makeStubFirestore();
  _googleProvider = new GoogleAuthProvider();
}

export const firebaseApp = _firebaseApp;
export const auth = _auth;
export const db = _db;
export const googleProvider = _googleProvider;
