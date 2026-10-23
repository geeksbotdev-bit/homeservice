/**
 * Firebase Auth helpers.
 *
 * Web signs in with a popup. Native cannot: Firebase's popup/redirect flow has
 * no browser to use, so Android and iOS open Google's consent page through
 * expo-auth-session and exchange the returned id_token for a Firebase
 * credential. That needs OAuth client IDs of its own — see GOOGLE_* below.
 */
import { Platform } from 'react-native';
import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import {
  GoogleAuthProvider,
  signInWithPopup,
  signInWithCredential,
  onAuthStateChanged,
  signOut,
  type User as FbUser,
} from 'firebase/auth';
import { auth, isFirebaseConfigured } from './firebase';

// Finishes the browser session when the user is redirected back to the app.
WebBrowser.maybeCompleteAuthSession();

/**
 * OAuth client IDs from Google Cloud (the Firebase project's own credentials).
 * The Android client must be registered against this app's package name AND
 * the signing certificate's SHA-1, or Google rejects the request — which is
 * why the button stays hidden on native until these are set.
 */
const GOOGLE_ANDROID_ID = process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID ?? '';
const GOOGLE_IOS_ID = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID ?? '';
const GOOGLE_WEB_ID = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ?? '';

const nativeClientId = Platform.OS === 'ios' ? GOOGLE_IOS_ID : GOOGLE_ANDROID_ID;

/**
 * Whether the Google button can actually do anything here.
 *
 * Showing a button that always throws is worse than not showing it, so the
 * sign-in screens ask this first.
 */
export const canUseGoogle =
  isFirebaseConfigured && (Platform.OS === 'web' ? true : !!nativeClientId);

/** Google sign-in: popup on web, system browser on Android/iOS. */
export async function signInWithGoogle(): Promise<FbUser | null> {
  if (!isFirebaseConfigured || !auth) {
    throw new Error('Firebase is not configured — add the EXPO_PUBLIC_FIREBASE_* keys.');
  }

  if (Platform.OS === 'web') {
    const provider = new GoogleAuthProvider();
    const cred = await signInWithPopup(auth, provider);
    return cred.user;
  }

  if (!nativeClientId) {
    throw new Error('Google sign-in is not set up for the app yet. Please use your phone number.');
  }

  // Ask Google for an id_token directly (implicit flow): there is no app
  // secret on a phone, so the code-exchange flow has nothing safe to sign with.
  const redirectUri = AuthSession.makeRedirectUri({ scheme: 'homeservice' });
  const request = new AuthSession.AuthRequest({
    clientId: nativeClientId,
    redirectUri,
    responseType: AuthSession.ResponseType.IdToken,
    scopes: ['openid', 'profile', 'email'],
    // Google requires a nonce for an id_token response.
    extraParams: { nonce: Math.random().toString(36).slice(2) + Date.now().toString(36) },
  });

  const result = await request.promptAsync({
    authorizationEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
  });

  if (result.type === 'dismiss' || result.type === 'cancel') return null;
  if (result.type !== 'success') {
    throw new Error('Google sign-in did not complete. Please try again.');
  }

  const idToken = result.params?.id_token;
  if (!idToken) throw new Error('Google did not return a sign-in token.');

  // The web client id is the audience Firebase expects; fall back to the
  // native one for projects that only have the single credential.
  const credential = GoogleAuthProvider.credential(idToken);
  const cred = await signInWithCredential(auth, credential);
  return cred.user;
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
