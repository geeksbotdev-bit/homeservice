/**
 * Firebase Admin — used to (a) verify Google sign-in ID tokens and
 * (b) send FCM push notifications.
 *
 * Initializes only if a service-account credential is available
 * (GOOGLE_APPLICATION_CREDENTIALS). Without it, the server runs in
 * "dev-trust" mode: it trusts the client-supplied profile instead of
 * verifying the token — fine for local development, NOT for production.
 */
import admin from 'firebase-admin';

let ready = false;
try {
  if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    admin.initializeApp({ credential: admin.credential.applicationDefault() });
    ready = true;
    console.log('[firebase-admin] ✅ initialized (token verification + FCM enabled)');
  } else {
    console.log('[firebase-admin] ⚠️  no service account — running in dev-trust mode (tokens not verified)');
  }
} catch (e) {
  console.log('[firebase-admin] init skipped:', (e as Error).message);
}

export const firebaseReady = ready;

/** Verify a Firebase ID token; returns decoded claims, or null in dev-trust mode. */
export async function verifyIdToken(idToken: string) {
  if (!ready) return null;
  try {
    return await admin.auth().verifyIdToken(idToken);
  } catch {
    return null;
  }
}

/** Send an FCM push to a device token (no-op if admin not configured). */
export async function sendPush(token: string, title: string, body: string, data?: Record<string, string>) {
  if (!ready || !token) return;
  try {
    await admin.messaging().send({ token, notification: { title, body }, data });
  } catch (e) {
    console.log('[fcm] send failed:', (e as Error).message);
  }
}
