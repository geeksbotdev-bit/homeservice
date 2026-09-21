/**
 * One-off data repair — safe to re-run.
 *
 * 1. Rewrites every stored phone to the canonical +92XXXXXXXXXX shape.
 * 2. Merges accounts that were duplicates of the same number (the app used to
 *    glue "+92" onto whatever was typed, so "0323…" and "323…" became two
 *    users). Bookings, addresses, payment methods, notifications, favorites,
 *    push tokens and the cleaner profile move to the account that is kept.
 * 3. Promotes any user that owns a cleaner profile to role "pro" — a verified
 *    cleaner must never come back as a customer.
 *
 *   npm run db:repair
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

function normalizePhone(raw?: string | null): string {
  const s = String(raw ?? '').replace(/[^\d+]/g, '');
  if (!s) return '';
  const hadPlus = s.startsWith('+') || s.startsWith('00');
  const digits = s.replace(/\D/g, '').replace(/^00/, '');
  if (!digits) return '';
  if (digits.startsWith('92')) return '+92' + digits.slice(2).replace(/^0+/, '');
  if (!hadPlus) return '+92' + digits.replace(/^0+/, '');
  return '+' + digits;
}

/** How "real" an account is — the richest one survives a merge. */
function weigh(u: any) {
  return (u.cleaner ? 1000 : 0) + (u.role === 'pro' ? 500 : 0) + (u.name ? 100 : 0) +
    (u.email ? 10 : 0) + u._count.bookings * 5 + u._count.addresses + u._count.paymentMethods;
}

async function main() {
  const users = await prisma.user.findMany({
    include: { cleaner: true, _count: { select: { bookings: true, addresses: true, paymentMethods: true } } },
  });

  // Group by canonical phone.
  const groups = new Map<string, typeof users>();
  for (const u of users) {
    const p = normalizePhone(u.phone);
    if (!p) continue;
    groups.set(p, [...(groups.get(p) ?? []), u]);
  }

  for (const [phone, list] of groups) {
    const sorted = [...list].sort((a, b) => weigh(b) - weigh(a));
    const keep = sorted[0];
    const drop = sorted.slice(1);

    for (const d of drop) {
      console.log(`merge  ${d.id} (${d.phone || '—'}, "${d.name}") → ${keep.id} ("${keep.name}") for ${phone}`);
      await prisma.$transaction(async (tx) => {
        await tx.booking.updateMany({ where: { userId: d.id }, data: { userId: keep.id } });
        await tx.address.updateMany({ where: { userId: d.id }, data: { userId: keep.id } });
        await tx.paymentMethod.updateMany({ where: { userId: d.id }, data: { userId: keep.id } });
        await tx.notification.updateMany({ where: { userId: d.id }, data: { userId: keep.id } });
        await tx.pushToken.updateMany({ where: { userId: d.id }, data: { userId: keep.id } });
        // Favorites are unique per (user, cleaner) — skip ones the kept user has.
        const favs = await tx.favorite.findMany({ where: { userId: d.id } });
        for (const f of favs) {
          const exists = await tx.favorite.findFirst({ where: { userId: keep.id, cleanerId: f.cleanerId } });
          if (exists) await tx.favorite.delete({ where: { id: f.id } });
          else await tx.favorite.update({ where: { id: f.id }, data: { userId: keep.id } });
        }
        // Keep the duplicate's cleaner profile only if the survivor has none.
        if (d.cleaner && !keep.cleaner) await tx.cleaner.update({ where: { id: d.cleaner.id }, data: { userId: keep.id } });
        else if (d.cleaner) await tx.cleaner.update({ where: { id: d.cleaner.id }, data: { userId: null } });
        // Carry over details the survivor is missing.
        const fill: any = {};
        if (!keep.name && d.name) fill.name = d.name;
        if (!keep.email && d.email) fill.email = d.email;
        if (!keep.firebaseUid && d.firebaseUid) fill.firebaseUid = d.firebaseUid;
        if (!keep.avatarUrl && d.avatarUrl) fill.avatarUrl = d.avatarUrl;
        if (!keep.location && d.location) fill.location = d.location;
        if (d.role === 'pro') fill.role = 'pro';
        await tx.user.delete({ where: { id: d.id } });
        if (Object.keys(fill).length) await tx.user.update({ where: { id: keep.id }, data: fill });
      });
    }

    if (keep.phone !== phone) {
      console.log(`phone  ${keep.id}: "${keep.phone}" → "${phone}"`);
      await prisma.user.update({ where: { id: keep.id }, data: { phone } });
    }
  }

  // Anyone owning a cleaner profile is a professional.
  const pros = await prisma.cleaner.findMany({ where: { NOT: { userId: null } }, select: { userId: true, name: true, user: { select: { role: true, name: true } } } });
  for (const c of pros) {
    if (c.user && c.user.role !== 'pro') {
      console.log(`role   ${c.userId} ("${c.user.name || c.name}") client → pro`);
      await prisma.user.update({ where: { id: c.userId! }, data: { role: 'pro' } });
    }
    // A cleaner profile with a name but an empty account name → mirror it, so
    // login never mistakes the account for an unfinished registration.
    if (c.user && !c.user.name && c.name && c.name !== 'New Cleaner') {
      console.log(`name   ${c.userId}: "" → "${c.name}"`);
      await prisma.user.update({ where: { id: c.userId! }, data: { name: c.name } });
    }
  }

  // Stale OTP rows keyed by a non-canonical phone can never be matched again.
  const otps = await prisma.otp.findMany();
  for (const o of otps) {
    if (normalizePhone(o.phone) !== o.phone) await prisma.otp.delete({ where: { phone: o.phone } }).catch(() => {});
  }

  console.log('\nDone.');
  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
