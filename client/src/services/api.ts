/**
 * API surface for the Client App.
 * Each function returns mock data when USE_MOCKS is true, otherwise calls the
 * real backend endpoint (commented next to each — this is the future API spec).
 */
import { USE_MOCKS, delay, request } from './client';
import {
  SERVICES, CLEANERS, BOOKINGS, CONVERSATIONS, MESSAGES, USER, NOTIFICATIONS, HOMESERVICE_FEE_PCT,
} from '../data/mock';
import type { Service, Cleaner, Booking, Conversation, ChatMessage, User, AppNotification } from '../data/types';

// ─── Auth ──────────────────────────────────────────────────────────────
export const auth = {
  // POST /auth/request-otp { phone }
  requestOtp: (phone: string) =>
    USE_MOCKS ? delay({ ok: true, ttl: 42 }) : request('/auth/request-otp', { method: 'POST', body: { phone } }),

  // POST /auth/verify-otp { phone, code, role } -> { token, user, isNew }
  verifyOtp: (phone: string, code: string, role: 'client' | 'professional' = 'client') =>
    USE_MOCKS
      ? delay({ token: 'mock-jwt-token', user: { ...USER, role }, isNew: false })
      : request<AuthResult>('/auth/verify-otp', { method: 'POST', body: { phone, code, role } }),

  // POST /auth/google { idToken, name, email } -> { token, user, isNew }
  google: (idToken: string, name?: string, email?: string) =>
    USE_MOCKS
      ? delay({ token: 'mock-jwt-token', user: { ...USER, name: name ?? USER.name, email }, isNew: false })
      : request<AuthResult>('/auth/google', { method: 'POST', body: { idToken, name, email } }),

  // POST /auth/firebase { idToken, phone, name } -> { token, user, isNew }
  firebase: (idToken: string, phone?: string | null, name?: string | null) =>
    USE_MOCKS
      ? delay({ token: 'mock-jwt-token', user: { ...USER, phone: phone ?? USER.phone }, isNew: false })
      : request<AuthResult>('/auth/firebase', { method: 'POST', body: { idToken, phone, name } }),
};

export interface AuthResult { token: string; user: User; isNew: boolean }

// ─── Services catalogue ────────────────────────────────────────────────
export const services = {
  // GET /services
  list: () => (USE_MOCKS ? delay(SERVICES, 300) : request<Service[]>('/services')),
  // GET /services/:id
  get: (id: string) =>
    USE_MOCKS
      ? delay(SERVICES.find((s) => s.id === id) ?? SERVICES[0], 200)
      : request<Service>(`/services/${id}`),
  // GET /services/:id/reviews -> recent reviews for the service
  reviews: (id: string) =>
    USE_MOCKS ? delay([] as Review[], 200) : request<Review[]>(`/services/${id}/reviews`),
};

export interface Review { id: string; rating: number; review: string; author: string; cleaner: string | null; time: string }

// ─── Bookings ──────────────────────────────────────────────────────────
export const bookings = {
  // GET /bookings  (auth)
  list: () => (USE_MOCKS ? delay(BOOKINGS, 400) : request<Booking[]>('/bookings')),
  // GET /bookings/:id
  get: (id: string) =>
    USE_MOCKS
      ? delay(BOOKINGS.find((b) => b.id === id) ?? BOOKINGS[0], 200)
      : request<Booking>(`/bookings/${id}`),
  // POST /bookings -> creates (or upserts) a booking, returns the full record.
  // In mock mode we persist into the in-memory BOOKINGS list so the tracking
  // screen and Bookings tab immediately reflect what the user just booked.
  create: (payload: Record<string, unknown>) => {
    if (!USE_MOCKS) return request<Booking>('/bookings', { method: 'POST', body: payload });
    const id = (payload.id as string) ?? 'HS-2025-00125';
    const record: Booking = {
      id,
      service: (payload.service as string) ?? 'Bathroom Cleaning',
      addOns: (payload.addOns as string[]) ?? [],
      status: (payload.status as Booking['status']) ?? 'confirmed',
      scheduledType: (payload.scheduledType as 'now' | 'later') ?? 'now',
      dateLabel: (payload.dateLabel as string) ?? 'Today',
      timeLabel: (payload.timeLabel as string) ?? 'Now',
      address: (payload.address as string) ?? USER.addresses[0].line1 + ', ' + USER.addresses[0].area,
      total: (payload.total as number) ?? 0,
      cleaner: payload.cleaner as Booking['cleaner'],
    };
    const idx = BOOKINGS.findIndex((b) => b.id === id);
    if (idx >= 0) BOOKINGS[idx] = { ...BOOKINGS[idx], ...record };
    else BOOKINGS.unshift(record);
    return delay(record, 500);
  },
  // POST /bookings/:id/rate { rating, review }
  rate: (id: string, rating: number, review?: string) => {
    if (!USE_MOCKS) return request(`/bookings/${id}/rate`, { method: 'POST', body: { rating, review } });
    const b = BOOKINGS.find((x) => x.id === id);
    if (b) b.rating = rating;
    return delay({ ok: true });
  },
  // POST /bookings/:id/cancel
  cancel: (id: string) => {
    if (!USE_MOCKS) return request(`/bookings/${id}/cancel`, { method: 'POST' });
    const b = BOOKINGS.find((x) => x.id === id);
    if (b) b.status = 'cancelled';
    return delay({ ok: true });
  },

  // POST /bookings/:id/location — share my live GPS (role-aware on the server)
  shareLocation: (id: string, lat: number, lng: number) =>
    USE_MOCKS ? delay({ ok: true }) : request(`/bookings/${id}/location`, { method: 'POST', body: { lat, lng } }),

  // GET /availability?date=<dateLabel> -> real slot availability (slot locking)
  availability: (date: string) => {
    const SLOTS = ['8:00 AM', '9:00 AM', '10:00 AM', '11:00 AM', '12:00 PM', '1:00 PM', '2:00 PM', '3:00 PM', '4:00 PM', '5:00 PM', '6:00 PM'];
    if (!USE_MOCKS) {
      return request<{ date: string; slots: { time: string; available: boolean }[] }>(`/availability?date=${encodeURIComponent(date)}`);
    }
    return delay({ date, slots: SLOTS.map((time, i) => ({ time, available: (i * 5) % 7 > 1 })) });
  },
};

// ─── Dispatch (Book Now) ───────────────────────────────────────────────
export const dispatch = {
  // GET /dispatch/nearby?service=… -> candidate cleaners
  nearby: () => (USE_MOCKS ? delay(CLEANERS, 300) : request<Cleaner[]>('/dispatch/nearby')),
  // The actual matching is driven server-side; the Finding screen polls this.
  // GET /dispatch/:bookingId/status -> { matched, cleaner }
};

// ─── Cleaners ──────────────────────────────────────────────────────────
export const cleaners = {
  // GET /cleaners           -> all cleaners
  all: () => (USE_MOCKS ? delay(CLEANERS, 200) : request<Cleaner[]>('/cleaners')),
  // GET /cleaners/preferred -> the logged-in user's own favorited cleaners
  preferred: () =>
    USE_MOCKS ? delay(CLEANERS.filter((c) => c.preferred), 200) : request<Cleaner[]>('/cleaners/preferred'),
  // POST /cleaners/:id/preferred { preferred }
  setPreferred: (id: string, preferred: boolean) =>
    USE_MOCKS ? delay({ ok: true }) : request(`/cleaners/${id}/preferred`, { method: 'POST', body: { preferred } }),
};

// ─── Messaging ─────────────────────────────────────────────────────────
export interface ChatMeta { name: string; initials: string; service: string; status: string }
export interface ProReview { rating: number; review: string; service: string; date: string; customer: string }

export const chat = {
  // GET /conversations
  conversations: () => (USE_MOCKS ? delay(CONVERSATIONS, 300) : request<Conversation[]>('/conversations')),
  // GET /conversations/:bookingId/meta -> the OTHER party's header info
  meta: (bookingId: string) =>
    USE_MOCKS
      ? delay({ name: 'Sara Ahmad', initials: 'SA', service: 'Cleaning', status: 'confirmed' } as ChatMeta)
      : request<ChatMeta>(`/conversations/${bookingId}/meta`),
  // GET /conversations/:bookingId/messages
  messages: (bookingId: string) =>
    USE_MOCKS ? delay(MESSAGES[bookingId] ?? [], 200) : request<ChatMessage[]>(`/conversations/${bookingId}/messages`),
  // POST /conversations/:bookingId/messages { text }
  send: (bookingId: string, text: string) =>
    USE_MOCKS
      ? delay({ id: String(Date.now()), bookingId, fromMe: true, text, time: 'now', read: false } as ChatMessage)
      : request<ChatMessage>(`/conversations/${bookingId}/messages`, { method: 'POST', body: { text } }),
  // POST /conversations/:bookingId/read
  markRead: (bookingId: string) =>
    USE_MOCKS ? delay({ ok: true }) : request(`/conversations/${bookingId}/read`, { method: 'POST' }),
};

// ─── Notifications ─────────────────────────────────────────────────────
export const notifications = {
  // GET /notifications -> { items, unread }
  list: () =>
    USE_MOCKS
      ? delay({ items: NOTIFICATIONS, unread: NOTIFICATIONS.filter((n) => !n.read).length }, 250)
      : request<{ items: AppNotification[]; unread: number }>('/notifications'),
  // POST /notifications/read-all
  readAll: () =>
    USE_MOCKS ? delay({ ok: true }) : request('/notifications/read-all', { method: 'POST' }),
};

// ─── User / profile ────────────────────────────────────────────────────
export const user = {
  // GET /me
  me: () => (USE_MOCKS ? delay(USER, 200) : request<User>('/me')),

  // PATCH /me { name?, email?, location?, phone?, avatarUrl?, gender?, dob? }
  update: (patch: { name?: string; email?: string; location?: string; phone?: string; avatarUrl?: string; gender?: string; dob?: string }) =>
    USE_MOCKS ? delay({ ok: true }) : request<User>('/me', { method: 'PATCH', body: patch }),

  // POST /me/role { role } — switch Customer ↔ Cleaner on the same account
  setRole: (role: 'client' | 'professional') =>
    USE_MOCKS ? delay({ ...USER, role } as User) : request<User>('/me/role', { method: 'POST', body: { role } }),

  // POST /me/addresses
  addAddress: (a: { label: string; line1: string; area: string; isDefault?: boolean }) =>
    USE_MOCKS ? delay({ id: String(Date.now()), ...a }) : request('/me/addresses', { method: 'POST', body: a }),

  // DELETE /me/addresses/:id
  deleteAddress: (id: string) =>
    USE_MOCKS ? delay({ ok: true }) : request(`/me/addresses/${id}`, { method: 'DELETE' }),

  // POST /me/payment-methods
  addPayment: (p: { type: string; name: string; detail: string; isDefault?: boolean }) =>
    USE_MOCKS ? delay({ id: String(Date.now()), ...p }) : request('/me/payment-methods', { method: 'POST', body: p }),

  // DELETE /me/payment-methods/:id
  deletePayment: (id: string) =>
    USE_MOCKS ? delay({ ok: true }) : request(`/me/payment-methods/${id}`, { method: 'DELETE' }),
};

// ─── Professional (cleaner) app ────────────────────────────────────────
export const pro = {
  // GET /pro/profile
  profile: () =>
    USE_MOCKS ? delay(CLEANERS[0]) : request<Cleaner>('/pro/profile'),
  // PATCH /pro/profile { name?, bio?, available? }
  updateProfile: (patch: { name?: string; bio?: string; available?: boolean }) =>
    USE_MOCKS ? delay({ ...CLEANERS[0], ...patch }) : request<Cleaner>('/pro/profile', { method: 'PATCH', body: patch }),
  // GET /pro/jobs -> { available, requests, active, history }
  jobs: () =>
    USE_MOCKS
      ? delay({ available: [] as Booking[], requests: BOOKINGS.filter((b) => b.status === 'confirmed'), active: BOOKINGS.filter((b) => ['on_the_way', 'arrived', 'in_progress'].includes(b.status)), history: BOOKINGS.filter((b) => ['completed', 'cancelled'].includes(b.status)) })
      : request<{ available: Booking[]; requests: Booking[]; active: Booking[]; history: Booking[] }>('/pro/jobs'),
  // POST /pro/bookings/:id/claim -> claim an open scheduled job from the pool
  claim: (id: string) =>
    USE_MOCKS ? delay({ ok: true }) : request(`/pro/bookings/${id}/claim`, { method: 'POST' }),
  // GET /bookings/:id (a single job's full detail — reuses the booking endpoint)
  job: (id: string) =>
    USE_MOCKS ? delay(BOOKINGS.find((b) => b.id === id) ?? BOOKINGS[0]) : request<Booking>(`/bookings/${id}`),
  // POST /pro/bookings/:id/accept
  accept: (id: string) =>
    USE_MOCKS ? delay({ ok: true }) : request(`/pro/bookings/${id}/accept`, { method: 'POST' }),
  // POST /pro/bookings/:id/reject -> { ok, reassignedTo }
  reject: (id: string) =>
    USE_MOCKS ? delay({ ok: true, reassignedTo: null }) : request<{ ok: boolean; reassignedTo: string | null }>(`/pro/bookings/${id}/reject`, { method: 'POST' }),
  // POST /pro/bookings/:id/status { status }
  setStatus: (id: string, status: string) =>
    USE_MOCKS ? delay({ ok: true, status }) : request(`/pro/bookings/${id}/status`, { method: 'POST', body: { status } }),
  // GET /pro/earnings
  earnings: () =>
    USE_MOCKS
      ? delay({ total: 12600, jobs: 8, items: [] as { id: string; service: string; amount: number; dateLabel: string }[] })
      : request<{ total: number; jobs: number; items: { id: string; service: string; amount: number; dateLabel: string }[] }>('/pro/earnings'),
  // GET /pro/reviews
  reviews: () =>
    USE_MOCKS
      ? delay({ average: 0, count: 0, items: [] as ProReview[] })
      : request<{ average: number; count: number; items: ProReview[] }>('/pro/reviews'),
  // POST /pro/withdraw -> withdraw available balance to payout method
  withdraw: () =>
    USE_MOCKS ? delay({ ok: true, amount: 0, to: '' }) : request<{ ok: boolean; amount: number; to: string }>('/pro/withdraw', { method: 'POST' }),
};

// ─── Payments ──────────────────────────────────────────────────────────
export const payments = {
  // POST /payments { bookingId, method, amount } -> { ok, txnId, invoiceNo }
  // Real gateway (Easypaisa/JazzCash/bank/card) is wired here when keys arrive.
  pay: (bookingId: string, method: string, amount: number) =>
    USE_MOCKS
      ? delay({ ok: true, txnId: 'TXN' + bookingId.replace(/\D/g, '').slice(-6), invoiceNo: 'INV-' + bookingId }, 1800)
      : request<{ ok: boolean; txnId: string; invoiceNo: string }>('/payments', {
          method: 'POST',
          body: { bookingId, method, amount },
        }),
  // POST /payments/session -> Bank Alfalah (MPGS) Hosted Checkout launcher URL
  createSession: (bookingId: string) =>
    request<{ launchUrl: string; orderId: string; sessionId: string }>('/payments/session', {
      method: 'POST',
      body: { bookingId },
    }),
};

export const FEE_PCT = HOMESERVICE_FEE_PCT;
