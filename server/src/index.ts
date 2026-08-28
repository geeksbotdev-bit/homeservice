import 'dotenv/config';
import path from 'path';
import fs from 'fs';
import express from 'express';
import cors from 'cors';
import { prisma } from './db';
import { signToken, requireAuth, type AuthedRequest } from './auth';
import { verifyIdToken, sendPush } from './firebaseAdmin';
import { serializeService, serializeBooking, serializeCleaner, serializeMessage, serializeUser, serializeVerification } from './serialize';
import { createCheckoutSession, retrieveOrder, launcherHtml, refundOrder } from './bafl';

const app = express();
app.use(cors());
app.use(express.json({ limit: '12mb' })); // base64 ID document images

// Uploaded ID documents / selfies are served statically from /uploads.
const UPLOAD_DIR = path.join(process.cwd(), 'uploads');
fs.mkdirSync(UPLOAD_DIR, { recursive: true });
app.use('/uploads', express.static(UPLOAD_DIR));

// Public base URLs. On Render these auto-resolve from RENDER_EXTERNAL_URL, so
// the Bank Alfalah gateway always gets a public returnUrl (renders correctly).
const SELF_URL = process.env.SELF_URL || process.env.RENDER_EXTERNAL_URL || 'http://localhost:4000';
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:8081';

const ok = (res: any, data: any) => res.json(data);
function httpError(status: number, message: string) {
  return Object.assign(new Error(message), { status });
}
const wrap = (fn: (req: AuthedRequest, res: express.Response) => Promise<any>) =>
  (req: express.Request, res: express.Response) =>
    fn(req as AuthedRequest, res).catch((e) => {
      const status = (e && e.status) || 500;
      if (status >= 500) console.error(e);
      res.status(status).json({ error: e.message });
    });

// ─── Health ──────────────────────────────────────────────────────────
app.get('/health', (_req, res) => res.json({ ok: true, service: 'homeservice-api' }));

// ─── Auth ────────────────────────────────────────────────────────────
// Real OTP verification: a code is generated per phone, expires in 5 min,
// max 5 attempts, single-use. In dev (no SMS gateway) the code is returned as
// `devCode` so signup is testable; wire an SMS provider to stop returning it.
const OTP_TTL_MS = 5 * 60 * 1000;
const OTP_MAX_ATTEMPTS = 5;
const otpStore = new Map<string, { code: string; expires: number; attempts: number }>();

app.post('/auth/request-otp', wrap(async (req, res) => {
  const { phone } = req.body as { phone?: string };
  const normalized = (phone || '').trim();
  if (!normalized) return res.status(400).json({ error: 'Phone number required' });
  const code = String(Math.floor(100000 + Math.random() * 900000)); // 6 digits
  otpStore.set(normalized, { code, expires: Date.now() + OTP_TTL_MS, attempts: 0 });
  const smsConfigured = !!process.env.SMS_API_KEY;
  // TODO: when SMS_API_KEY is set, send `code` via the PK SMS gateway here.
  ok(res, { ok: true, ttl: OTP_TTL_MS / 1000, ...(smsConfigured ? {} : { devCode: code }) });
}));

app.post('/auth/verify-otp', wrap(async (req, res) => {
  const { phone, code, role } = req.body as { phone?: string; code?: string; role?: string };
  const normalized = (phone || '').trim();
  if (!normalized) return res.status(400).json({ error: 'Phone number required' });

  // Enforce the OTP if one was requested for this number.
  const rec = otpStore.get(normalized);
  if (rec) {
    if (Date.now() > rec.expires) { otpStore.delete(normalized); return res.status(400).json({ error: 'Code expired — please resend.' }); }
    if (rec.attempts >= OTP_MAX_ATTEMPTS) { otpStore.delete(normalized); return res.status(429).json({ error: 'Too many attempts — please resend a new code.' }); }
    if (String(code || '').trim() !== rec.code) { rec.attempts++; return res.status(400).json({ error: 'Incorrect code. Please try again.' }); }
    otpStore.delete(normalized); // single use
  } else {
    return res.status(400).json({ error: 'Please request a verification code first.' });
  }

  // Existing phone → login. New phone → create a fresh, empty account.
  let user = await prisma.user.findFirst({ where: { phone: normalized } });
  const isNew = !user;
  if (!user) {
    user = await prisma.user.create({
      data: { name: '', phone: normalized, role: role === 'professional' ? 'pro' : 'client', location: '' },
    });
  }
  const full = await loadUser(user.id);
  ok(res, { token: signToken(user.id), user: serializeUser(full), isNew });
}));

app.post('/auth/google', wrap(async (req, res) => {
  const { idToken, name, email } = req.body as { idToken?: string; name?: string; email?: string };
  const decoded = idToken ? await verifyIdToken(idToken) : null;
  const resolvedEmail = decoded?.email ?? email;
  const resolvedName = decoded?.name ?? name ?? 'Google User';
  const uid = decoded?.uid;

  let user = resolvedEmail
    ? await prisma.user.findFirst({ where: { email: resolvedEmail } })
    : uid ? await prisma.user.findFirst({ where: { firebaseUid: uid } }) : null;
  const isNew = !user;
  if (!user) {
    user = await prisma.user.create({
      data: { name: resolvedName, email: resolvedEmail, firebaseUid: uid, role: 'client', location: '' },
    });
  }
  const full = await loadUser(user.id);
  ok(res, { token: signToken(user.id), user: serializeUser(full), isNew });
}));

app.post('/auth/firebase', wrap(async (req, res) => {
  // Exchanges a Firebase Phone-Auth ID token for an app session.
  const { idToken, phone, name } = req.body as { idToken?: string; phone?: string; name?: string };
  const decoded = idToken ? await verifyIdToken(idToken) : null;
  const resolvedPhone = decoded?.phone_number ?? phone ?? '';
  const uid = decoded?.uid;

  let user =
    (uid ? await prisma.user.findFirst({ where: { firebaseUid: uid } }) : null) ??
    (resolvedPhone ? await prisma.user.findFirst({ where: { phone: resolvedPhone } }) : null);
  const isNew = !user;
  if (!user) {
    user = await prisma.user.create({
      data: { name: name ?? '', phone: resolvedPhone || null, firebaseUid: uid, role: 'client', location: '' },
    });
  } else if (uid && !user.firebaseUid) {
    await prisma.user.update({ where: { id: user.id }, data: { firebaseUid: uid } });
  }
  const full = await loadUser(user.id);
  ok(res, { token: signToken(user.id), user: serializeUser(full), isNew });
}));

// ─── Services ────────────────────────────────────────────────────────
// Real rating/reviews computed from actual rated bookings for the service.
async function serviceRating(serviceId: string) {
  const rated = await prisma.booking.findMany({ where: { serviceId, rating: { not: null } }, select: { rating: true } });
  const reviews = rated.length;
  const rating = reviews ? Math.round((rated.reduce((a, b) => a + (b.rating ?? 0), 0) / reviews) * 10) / 10 : 0;
  return { rating, reviews };
}

app.get('/services', wrap(async (_req, res) => {
  const list = await prisma.service.findMany({ include: { addOns: true } });
  const out = await Promise.all(list.map(async (s) => ({ ...serializeService(s), ...(await serviceRating(s.id)) })));
  ok(res, out);
}));

app.get('/services/:id', wrap(async (req, res) => {
  const s = await prisma.service.findUnique({ where: { id: req.params.id }, include: { addOns: true } });
  if (!s) return res.status(404).json({ error: 'Service not found' });
  ok(res, { ...serializeService(s), ...(await serviceRating(s.id)) });
}));

// Recent reviews for a service (from completed, rated bookings).
app.get('/services/:id/reviews', wrap(async (req, res) => {
  const rows = await prisma.booking.findMany({
    where: { serviceId: req.params.id, rating: { not: null } },
    include: { user: true, cleaner: true },
    orderBy: { createdAt: 'desc' }, take: 20,
  });
  ok(res, rows.map((b) => ({
    id: b.id,
    rating: b.rating,
    review: b.review ?? '',
    author: b.user?.name || 'Client',
    cleaner: b.cleaner?.name ?? null,
    time: relativeTime(b.createdAt),
  })));
}));

// ─── Availability (slot locking) ─────────────────────────────────────
const TIME_SLOTS = ['8:00 AM', '9:00 AM', '10:00 AM', '11:00 AM', '12:00 PM', '1:00 PM', '2:00 PM', '3:00 PM', '4:00 PM', '5:00 PM', '6:00 PM'];

// GET /availability?date=<dateLabel> -> which slots are open for that day.
// A slot is locked once any active booking exists at that date+time.
app.get('/availability', wrap(async (req, res) => {
  const date = String(req.query.date ?? '');
  const booked = date
    ? await prisma.booking.findMany({ where: { dateLabel: date, status: { not: 'cancelled' } }, select: { timeLabel: true } })
    : [];
  const taken = new Set(booked.map((b) => b.timeLabel));
  ok(res, { date, slots: TIME_SLOTS.map((time) => ({ time, available: !taken.has(time) })) });
}));

// ─── Me ──────────────────────────────────────────────────────────────
app.get('/me', requireAuth, wrap(async (req, res) => {
  const u = await loadUser(req.userId!);
  ok(res, serializeUser(u));
}));

app.patch('/me', requireAuth, wrap(async (req, res) => {
  const { name, email, location, phone, avatarUrl, gender, dob } = req.body as any;
  await prisma.user.update({
    where: { id: req.userId! },
    data: {
      ...(name !== undefined ? { name } : {}),
      ...(email !== undefined ? { email: email || null } : {}),
      ...(location !== undefined ? { location } : {}),
      ...(phone !== undefined ? { phone: phone || null } : {}),
      ...(avatarUrl !== undefined ? { avatarUrl: avatarUrl || null } : {}),
      ...(gender !== undefined ? { gender: gender || null } : {}),
      ...(dob !== undefined ? { dob: dob || null } : {}),
    },
  });
  ok(res, serializeUser(await loadUser(req.userId!)));
}));

// Switch the logged-in user's role (Customer ↔ Cleaner) on the same account.
app.post('/me/role', requireAuth, wrap(async (req, res) => {
  const { role } = req.body as { role?: string };
  const next = role === 'professional' || role === 'pro' || role === 'cleaner' ? 'pro' : 'client';
  await prisma.user.update({ where: { id: req.userId! }, data: { role: next } });
  // Ensure a cleaner has a profile the first time they switch to Cleaner mode.
  if (next === 'pro') await getMyCleaner(req.userId!);
  ok(res, serializeUser(await loadUser(req.userId!)));
}));

app.post('/me/addresses', requireAuth, wrap(async (req, res) => {
  const { label, line1, area, isDefault } = req.body as any;
  if (isDefault) await prisma.address.updateMany({ where: { userId: req.userId! }, data: { isDefault: false } });
  const a = await prisma.address.create({ data: { userId: req.userId!, label, line1, area, isDefault: !!isDefault } });
  ok(res, { id: a.id, label: a.label, line1: a.line1, area: a.area, isDefault: a.isDefault });
}));

app.delete('/me/addresses/:id', requireAuth, wrap(async (req, res) => {
  await prisma.address.deleteMany({ where: { id: req.params.id, userId: req.userId! } });
  ok(res, { ok: true });
}));

app.post('/me/payment-methods', requireAuth, wrap(async (req, res) => {
  const { type, name, detail, isDefault } = req.body as any;
  if (isDefault) await prisma.paymentMethod.updateMany({ where: { userId: req.userId! }, data: { isDefault: false } });
  const p = await prisma.paymentMethod.create({ data: { userId: req.userId!, type, name, detail, isDefault: !!isDefault } });
  ok(res, { id: p.id, type: p.type, name: p.name, detail: p.detail, isDefault: p.isDefault });
}));

app.delete('/me/payment-methods/:id', requireAuth, wrap(async (req, res) => {
  await prisma.paymentMethod.deleteMany({ where: { id: req.params.id, userId: req.userId! } });
  ok(res, { ok: true });
}));

// ─── Professional (cleaner) app ──────────────────────────────────────
// Each professional user owns their own Cleaner profile. On first access a
// pro either claims an unlinked seeded profile (so the demo has data) or gets
// a fresh one created from their user account.
const initialsOf = (name: string) => name.split(' ').map((x) => x[0]).slice(0, 2).join('').toUpperCase() || 'NC';

// Only "live" cleaners: available, with a real completed profile (a seeded
// demo cleaner, or a pro who finished onboarding). Excludes placeholders.
const liveCleanerWhere: any = {
  available: true,
  verifStatus: 'verified',        // only identity-verified cleaners are dispatchable
  name: { not: '' },
  NOT: { name: 'New Cleaner' },
  OR: [{ userId: null }, { user: { name: { not: '' } } }],
};

// Real, online, onboarded cleaners only — the ones who can actually tap Accept.
const realProWhere: any = { ...liveCleanerWhere, userId: { not: null } };

// Broadcast a new open request to every real cleaner (first to accept wins).
async function broadcastRequest(bookingId: string, serviceName: string, scheduled: boolean) {
  const cleaners = await prisma.cleaner.findMany({ where: realProWhere, select: { userId: true } });
  const title = scheduled ? 'New scheduled job 📅' : 'New job request 🔔';
  const body = scheduled ? `A customer scheduled ${serviceName}. Open to accept.` : `A customer needs ${serviceName} now. Open to accept.`;
  for (const c of cleaners) if (c.userId) await notify(c.userId, 'bell', title, body, { bookingId });
}

async function getMyCleaner(userId: string) {
  const u = await prisma.user.findUnique({ where: { id: userId } });
  if (!u) throw httpError(401, 'Session expired — please sign in again');
  const existing = await prisma.cleaner.findFirst({ where: { userId } });
  if (existing) {
    // Keep the cleaner's display name in sync once the pro completes their
    // profile (the placeholder was created before they set a real name).
    if (u.name && (existing.name === 'New Cleaner' || existing.name === '') && u.name !== existing.name) {
      return prisma.cleaner.update({ where: { id: existing.id }, data: { name: u.name, initials: initialsOf(u.name) } });
    }
    return existing;
  }
  // A brand-new professional starts FRESH — their own profile, 0 jobs, no
  // history, no rating yet. (Seeded cleaners stay as customer dispatch demo data.)
  const name = u.name || 'New Cleaner';
  return prisma.cleaner.create({ data: { userId, name, initials: initialsOf(name), rating: 0, jobs: 0, distanceKm: 1, available: true } });
}

app.get('/pro/profile', requireAuth, wrap(async (req, res) => {
  ok(res, serializeCleaner(await getMyCleaner(req.userId!)));
}));

// A cleaner pushes their live GPS while online — powers the customer's
// "cleaners nearby" map with real positions.
app.post('/pro/location', requireAuth, wrap(async (req, res) => {
  const { lat, lng } = req.body as any;
  if (typeof lat !== 'number' || typeof lng !== 'number') throw httpError(400, 'lat and lng are required');
  const me = await getMyCleaner(req.userId!);
  await prisma.cleaner.update({ where: { id: me.id }, data: { lat, lng, locAt: new Date() } });
  ok(res, { ok: true });
}));

// Store a base64 image (ID document / selfie) and return its public URL.
app.post('/uploads', requireAuth, wrap(async (req, res) => {
  const { dataUrl } = req.body as any;
  const m = /^data:image\/(png|jpe?g|webp);base64,(.+)$/.exec(typeof dataUrl === 'string' ? dataUrl : '');
  if (!m) throw httpError(400, 'Expected a base64 image data URL');
  const ext = m[1] === 'jpeg' ? 'jpg' : m[1];
  const buf = Buffer.from(m[2], 'base64');
  if (buf.length > 8 * 1024 * 1024) throw httpError(413, 'Image too large (max 8MB)');
  const name = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  fs.writeFileSync(path.join(UPLOAD_DIR, name), buf);
  ok(res, { url: `${SELF_URL}/uploads/${name}` });
}));

// Cleaner submits identity documents for verification → status becomes "pending".
app.post('/pro/verify', requireAuth, wrap(async (req, res) => {
  const { cnic, idFront, idBack, selfie } = req.body as any;
  if (!cnic || !idFront || !selfie) throw httpError(400, 'CNIC number, ID front and a selfie are required');
  const me = await getMyCleaner(req.userId!);
  const updated = await prisma.cleaner.update({
    where: { id: me.id },
    data: { cnic, idFront, idBack: idBack ?? null, selfie, verifStatus: 'pending', verifNote: null, verifAt: new Date() },
  });
  ok(res, serializeCleaner(updated));
}));

app.patch('/pro/profile', requireAuth, wrap(async (req, res) => {
  const { name, bio, available } = req.body as any;
  const me = await getMyCleaner(req.userId!);
  const updated = await prisma.cleaner.update({
    where: { id: me.id },
    data: {
      ...(name !== undefined ? { name } : {}),
      ...(bio !== undefined ? { bio } : {}),
      ...(available !== undefined ? { available } : {}),
    },
  });
  ok(res, serializeCleaner(updated));
}));

app.get('/pro/jobs', requireAuth, wrap(async (req, res) => {
  const me = await getMyCleaner(req.userId!);
  // Jobs assigned to THIS logged-in cleaner.
  const mine = await prisma.booking.findMany({
    where: { cleanerId: me.id }, include: bookingInclude, orderBy: { createdAt: 'desc' },
  });
  const list = mine.map(serializeBooking);
  // Open, unclaimed requests broadcast to every cleaner — first to accept wins.
  const [instantPool, scheduledPool] = await Promise.all([
    prisma.booking.findMany({ where: { cleanerId: null, scheduledType: 'now', status: 'confirmed' }, include: bookingInclude, orderBy: { createdAt: 'desc' } }),
    prisma.booking.findMany({ where: { cleanerId: null, scheduledType: 'later', status: 'confirmed' }, include: bookingInclude, orderBy: { createdAt: 'asc' } }),
  ]);
  ok(res, {
    // Instant requests waiting for the first cleaner to accept.
    requests: instantPool.map(serializeBooking),
    // Scheduled jobs waiting to be picked up.
    available: scheduledPool.map(serializeBooking),
    // Accepted & in progress (this cleaner's).
    active: list.filter((b) => b.accepted && ['confirmed', 'on_the_way', 'arrived', 'in_progress'].includes(b.status)),
    history: list.filter((b) => ['completed', 'cancelled'].includes(b.status)),
  });
}));

// First cleaner to accept an open request WINS it (atomic — no double-booking).
async function claimBooking(bookingId: string, userId: string) {
  const me = await getMyCleaner(userId);
  if (me.verifStatus !== 'verified') throw httpError(403, 'Your account is not verified yet. Please complete identity verification to accept jobs.');
  const b = await prisma.booking.findUnique({ where: { id: bookingId } });
  if (!b) throw httpError(404, 'Job not found');
  if (b.cleanerId && b.cleanerId !== me.id) throw httpError(409, 'This job was just taken by another cleaner.');
  // Only succeeds if the job is still unclaimed (or already mine).
  const upd = await prisma.booking.updateMany({
    where: { id: bookingId, OR: [{ cleanerId: null }, { cleanerId: me.id }] },
    data: { cleanerId: me.id, accepted: true },
  });
  if (upd.count === 0) throw httpError(409, 'This job was just taken by another cleaner.');
  const when = b.scheduledType === 'later' ? ` on ${b.dateLabel}, ${b.timeLabel}` : ' and will be there soon';
  await notify(b.userId, 'user-check', 'Cleaner confirmed ✅', `${me.name} accepted your ${b.serviceName}${when}.`, { bookingId });
}

app.post('/pro/bookings/:id/claim', requireAuth, wrap(async (req, res) => {
  await claimBooking(req.params.id, req.userId!);
  ok(res, { ok: true });
}));

// Accept === claim (first to accept wins).
app.post('/pro/bookings/:id/accept', requireAuth, wrap(async (req, res) => {
  await claimBooking(req.params.id, req.userId!);
  ok(res, { ok: true });
}));

// A cleaner declines: if they had claimed it, release it back to the pool.
app.post('/pro/bookings/:id/reject', requireAuth, wrap(async (req, res) => {
  const me = await getMyCleaner(req.userId!);
  const b = await prisma.booking.findUnique({ where: { id: req.params.id } });
  if (b && b.cleanerId === me.id && !['on_the_way', 'arrived', 'in_progress', 'completed'].includes(b.status)) {
    await prisma.booking.update({ where: { id: b.id }, data: { cleanerId: null, accepted: false } });
    await broadcastRequest(b.id, b.serviceName, b.scheduledType === 'later');
  }
  ok(res, { ok: true, reassignedTo: null });
}));

app.post('/pro/bookings/:id/status', requireAuth, wrap(async (req, res) => {
  const { status } = req.body as { status: string };
  const prev = await prisma.booking.findUnique({ where: { id: req.params.id } });
  const b = await prisma.booking.update({ where: { id: req.params.id }, data: { status } });
  // On completion, increment the cleaner's completed-jobs count (once).
  if (status === 'completed' && prev?.status !== 'completed' && b.cleanerId) {
    await prisma.cleaner.update({ where: { id: b.cleanerId }, data: { jobs: { increment: 1 } } });
  }
  // Record an in-app notification + push for the client.
  const N: Record<string, { icon: string; title: string; body: string }> = {
    on_the_way:  { icon: 'navigation',  title: 'Cleaner on the way 🚗', body: `Your cleaner is heading to you for ${b.serviceName}.` },
    arrived:     { icon: 'map-pin',     title: 'Cleaner arrived 🏠',    body: `Your cleaner has arrived for ${b.serviceName}.` },
    in_progress: { icon: 'loader',      title: 'Cleaning started ✨',   body: `Your ${b.serviceName} is now in progress.` },
    completed:   { icon: 'check-circle',title: 'Service completed ✅',  body: `Your ${b.serviceName} is done. Please rate your cleaner!` },
  };
  const n = N[status];
  if (n) await notify(b.userId, n.icon, n.title, n.body, { bookingId: b.id, status });
  ok(res, { ok: true, status });
}));

// Reviews customers left for THIS cleaner.
app.get('/pro/reviews', requireAuth, wrap(async (req, res) => {
  const me = await getMyCleaner(req.userId!);
  const rated = await prisma.booking.findMany({
    where: { cleanerId: me.id, rating: { not: null } },
    include: { user: true }, orderBy: { createdAt: 'desc' },
  });
  const items = rated.map((b) => ({
    rating: b.rating ?? 0,
    review: b.review || '',
    service: b.serviceName,
    date: b.createdAt,
    customer: b.user?.name?.trim() || 'Customer',
  }));
  const count = items.length;
  const average = count ? Math.round((items.reduce((s, r) => s + r.rating, 0) / count) * 10) / 10 : 0;
  ok(res, { average, count, items });
}));

const COMMISSION_PCT = 0.30; // company service fee kept from each job

app.get('/pro/earnings', requireAuth, wrap(async (req, res) => {
  const me = await getMyCleaner(req.userId!);
  const completed = await prisma.booking.findMany({ where: { status: 'completed', cleanerId: me.id }, orderBy: { createdAt: 'desc' } });
  const gross = completed.reduce((s, b) => s + b.total, 0);
  const fee = Math.round(gross * COMMISSION_PCT);   // company keeps 30%
  const net = gross - fee;                           // cleaner earns 70%
  const available = Math.max(0, net - me.withdrawn);
  ok(res, {
    total: net,               // "Total earned" now means the cleaner's net share
    gross, fee, net,
    commissionPct: COMMISSION_PCT,
    withdrawn: me.withdrawn,
    available,
    jobs: completed.length,
    items: completed.map((b) => ({ id: b.id, service: b.serviceName, amount: Math.round(b.total * (1 - COMMISSION_PCT)), dateLabel: b.dateLabel })),
  });
}));

// Cleaner withdraws their available balance to their payout method.
app.post('/pro/withdraw', requireAuth, wrap(async (req, res) => {
  const me = await getMyCleaner(req.userId!);
  const completed = await prisma.booking.findMany({ where: { status: 'completed', cleanerId: me.id } });
  const gross = completed.reduce((s, b) => s + b.total, 0);
  const net = gross - Math.round(gross * COMMISSION_PCT);
  const available = Math.max(0, net - me.withdrawn);
  if (available <= 0) throw httpError(400, 'No balance available to withdraw.');
  // Requires a payout method on file.
  const payout = await prisma.paymentMethod.findFirst({ where: { userId: req.userId! } });
  if (!payout) throw httpError(400, 'Add a payout method first.');
  await prisma.cleaner.update({ where: { id: me.id }, data: { withdrawn: me.withdrawn + available } });
  await notify(req.userId!, 'dollar-sign', 'Withdrawal requested 💸', `PKR ${available.toLocaleString('en-PK')} is being transferred to ${payout.name} · ${payout.detail}.`, {});
  ok(res, { ok: true, amount: available, to: `${payout.name} · ${payout.detail}` });
}));

app.post('/push/register', requireAuth, wrap(async (req, res) => {
  const { token, platform } = req.body as { token: string; platform: string };
  if (token) {
    await prisma.pushToken.upsert({
      where: { token }, create: { userId: req.userId!, token, platform: platform ?? 'unknown' }, update: { userId: req.userId! },
    });
  }
  ok(res, { ok: true });
}));

// ─── Notifications ───────────────────────────────────────────────────
app.get('/notifications', requireAuth, wrap(async (req, res) => {
  const items = await prisma.notification.findMany({ where: { userId: req.userId! }, orderBy: { createdAt: 'desc' }, take: 50 });
  const unread = items.filter((n) => !n.read).length;
  ok(res, {
    items: items.map((n) => ({ id: n.id, icon: n.icon, title: n.title, body: n.body, read: n.read, time: relativeTime(n.createdAt) })),
    unread,
  });
}));

app.post('/notifications/read-all', requireAuth, wrap(async (req, res) => {
  await prisma.notification.updateMany({ where: { userId: req.userId!, read: false }, data: { read: true } });
  ok(res, { ok: true });
}));

// Great-circle distance (km) between two lat/lng points.
function haversineKm(aLat: number, aLng: number, bLat: number, bLng: number) {
  const R = 6371;
  const dLat = ((bLat - aLat) * Math.PI) / 180;
  const dLng = ((bLng - aLng) * Math.PI) / 180;
  const s = Math.sin(dLat / 2) ** 2 +
    Math.cos((aLat * Math.PI) / 180) * Math.cos((bLat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(s), Math.sqrt(1 - s));
}

// Deterministic bearing (radians) from a cleaner id — so a cleaner without a
// live GPS fix still gets a stable spot around the customer (no jumping).
function bearingOf(id: string) {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return ((h % 360) * Math.PI) / 180;
}
function offsetFrom(lat: number, lng: number, km: number, ang: number) {
  const dLat = (km / 111) * Math.cos(ang);
  const dLng = (km / (111 * Math.cos((lat * Math.PI) / 180))) * Math.sin(ang);
  return { lat: lat + dLat, lng: lng + dLng };
}

// ─── Dispatch ────────────────────────────────────────────────────────
app.get('/dispatch/nearby', wrap(async (req, res) => {
  // "Live" cleaners only: currently available AND with a real, completed
  // profile — either a seeded demo cleaner, or a pro who finished onboarding.
  const cleaners = await prisma.cleaner.findMany({ where: liveCleanerWhere });

  // Customer's live position (from the app). When present we compute REAL
  // distances and coordinates so the map shows cleaners where they actually are.
  const uLat = req.query.lat != null ? Number(req.query.lat) : null;
  const uLng = req.query.lng != null ? Number(req.query.lng) : null;
  const hasUser = uLat != null && uLng != null && !Number.isNaN(uLat) && !Number.isNaN(uLng);

  const enriched = cleaners.map((c) => {
    const s: any = serializeCleaner(c);
    const liveGps = c.lat != null && c.lng != null;
    if (hasUser) {
      if (liveGps) {
        // Real reported GPS — plot exactly, real distance.
        s.lat = c.lat; s.lng = c.lng;
        s.distanceKm = Math.round(haversineKm(uLat!, uLng!, c.lat!, c.lng!) * 10) / 10;
      } else {
        // No live fix yet — sit them near the customer by their known distance.
        const p = offsetFrom(uLat!, uLng!, c.distanceKm || 1, bearingOf(c.id));
        s.lat = p.lat; s.lng = p.lng;
      }
    }
    return s;
  });

  // Nearest first.
  enriched.sort((a, b) => (a.distanceKm ?? 99) - (b.distanceKm ?? 99));
  ok(res, enriched);
}));

// All cleaners.
app.get('/cleaners', wrap(async (_req, res) => {
  const cleaners = await prisma.cleaner.findMany({ orderBy: { rating: 'desc' } });
  ok(res, cleaners.map(serializeCleaner));
}));

// THIS user's preferred (favorited) cleaners.
app.get('/cleaners/preferred', requireAuth, wrap(async (req, res) => {
  const favs = await prisma.favorite.findMany({ where: { userId: req.userId! }, include: { cleaner: true } });
  ok(res, favs.map((f) => serializeCleaner(f.cleaner)));
}));

// Toggle a cleaner as this user's favorite (heart button).
app.post('/cleaners/:id/preferred', requireAuth, wrap(async (req, res) => {
  const { preferred } = req.body as { preferred: boolean };
  if (preferred) {
    await prisma.favorite.upsert({
      where: { userId_cleanerId: { userId: req.userId!, cleanerId: req.params.id } },
      create: { userId: req.userId!, cleanerId: req.params.id },
      update: {},
    });
  } else {
    await prisma.favorite.deleteMany({ where: { userId: req.userId!, cleanerId: req.params.id } });
  }
  ok(res, { ok: true });
}));

// ─── Bookings ────────────────────────────────────────────────────────
const bookingInclude = { addOns: true, cleaner: { include: { user: true } }, payment: true };

app.get('/bookings', requireAuth, wrap(async (req, res) => {
  const list = await prisma.booking.findMany({
    where: { userId: req.userId! }, include: bookingInclude, orderBy: { createdAt: 'desc' },
  });
  ok(res, list.map(serializeBooking));
}));

app.get('/bookings/:id', requireAuth, wrap(async (req, res) => {
  const b = await prisma.booking.findUnique({ where: { id: req.params.id }, include: bookingInclude });
  if (!b) return res.status(404).json({ error: 'Booking not found' });
  ok(res, serializeBooking(b));
}));

app.post('/bookings', requireAuth, wrap(async (req, res) => {
  const body = req.body as any;
  const scheduledType = body.scheduledType ?? body.mode ?? 'now';
  const isScheduled = scheduledType === 'later';
  // Neither instant NOR scheduled jobs are pre-assigned. Both broadcast to
  // cleaners; whoever accepts FIRST gets the job. (A cleaner id only arrives on
  // the re-submit AFTER someone has already accepted.)
  const cleanerId = isScheduled ? null : await resolveCleanerId(body.cleaner);
  const addOnNames: string[] = Array.isArray(body.addOns) ? body.addOns : [];

  // Upsert by id when the client re-submits the same booking (confirm → invoice).
  const data = {
    userId: req.userId!,
    serviceId: body.serviceId ?? null,
    serviceName: body.service ?? 'Cleaning',
    status: body.status ?? 'confirmed',
    scheduledType,
    dateLabel: body.dateLabel ?? 'Today',
    timeLabel: body.timeLabel ?? 'Now',
    address: body.address ?? '',
    quantity: body.quantity ?? 1,
    total: body.total ?? 0,
    cleanerId,
  };

  let booking;
  let isNewBooking = false;
  let hadCleaner = false;
  if (body.id) {
    const existing = await prisma.booking.findUnique({ where: { id: body.id } });
    if (existing) {
      hadCleaner = !!existing.cleanerId;
      booking = await prisma.booking.update({ where: { id: body.id }, data });
    }
  }
  if (!booking) {
    booking = await prisma.booking.create({ data });
    isNewBooking = true;
    if (addOnNames.length) {
      await prisma.bookingAddOn.createMany({ data: addOnNames.map((name) => ({ bookingId: booking!.id, name, price: 0 })) });
    }
  }

  const full = await prisma.booking.findUnique({ where: { id: booking.id }, include: bookingInclude });

  // Lifecycle notifications. Instant bookings start as 'pending' (not broadcast
  // until payment); scheduled start 'confirmed' and broadcast to the pool now.
  if (isNewBooking && data.status === 'confirmed') {
    await notify(req.userId!, 'check-circle', 'Booking confirmed', `${data.serviceName} · ${data.dateLabel}, ${data.timeLabel}`, { bookingId: booking.id });
    if (!cleanerId) {
      await notify(req.userId!, 'search', isScheduled ? 'Scheduled — finding a cleaner' : 'Finding a cleaner',
        `We're sending your ${data.serviceName} request to cleaners nearby…`, { bookingId: booking.id });
      await broadcastRequest(booking.id, data.serviceName, isScheduled);
    }
  }

  ok(res, serializeBooking(full));
}));

app.post('/bookings/:id/rate', requireAuth, wrap(async (req, res) => {
  const { rating, review } = req.body as { rating: number; review?: string };
  const b = await prisma.booking.update({ where: { id: req.params.id }, data: { rating, review: review ?? null } });
  // Recompute the cleaner's average rating from all their rated bookings.
  if (b.cleanerId) {
    const rated = await prisma.booking.findMany({ where: { cleanerId: b.cleanerId, rating: { not: null } }, select: { rating: true } });
    if (rated.length) {
      const avg = rated.reduce((s, r) => s + (r.rating ?? 0), 0) / rated.length;
      await prisma.cleaner.update({ where: { id: b.cleanerId }, data: { rating: Math.round(avg * 10) / 10 } });
    }
  }
  ok(res, { ok: true });
}));

const CANCELLATION_FEE_PCT = 0.30; // company keeps 30% on a paid cancellation
const REFUND_WINDOW_DAYS = 30;

app.post('/bookings/:id/cancel', requireAuth, wrap(async (req, res) => {
  const b = await prisma.booking.findUnique({ where: { id: req.params.id }, include: { payment: true } });
  if (!b) return res.status(404).json({ error: 'Booking not found' });

  let refund = 0;
  let refundEligible = false;
  if (b.payment && b.payment.status === 'paid') {
    const days = (Date.now() - new Date(b.payment.createdAt).getTime()) / 86400000;
    if (days <= REFUND_WINDOW_DAYS) {
      refundEligible = true;
      refund = Math.round(b.payment.amount * (1 - CANCELLATION_FEE_PCT)); // 70% back
      // Best-effort real refund through Bank Alfalah for card payments.
      if (b.payment.method === 'card' && b.payment.orderId && b.payment.txnId) {
        try { await refundOrder(b.payment.orderId, b.payment.txnId, refund); } catch { /* record even if gateway async */ }
      }
      await prisma.payment.update({ where: { bookingId: b.id }, data: { status: 'refunded', refundAmount: refund } });
    }
  }
  await prisma.booking.update({ where: { id: b.id }, data: { status: 'cancelled' } });

  if (refund > 0) {
    await notify(b.userId, 'rotate-ccw', 'Refund initiated 💸',
      `PKR ${refund.toLocaleString('en-PK')} will be refunded for your cancelled ${b.serviceName} (30% cancellation fee applied).`, { bookingId: b.id });
  } else if (b.payment?.status === 'paid') {
    await notify(b.userId, 'x-circle', 'Booking cancelled', `Your ${b.serviceName} was cancelled. Refund window (30 days) has passed, so no refund applies.`, { bookingId: b.id });
  }
  ok(res, { ok: true, refund, refundEligible });
}));

// Live location sharing: caller pushes their GPS; we store it on the booking as
// the customer's (destination) or the cleaner's (moving) point, by role.
app.post('/bookings/:id/location', requireAuth, wrap(async (req, res) => {
  const { lat, lng } = req.body as { lat: number; lng: number };
  if (typeof lat !== 'number' || typeof lng !== 'number') throw httpError(400, 'lat/lng required');
  const b = await prisma.booking.findUnique({ where: { id: req.params.id }, include: { cleaner: true } });
  if (!b) return res.status(404).json({ error: 'Booking not found' });
  const isCustomer = b.userId === req.userId;
  const isPro = !!b.cleaner?.userId && b.cleaner.userId === req.userId;
  if (isCustomer) await prisma.booking.update({ where: { id: b.id }, data: { custLat: lat, custLng: lng } });
  else if (isPro) await prisma.booking.update({ where: { id: b.id }, data: { proLat: lat, proLng: lng, proAt: new Date() } });
  else return res.status(403).json({ error: 'Not part of this booking' });
  ok(res, { ok: true });
}));


// ─── Chat ────────────────────────────────────────────────────────────
app.get('/conversations', requireAuth, wrap(async (req, res) => {
  const viewer = await myChatRole(req.userId!);
  // Customer → their bookings with a cleaner. Cleaner → jobs assigned to them.
  let where: any;
  if (viewer === 'cleaner') {
    const me = await getMyCleaner(req.userId!);
    where = { cleanerId: me.id };
  } else {
    where = { userId: req.userId!, cleanerId: { not: null } };
  }
  const bookings = await prisma.booking.findMany({
    where,
    include: { cleaner: true, user: true, messages: { orderBy: { createdAt: 'desc' }, take: 1 } },
    orderBy: { createdAt: 'desc' },
  });
  const initialsOf = (n: string) => n.split(' ').map((x) => x[0]).slice(0, 2).join('').toUpperCase() || 'HS';
  const otherRole = viewer === 'cleaner' ? 'client' : 'cleaner';
  const convos = await Promise.all(bookings.map(async (b) => {
    const last = b.messages[0];
    const unread = await prisma.message.count({ where: { bookingId: b.id, senderRole: otherRole, read: false } });
    const other = viewer === 'cleaner'
      ? { name: b.user?.name?.trim() || 'Customer', initials: initialsOf(b.user?.name?.trim() || 'Customer') }
      : { name: b.cleaner?.name || 'Cleaner', initials: b.cleaner?.initials || 'C' };
    // Online = the cleaner's availability toggle (only meaningful for the customer's view).
    const online = viewer === 'cleaner' ? false : !!b.cleaner?.available;
    return {
      bookingId: b.id,
      name: other.name,
      initials: other.initials,
      online,
      cleaner: serializeCleaner(b.cleaner),
      lastMessage: last?.text ?? 'Say hello 👋',
      lastTime: last ? new Date(last.createdAt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }) : '',
      unread,
      serviceName: b.serviceName,
    };
  }));
  ok(res, convos);
}));

// Viewer-relative header info for a conversation: who's on the OTHER side.
app.get('/conversations/:bookingId/meta', requireAuth, wrap(async (req, res) => {
  const viewer = await myChatRole(req.userId!);
  const b = await prisma.booking.findUnique({
    where: { id: req.params.bookingId }, include: { cleaner: { include: { user: true } }, user: true },
  });
  if (!b) return res.status(404).json({ error: 'Conversation not found' });
  const initialsOf = (n: string) => n.split(' ').map((x) => x[0]).slice(0, 2).join('').toUpperCase() || 'HS';
  const other = viewer === 'client'
    ? { name: b.cleaner?.name ?? 'Cleaner', initials: b.cleaner?.initials ?? 'C', phone: b.cleaner?.user?.phone ?? '' }
    : { name: b.user?.name?.trim() || 'Customer', initials: initialsOf(b.user?.name?.trim() || 'Customer'), phone: b.user?.phone ?? '' };
  const online = viewer === 'client' ? !!b.cleaner?.available : false;
  ok(res, { name: other.name, initials: other.initials, phone: other.phone, online, service: b.serviceName, status: b.status });
}));

app.get('/conversations/:bookingId/messages', requireAuth, wrap(async (req, res) => {
  const viewer = await myChatRole(req.userId!);
  const msgs = await prisma.message.findMany({ where: { bookingId: req.params.bookingId }, orderBy: { createdAt: 'asc' } });
  ok(res, msgs.map((m) => serializeMessage(m, viewer)));
}));

app.post('/conversations/:bookingId/messages', requireAuth, wrap(async (req, res) => {
  const bookingId = req.params.bookingId;
  const { text } = req.body as { text: string };
  const sender = await myChatRole(req.userId!);
  const msg = await prisma.message.create({ data: { bookingId, senderRole: sender, text } });

  // Notify the OTHER party so their unread badge + notifications update live.
  const booking = await prisma.booking.findUnique({ where: { id: bookingId }, include: { cleaner: true } });
  if (booking) {
    const recipientId = sender === 'client' ? booking.cleaner?.userId : booking.userId;
    const senderName = sender === 'client' ? 'Customer' : (booking.cleaner?.name ?? 'Your cleaner');
    if (recipientId && recipientId !== req.userId) {
      await notify(recipientId, 'message-circle', `New message from ${senderName}`,
        text.length > 80 ? text.slice(0, 77) + '…' : text, { bookingId });
    }
  }
  ok(res, serializeMessage(msg, sender)); // fromMe = true for the sender
}));

// Mark the OTHER party's messages in this conversation as read (viewer-relative).
app.post('/conversations/:bookingId/read', requireAuth, wrap(async (req, res) => {
  const viewer = await myChatRole(req.userId!);
  await prisma.message.updateMany({
    where: { bookingId: req.params.bookingId, senderRole: { not: viewer }, read: false }, data: { read: true },
  });
  ok(res, { ok: true });
}));

// ─── Payments ────────────────────────────────────────────────────────

// Mark a booking paid and (payment-first) activate + broadcast a pending one.
async function activateAfterPayment(bookingId: string, txnId: string) {
  await prisma.booking.update({ where: { id: bookingId }, data: { invoiceNo: 'INV-' + bookingId } }).catch(() => {});
  const b = await prisma.booking.findUnique({ where: { id: bookingId } });
  if (b && b.status === 'pending') {
    await prisma.booking.update({ where: { id: bookingId }, data: { status: 'confirmed' } });
    if (!b.cleanerId) {
      await notify(b.userId, 'search', 'Finding a cleaner', `Payment received — we're sending your ${b.serviceName} request to cleaners nearby…`, { bookingId });
      await broadcastRequest(bookingId, b.serviceName, b.scheduledType === 'later');
    }
  }
}

// Simple (non-gateway) payment record — kept for wallet/bank flows.
app.post('/payments', requireAuth, wrap(async (req, res) => {
  const { bookingId, method, amount } = req.body as { bookingId: string; method: string; amount: number };
  const txnId = 'TXN' + Date.now().toString().slice(-6);
  await prisma.payment.upsert({
    where: { bookingId },
    create: { bookingId, method, amount, txnId, status: 'paid' },
    update: { method, amount, txnId, status: 'paid' },
  }).catch(() => {});
  await activateAfterPayment(bookingId, txnId);
  ok(res, { ok: true, txnId, invoiceNo: 'INV-' + bookingId });
}));

// ── Bank Alfalah (MPGS) Hosted Checkout ──
// 1) Create a gateway session for a booking → returns a launcher URL.
app.post('/payments/session', requireAuth, wrap(async (req, res) => {
  const { bookingId } = req.body as { bookingId: string };
  const b = await prisma.booking.findUnique({ where: { id: bookingId } });
  if (!b) throw httpError(404, 'Booking not found');
  if (b.userId !== req.userId) throw httpError(403, 'Not your booking');
  const orderId = `HS-${bookingId.slice(-8)}-${Date.now().toString().slice(-6)}`;
  const returnUrl = `${SELF_URL}/payments/return?order=${orderId}`;
  const s = await createCheckoutSession(orderId, b.total, returnUrl);
  if (s.result !== 'SUCCESS' || !s.session?.id) throw httpError(502, 'Payment gateway is unavailable. Please try again.');
  await prisma.payment.upsert({
    where: { bookingId },
    create: { bookingId, method: 'card', amount: b.total, txnId: '', status: 'pending', orderId, sessionId: s.session.id, successIndicator: s.successIndicator ?? null },
    update: { method: 'card', amount: b.total, status: 'pending', txnId: '', orderId, sessionId: s.session.id, successIndicator: s.successIndicator ?? null },
  });
  ok(res, { launchUrl: `${SELF_URL}/pay?order=${orderId}`, orderId, sessionId: s.session.id });
}));

// 2) Serve the Checkout.js launcher that redirects to the hosted payment page.
app.get('/pay', wrap(async (req, res) => {
  const orderId = String(req.query.order || '');
  const p = await prisma.payment.findFirst({ where: { orderId } });
  if (!p?.sessionId) { res.status(404).send('Invalid or expired payment session.'); return; }
  const cancelUrl = `${SELF_URL}/payments/return?order=${orderId}&status=cancel`;
  res.type('html').send(launcherHtml(p.sessionId, cancelUrl));
}));

// 3) Gateway returns here → verify → activate booking → bounce back to the app.
app.get('/payments/return', wrap(async (req, res) => {
  const orderId = String(req.query.order || '');
  const resultIndicator = String(req.query.resultIndicator || '');
  const cancelled = String(req.query.status || '') === 'cancel';
  const CLIENT = CLIENT_URL;
  const p = await prisma.payment.findFirst({ where: { orderId } });
  if (!p) { res.redirect(CLIENT); return; }

  let success = false;
  if (!cancelled) {
    if (resultIndicator && p.successIndicator && resultIndicator === p.successIndicator) success = true;
    else {
      const o = await retrieveOrder(orderId).catch(() => null);
      const st = o?.status || o?.result;
      success = st === 'CAPTURED' || st === 'SUCCESS' || o?.result === 'SUCCESS';
    }
  }

  if (success) {
    const txnId = 'TXN' + Date.now().toString().slice(-8);
    await prisma.payment.update({ where: { bookingId: p.bookingId }, data: { status: 'paid', txnId } }).catch(() => {});
    await activateAfterPayment(p.bookingId, txnId);
    res.redirect(`${CLIENT}/booking/finding?id=${p.bookingId}`);
  } else {
    await prisma.payment.update({ where: { bookingId: p.bookingId }, data: { status: 'failed' } }).catch(() => {});
    res.redirect(`${CLIENT}/booking/payment?id=${p.bookingId}&failed=1`);
  }
}));

// ─── helpers ─────────────────────────────────────────────────────────
async function loadUser(id: string) {
  const u = await prisma.user.findUnique({ where: { id }, include: { addresses: true, paymentMethods: true } });
  if (!u) throw httpError(401, 'Session expired — please sign in again');
  return u;
}

/** Record an in-app notification and fire an FCM push (push no-ops without a service account). */
/** Normalize a stored user role to a chat sender role. */
function chatRole(role?: string | null): 'client' | 'cleaner' {
  return role === 'pro' || role === 'professional' || role === 'cleaner' ? 'cleaner' : 'client';
}

/** The authenticated user's chat role for this request. */
async function myChatRole(userId: string): Promise<'client' | 'cleaner'> {
  const u = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
  return chatRole(u?.role);
}

async function notify(userId: string, icon: string, title: string, body: string, data?: Record<string, string>) {
  await prisma.notification.create({ data: { userId, icon, title, body } });
  const tokens = await prisma.pushToken.findMany({ where: { userId } });
  for (const t of tokens) await sendPush(t.token, title, body, data);
}

function relativeTime(d: Date): string {
  const secs = Math.floor((Date.now() - new Date(d).getTime()) / 1000);
  if (secs < 60) return 'Just now';
  if (secs < 3600) return `${Math.floor(secs / 60)}m ago`;
  if (secs < 86400) return `${Math.floor(secs / 3600)}h ago`;
  if (secs < 172800) return 'Yesterday';
  return `${Math.floor(secs / 86400)}d ago`;
}

async function resolveCleanerId(cleaner: any): Promise<string | null> {
  if (!cleaner) return null;
  const id = typeof cleaner === 'string' ? cleaner : cleaner.id;
  if (id) {
    const byId = await prisma.cleaner.findUnique({ where: { id } });
    if (byId) return byId.id;
  }
  if (cleaner.name) {
    const byName = await prisma.cleaner.findFirst({ where: { name: cleaner.name } });
    if (byName) return byName.id;
  }
  return null;
}

// ─── Admin portal ────────────────────────────────────────────────────
const ADMIN_KEY = process.env.ADMIN_KEY || 'homeservice-admin';

function requireAdmin(req: express.Request, res: express.Response, next: express.NextFunction) {
  const key = req.headers['x-admin-key'] || req.query.key;
  if (key !== ADMIN_KEY) return res.status(401).json({ error: 'Invalid admin key' });
  next();
}

// Validate the admin passcode (portal login).
app.post('/admin/login', (req, res) => {
  const { password } = req.body as { password?: string };
  if (password !== ADMIN_KEY) return res.status(401).json({ error: 'Wrong passcode' });
  res.json({ ok: true });
});

// Dashboard overview: totals + revenue + recent activity.
app.get('/admin/overview', requireAdmin, wrap(async (_req, res) => {
  const [customers, cleaners, bookings, services, paidAgg, completed, active, recent] = await Promise.all([
    prisma.user.count({ where: { role: 'client' } }),
    prisma.cleaner.count(),
    prisma.booking.count(),
    prisma.service.count(),
    prisma.payment.aggregate({ _sum: { amount: true }, where: { status: 'paid' } }),
    prisma.booking.count({ where: { status: 'completed' } }),
    prisma.booking.count({ where: { status: { in: ['confirmed', 'on_the_way', 'arrived', 'in_progress'] } } }),
    prisma.booking.findMany({ include: bookingInclude, orderBy: { createdAt: 'desc' }, take: 8 }),
  ]);
  ok(res, {
    customers, cleaners, bookings, services, completed, active,
    revenue: paidAgg._sum.amount ?? 0,
    recent: recent.map((b) => ({ ...serializeBooking(b), createdAt: b.createdAt })),
  });
}));

app.get('/admin/bookings', requireAdmin, wrap(async (_req, res) => {
  const list = await prisma.booking.findMany({ include: { ...bookingInclude, user: true }, orderBy: { createdAt: 'desc' } });
  ok(res, list.map((b) => ({ ...serializeBooking(b), customer: b.user?.name || b.user?.phone || '—', createdAt: b.createdAt })));
}));

app.get('/admin/cleaners', requireAdmin, wrap(async (_req, res) => {
  const list = await prisma.cleaner.findMany({ orderBy: [{ rating: 'desc' }] });
  const withCounts = await Promise.all(list.map(async (c) => ({
    ...serializeCleaner(c),
    userLinked: !!c.userId,
    completed: await prisma.booking.count({ where: { cleanerId: c.id, status: 'completed' } }),
  })));
  ok(res, withCounts);
}));

// Identity verifications — documents included (admin only). Pending first.
app.get('/admin/verifications', requireAdmin, wrap(async (req, res) => {
  const status = typeof req.query.status === 'string' ? req.query.status : undefined;
  const where: any = { userId: { not: null } };
  if (status && status !== 'all') where.verifStatus = status;
  const list = await prisma.cleaner.findMany({ where, include: { user: true }, orderBy: { verifAt: 'desc' } });
  const rank: any = { pending: 0, rejected: 1, verified: 2, unverified: 3 };
  const rows = list.map(serializeVerification).sort((a, b) => (rank[a.verifStatus] ?? 9) - (rank[b.verifStatus] ?? 9));
  ok(res, rows);
}));

// Approve or reject a cleaner's identity verification.
app.post('/admin/cleaners/:id/verify', requireAdmin, wrap(async (req, res) => {
  const { status, note } = req.body as any;
  if (!['verified', 'rejected', 'pending', 'unverified'].includes(status)) throw httpError(400, 'Invalid status');
  const c = await prisma.cleaner.update({
    where: { id: req.params.id },
    data: { verifStatus: status, verifNote: status === 'rejected' ? (note || 'Documents could not be verified.') : null, verifAt: new Date() },
  });
  if (c.userId) {
    const verified = status === 'verified';
    await notify(
      c.userId,
      verified ? 'check-circle' : 'alert-circle',
      verified ? 'You are verified ✅' : 'Verification update',
      verified ? 'Your identity is verified. You can now accept jobs.' : (c.verifNote || 'Please re-submit your documents.'),
      {},
    );
  }
  ok(res, serializeVerification(c));
}));

app.get('/admin/customers', requireAdmin, wrap(async (_req, res) => {
  const list = await prisma.user.findMany({ where: { role: 'client' }, include: { _count: { select: { bookings: true } } }, orderBy: { createdAt: 'desc' } });
  ok(res, list.map((u) => ({ id: u.id, name: u.name || '—', phone: u.phone || '—', email: u.email || '—', location: u.location || '—', bookings: u._count.bookings, joined: u.createdAt })));
}));

app.get('/admin/services', requireAdmin, wrap(async (_req, res) => {
  const list = await prisma.service.findMany({ include: { addOns: true } });
  ok(res, list.map(serializeService));
}));

// Admin creates a new service (catalogue entry).
app.post('/admin/services', requireAdmin, wrap(async (req, res) => {
  const b = req.body as any;
  const name: string = (b.name || '').trim();
  if (!name) throw httpError(400, 'Service name is required');
  const slug = (b.id || name).toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  const exists = await prisma.service.findUnique({ where: { id: slug } });
  if (exists) throw httpError(409, 'A service with this name/slug already exists');
  const included: string[] = Array.isArray(b.included)
    ? b.included
    : String(b.included || '').split('\n').map((s: string) => s.trim()).filter(Boolean);
  const created = await prisma.service.create({
    data: {
      id: slug,
      name,
      tagline: b.tagline || '',
      category: b.category || 'General',
      categoryColor: b.categoryColor || '#0B7C82',
      categoryBg: b.categoryBg || '#E6F4F4',
      basePrice: Number(b.basePrice) || 0,
      unitLabel: b.unitLabel || 'per service',
      unitNoun: b.unitNoun || 'service',
      duration: b.duration || '1-2 hrs',
      rating: 0,
      reviews: 0,
      icon: b.icon || 'broom',
      gradientStart: b.gradientStart || '#0B7C82',
      gradientEnd: b.gradientEnd || '#13A8B0',
      description: b.description || '',
      includedJson: JSON.stringify(included),
    },
    include: { addOns: true },
  });
  ok(res, serializeService(created));
}));

// Admin deletes a service.
app.delete('/admin/services/:id', requireAdmin, wrap(async (req, res) => {
  await prisma.service.delete({ where: { id: req.params.id } }).catch(() => { throw httpError(409, 'Cannot delete — service may have bookings.'); });
  ok(res, { ok: true });
}));

app.get('/admin/payments', requireAdmin, wrap(async (_req, res) => {
  const list = await prisma.payment.findMany({ include: { booking: { include: { user: true } } }, orderBy: { createdAt: 'desc' } });
  ok(res, list.map((p) => ({ id: p.id, amount: p.amount, method: p.method, status: p.status, txnId: p.txnId, service: p.booking?.serviceName ?? '—', customer: p.booking?.user?.name || p.booking?.user?.phone || '—', createdAt: p.createdAt })));
}));

// Admin cancels a booking → reflects live in the customer + cleaner apps.
app.post('/admin/bookings/:id/cancel', requireAdmin, wrap(async (req, res) => {
  const b = await prisma.booking.update({ where: { id: req.params.id }, data: { status: 'cancelled' } });
  await notify(b.userId, 'x-circle', 'Booking cancelled', `Your ${b.serviceName} booking was cancelled by support.`, { bookingId: b.id });
  ok(res, { ok: true });
}));

// Admin toggles a cleaner online/offline (controls whether they get dispatched).
app.post('/admin/cleaners/:id/toggle', requireAdmin, wrap(async (req, res) => {
  const c = await prisma.cleaner.findUnique({ where: { id: req.params.id } });
  if (!c) throw httpError(404, 'Cleaner not found');
  const u = await prisma.cleaner.update({ where: { id: c.id }, data: { available: !c.available } });
  ok(res, { ok: true, available: u.available });
}));

// Admin assigns / reassigns a cleaner (resource) to a booking.
app.post('/admin/bookings/:id/assign', requireAdmin, wrap(async (req, res) => {
  const { cleanerId } = req.body as { cleanerId: string };
  const c = await prisma.cleaner.findUnique({ where: { id: cleanerId } });
  if (!c) throw httpError(404, 'Cleaner not found');
  const b = await prisma.booking.update({ where: { id: req.params.id }, data: { cleanerId, accepted: true } });
  await notify(b.userId, 'user-check', 'Cleaner assigned ✅', `${c.name} has been assigned to your ${b.serviceName}.`, { bookingId: b.id });
  if (c.userId) await notify(c.userId, 'briefcase', 'New job assigned', `Admin assigned you a ${b.serviceName} job.`, { bookingId: b.id });
  ok(res, { ok: true, cleaner: c.name });
}));

// Admin creates a managed cleaner (resource).
app.post('/admin/cleaners', requireAdmin, wrap(async (req, res) => {
  const name = (req.body.name || '').trim();
  if (!name) throw httpError(400, 'Cleaner name is required');
  const c = await prisma.cleaner.create({
    data: {
      name, initials: initialsOf(name),
      rating: Number(req.body.rating) || 0,
      jobs: Number(req.body.jobs) || 0,
      distanceKm: Number(req.body.distanceKm) || 1,
      bio: req.body.bio || null,
      available: true,
    },
  });
  ok(res, serializeCleaner(c));
}));

// Admin removes a cleaner (unlinks their bookings first).
app.delete('/admin/cleaners/:id', requireAdmin, wrap(async (req, res) => {
  await prisma.booking.updateMany({ where: { cleanerId: req.params.id }, data: { cleanerId: null } });
  await prisma.favorite.deleteMany({ where: { cleanerId: req.params.id } });
  await prisma.cleaner.delete({ where: { id: req.params.id } });
  ok(res, { ok: true });
}));

// Serve the admin portal (single-page dashboard). cwd = server/ under tsx (ESM).
app.get('/admin', (_req, res) => res.sendFile(path.join(process.cwd(), 'public', 'admin.html')));

const PORT = Number(process.env.PORT) || 4000;
app.listen(PORT, () => {
  console.log(`🚀 HomeService API running on http://localhost:${PORT}`);
  console.log(`🛠️  Admin portal at http://localhost:${PORT}/admin`);
});
