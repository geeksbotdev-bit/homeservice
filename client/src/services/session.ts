import { setAuthToken } from './client';
import { signOutFirebase } from './firebaseAuth';

/**
 * Full sign-out: clears the app token + role, wipes any in-progress booking
 * draft, and signs out of Firebase (so Google re-login shows the account
 * picker again). Safe to call regardless of how the user signed in.
 */
export async function logout() {
  setAuthToken(null); // clears token + role (memory + localStorage)
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem('hs_booking_draft');
    }
  } catch { /* ignore */ }
  try { await signOutFirebase(); } catch { /* ignore */ }
}
