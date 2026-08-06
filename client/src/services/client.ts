/**
 * HTTP client + mock switch.
 *
 * Today the app runs on in-memory mock data (USE_MOCKS = true).
 * When the Node/PostgreSQL backend is ready:
 *   1. Set EXPO_PUBLIC_USE_MOCKS=false in .env
 *   2. Set EXPO_PUBLIC_API_URL to your server, e.g. https://api.homeservice.pk
 *   3. Every function in api.ts already calls request() — no screen changes needed.
 */

export const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:4000';
export const USE_MOCKS = (process.env.EXPO_PUBLIC_USE_MOCKS ?? 'true') !== 'false';

const TOKEN_KEY = 'hs_auth_token';
const ROLE_KEY = 'hs_role';

// Restore a persisted session on load (web: localStorage) so a refresh or
// relaunch keeps the user signed in instead of forcing a re-login.
let authToken: string | null = null;
let userRole: string | null = null;
try {
  if (typeof localStorage !== 'undefined') {
    authToken = localStorage.getItem(TOKEN_KEY);
    userRole = localStorage.getItem(ROLE_KEY);
  }
} catch {}

export function setAuthToken(token: string | null) {
  authToken = token;
  try {
    if (typeof localStorage !== 'undefined') {
      if (token) localStorage.setItem(TOKEN_KEY, token);
      else { localStorage.removeItem(TOKEN_KEY); localStorage.removeItem(ROLE_KEY); }
    }
  } catch {}
  if (!token) userRole = null;
}

export function setUserRole(role: string | null) {
  userRole = role;
  try {
    if (typeof localStorage !== 'undefined') {
      if (role) localStorage.setItem(ROLE_KEY, role);
      else localStorage.removeItem(ROLE_KEY);
    }
  } catch {}
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

export async function request<T>(
  path: string,
  options: { method?: string; body?: unknown } = {},
): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    method: options.method ?? 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  if (!res.ok) {
    // Stale/expired token → clear it and let the app return to login.
    if (res.status === 401) { setAuthToken(null); onUnauthorized?.(); }
    const msg = await res.text().catch(() => res.statusText);
    throw new Error(`API ${res.status}: ${msg}`);
  }
  return res.json() as Promise<T>;
}
