import { setAuthToken } from './client';
import { signOutFirebase } from './firebaseAuth';
import { resetUnread } from '../store/unread';

// Screens/stores register here so a sign-out wipes the in-memory state that
// belongs to the person leaving (a booking draft, cached lists, …). Without
// this, the next person to sign in on the same device inherits it.
const resetHandlers = new Set<() => void>();

/** Register a reset to run on sign-out. Returns an unsubscribe function. */
export function onSessionReset(fn: () => void) {
  resetHandlers.add(fn);
  return () => { resetHandlers.delete(fn); };
}

/**
 * Full sign-out: clears the app token + role, wipes any in-progress booking
 * draft and other per-user state, and signs out of Firebase (so Google
 * re-login shows the account picker again). Safe to call regardless of how the
 * user signed in.
 */
export async function logout() {
  setAuthToken(null); // clears token + role (memory + localStorage)
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem('hs_booking_draft');
    }
  } catch { /* ignore */ }
  resetUnread();
  resetHandlers.forEach((fn) => { try { fn(); } catch { /* keep signing out */ } });
  try { await signOutFirebase(); } catch { /* ignore */ }
}
