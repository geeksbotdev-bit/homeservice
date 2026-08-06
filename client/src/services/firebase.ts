/**
 * Firebase initialization (Auth + Firestore + Storage).
 *
 * Config is read from EXPO_PUBLIC_FIREBASE_* env vars (see .env.example).
 * Until you paste your project's keys, `isFirebaseConfigured` is false and the
 * app keeps running on mock data — nothing breaks.
 *
 * Where to get the keys:
 *   Firebase Console → Project settings (gear) → General → "Your apps" →
 *   Web app (</>) → SDK setup and configuration → "Config".
 */
import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';
import { getStorage, type FirebaseStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
};

/**
 * True when the minimum keys for Auth/Firestore/Storage are present.
 * appId is optional (only needed for Analytics/Installations), so we don't
 * require it — the connection works fine on apiKey + projectId.
 */
export const isFirebaseConfigured =
  !!firebaseConfig.apiKey && !!firebaseConfig.projectId;

let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let db: Firestore | null = null;
let storage: FirebaseStorage | null = null;

if (isFirebaseConfigured) {
  // Drop undefined keys (e.g. missing appId) so the SDK doesn't warn.
  const cfg = Object.fromEntries(Object.entries(firebaseConfig).filter(([, v]) => !!v)) as Record<string, string>;
  app = getApps().length ? getApp() : initializeApp(cfg);
  auth = getAuth(app);
  db = getFirestore(app);
  storage = getStorage(app);
  if (__DEV__) console.log(`[firebase] ✅ connected to project "${firebaseConfig.projectId}"`);
} else if (__DEV__) {
  console.log('[firebase] Not configured — running on mock data. Add EXPO_PUBLIC_FIREBASE_* keys to .env to enable.');
}

export { app, auth, db, storage };
