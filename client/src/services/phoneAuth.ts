/**
 * Firebase Phone Auth (real SMS OTP).
 *
 * WEB: uses an invisible reCAPTCHA + signInWithPhoneNumber → a real SMS is
 *      sent to the number. confirmOtp() verifies the entered code.
 * NATIVE (Expo Go / APK): the Firebase JS SDK needs reCAPTCHA/native modules,
 *      so sendOtp() reports `web: false` and the caller falls back to the
 *      backend OTP path. (Native real-SMS needs a dev build — future step.)
 */
import { Platform } from 'react-native';
import {
  RecaptchaVerifier,
  signInWithPhoneNumber,
  type ConfirmationResult,
} from 'firebase/auth';
import { auth, isFirebaseConfigured } from './firebase';

let confirmation: ConfirmationResult | null = null;
let verifier: RecaptchaVerifier | null = null;

const isWeb = Platform.OS === 'web';

/** Ensure a DOM container + invisible reCAPTCHA verifier exist (web only). */
function getVerifier(): RecaptchaVerifier {
  if (verifier) return verifier;
  // Create a hidden container for the invisible reCAPTCHA widget.
  let el = document.getElementById('recaptcha-container');
  if (!el) {
    el = document.createElement('div');
    el.id = 'recaptcha-container';
    el.style.position = 'absolute';
    el.style.bottom = '0';
    el.style.left = '0';
    document.body.appendChild(el);
  }
  verifier = new RecaptchaVerifier(auth!, 'recaptcha-container', { size: 'invisible' });
  return verifier;
}

/**
 * Send an OTP SMS. Returns { web: true } when a real SMS was sent (web),
 * or { web: false } when the caller should use the backend fallback (native).
 */
export async function sendOtp(phoneE164: string): Promise<{ web: boolean }> {
  if (!isFirebaseConfigured || !auth || !isWeb) return { web: false };
  const appVerifier = getVerifier();
  confirmation = await signInWithPhoneNumber(auth, phoneE164, appVerifier);
  return { web: true };
}

/** Confirm the SMS code → returns the Firebase ID token for backend exchange. */
export async function confirmOtp(code: string): Promise<{ idToken: string; phone: string | null; name: string | null }> {
  if (!confirmation) throw new Error('No OTP in progress — request a code first.');
  const cred = await confirmation.confirm(code);
  const idToken = await cred.user.getIdToken();
  return { idToken, phone: cred.user.phoneNumber, name: cred.user.displayName };
}

/** True when a Firebase SMS confirmation is pending (i.e. web flow in progress). */
export function hasPendingOtp(): boolean {
  return !!confirmation;
}

export function resetOtp() {
  confirmation = null;
}
