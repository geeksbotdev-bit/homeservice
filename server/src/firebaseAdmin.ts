/**
 * Firebase Admin — used to (a) verify Google sign-in ID tokens and
 * (b) send FCM push notifications.
 *
 * firebase-admin is imported LAZILY (dynamic import inside the functions) so a
 * heavy/native CJS module never runs at module-load time — important on
 * serverless (Vercel), where a top-level import failure crashes the whole
 * function. Without GOOGLE_APPLICATION_CREDENTIALS the server runs in
 * "dev-trust" mode and firebase-admin is never even loaded.
 */

let adminMod: any = null;
let ready = false;
let initTried = false;

async function getAdmin(): Promise<any | null> {
  if (!process.env.GOOGLE_APPLICATION_CREDENTIALS) return null; // dev-trust mode
  if (initTried) return ready ? adminMod : null;
  initTried = true;
  try {
    adminMod = (await import('firebase-admin')).default;
    adminMod.initializeApp({ credential: adminMod.credential.applicationDefault() });
    ready = true;
    console.log('[firebase-admin] ✅ initialized (token verification + FCM enabled)');
    return adminMod;
  } catch (e) {
    console.log('[firebase-admin] init skipped:', (e as Error).message);
    return null;
  }
}

export const firebaseReady = false;

/** Verify a Firebase ID token; returns decoded claims, or null in dev-trust mode. */
export async function verifyIdToken(idToken: string) {
  const admin = await getAdmin();
  if (!admin) return null;
  try {
    return await admin.auth().verifyIdToken(idToken);
  } catch {
    return null;
  }
}

/** Send an FCM push to a device token (no-op if admin not configured). */
export async function sendPush(token: string, title: string, body: string, data?: Record<string, string>) {
  if (!token) return;
  const admin = await getAdmin();
  if (!admin) return;
  try {
    await admin.messaging().send({ token, notification: { title, body }, data });
  } catch (e) {
    console.log('[fcm] send failed:', (e as Error).message);
  }
}
