/**
 * HTTP client + mock switch + persisted session.
 *
 * Session (token + role) is persisted cross-platform so a relaunch keeps the
 * user signed in: web → localStorage, native → AsyncStorage. Nothing is stored
 * synchronously on native, so `restoreSession()` must run (and be awaited) at
 * app start before routing decides Welcome vs. the app.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

export const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:4000';
export const USE_MOCKS = (process.env.EXPO_PUBLIC_USE_MOCKS ?? 'true') !== 'false';

const TOKEN_KEY = 'hs_auth_token';
const ROLE_KEY = 'hs_role';
const isWeb = Platform.OS === 'web';

let authToken: string | null = null;
let userRole: string | null = null;
let restored = false;

// Cross-platform persistence helpers (web localStorage is synchronous; native
// AsyncStorage is async — writes are fire-and-forget, reads happen in restore).
function persist(key: string, value: string | null) {
  try {
    if (isWeb) {
      if (typeof localStorage !== 'undefined') {
        if (value === null) localStorage.removeItem(key);
        else localStorage.setItem(key, value);
      }
    } else {
      if (value === null) AsyncStorage.removeItem(key).catch(() => {});
      else AsyncStorage.setItem(key, value).catch(() => {});
    }
  } catch { /* ignore */ }
}

/** Load the persisted session into memory. Await this once at app start. */
export async function restoreSession(): Promise<void> {
  if (restored) return;
  try {
    if (isWeb) {
      if (typeof localStorage !== 'undefined') {
        authToken = localStorage.getItem(TOKEN_KEY);
        userRole = localStorage.getItem(ROLE_KEY);
      }
    } else {
      const [[, t], [, r]] = await AsyncStorage.multiGet([TOKEN_KEY, ROLE_KEY]);
      authToken = t ?? null;
      userRole = r ?? null;
    }
  } catch { /* ignore */ }
  restored = true;
}

export function setAuthToken(token: string | null) {
  authToken = token;
  persist(TOKEN_KEY, token);
  if (!token) { userRole = null; persist(ROLE_KEY, null); }
}

export function setUserRole(role: string | null) {
  userRole = role;
  persist(ROLE_KEY, role);
}

export function getAuthToken() { return authToken; }
export function getUserRole() { return userRole; }
/** True when the signed-in account is a professional (cleaner). */
export function isPro() { return userRole === 'pro' || userRole === 'professional'; }

// The app registers a handler so a 401 (expired/stale token) bounces to login.
let onUnauthorized: (() => void) | null = null;
export function setUnauthorizedHandler(fn: (() => void) | null) {
  onUnauthorized = fn;
}

export function isAuthed() {
  return !!authToken;
}

/** Simulate network latency so loading states are visible in mock mode. */
export function delay<T>(value: T, ms = 600): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), ms));
}

export class NetworkError extends Error {
  constructor() { super('No internet connection. Please check your network and try again.'); this.name = 'NetworkError'; }
}

export async function request<T>(
  path: string,
  options: { method?: string; body?: unknown } = {},
): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, {
      method: options.method ?? 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
      },
      body: options.body ? JSON.stringify(options.body) : undefined,
    });
  } catch {
    // fetch throws (TypeError) when the device is offline / can't reach the server.
    throw new NetworkError();
  }
  if (!res.ok) {
    // Only a REAL session-expiry (we had a token) bounces to login. A 401 on a
    // pre-login call (no token — e.g. a background poller before sign-in) must
    // NOT redirect, or the user gets kicked back to Welcome from the login flow.
    if (res.status === 401) {
      const hadToken = !!authToken;
      setAuthToken(null);
      if (hadToken) onUnauthorized?.();
    }
    const msg = await res.text().catch(() => res.statusText);
    throw new Error(`API ${res.status}: ${msg}`);
  }
  return res.json() as Promise<T>;
}
