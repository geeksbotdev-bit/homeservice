/**
 * Firebase Auth helpers (ready to use once Google/Phone sign-in is enabled
 * in the Firebase console). Works on web today; native Google sign-in needs
 * expo-auth-session (added when we wire the screens on a dev build).
 *
 * These functions no-op safely if Firebase isn't configured, so the app
 * keeps running on mock auth until you switch over.
 */
import { Platform } from 'react-native';
import {
  GoogleAuthProvider,
  signInWithPopup,
  onAuthStateChanged,
  signOut,
  type User as FbUser,
} from 'firebase/auth';
import { auth, isFirebaseConfigured } from './firebase';

/** Google sign-in. Web uses a popup; native is wired later via expo-auth-session. */
export async function signInWithGoogle(): Promise<FbUser | null> {
  if (!isFirebaseConfigured || !auth) {
    throw new Error('Firebase not configured — add EXPO_PUBLIC_FIREBASE_* keys to .env');
  }
  if (Platform.OS === 'web') {
    const provider = new GoogleAuthProvider();
    const cred = await signInWithPopup(auth, provider);
    return cred.user;
  }
  // Native path is added when we build the dev client (expo-auth-session +
  // signInWithCredential). Kept explicit so it's obvious what's pending.
  throw new Error('Native Google sign-in requires a dev build — coming when we wire the screens.');
}

/** Subscribe to auth state; returns an unsubscribe fn. */
export function onAuthChange(cb: (user: FbUser | null) => void): () => void {
  if (!isFirebaseConfigured || !auth) {
    cb(null);
    return () => {};
  }
  return onAuthStateChanged(auth, cb);
}

/** Sign out of Firebase (safe if not configured). */
export async function signOutFirebase(): Promise<void> {
  if (auth) await signOut(auth);
}
