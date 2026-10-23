import { PrismaClient } from '@prisma/client';
import { seedServices } from './services.js';
const prisma = new PrismaClient();

async function main() {
  // Idempotent: if the catalogue is already seeded, do nothing (protects real
  // customer/booking data across redeploys).
  const already = await prisma.service.count();
  if (already > 0) {
    console.log('Seed skipped — database already has data.');
    return;
  }

  // Clear (order matters for FKs)
  await prisma.message.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.bookingAddOn.deleteMany();
  await prisma.booking.deleteMany();
  await prisma.addOn.deleteMany();
  await prisma.service.deleteMany();
  await prisma.address.deleteMany();
  await prisma.paymentMethod.deleteMany();
  await prisma.pushToken.deleteMany();
  await prisma.cleaner.deleteMany();
  await prisma.user.deleteMany();
  // ── Services ──
  await seedServices(prisma);

  // ── Cleaners ──
  const sara = await prisma.cleaner.create({ data: { name: 'Sara Ahmad', initials: 'SA', rating: 4.9, jobs: 312, distanceKm: 1.2, bio: 'Specialist in bathroom & kitchen deep cleans. 3 years with WithUrooj.', preferred: true } });
  const maria = await prisma.cleaner.create({ data: { name: 'Maria Khan', initials: 'MK', rating: 4.8, jobs: 187, distanceKm: 2.1, bio: 'Detail-focused, great with full-home cleaning.' } });
  const ali = await prisma.cleaner.create({ data: { name: 'Ali Zaman', initials: 'AZ', rating: 4.7, jobs: 96, distanceKm: 3.4, bio: 'Reliable and punctual. Kitchen specialist.' } });

  // ── Demo user ──
  const user = await prisma.user.create({
    data: {
      name: 'Fatima Ahmed', phone: '+92 312 3456789', email: 'fatima.ahmed@example.com',
      role: 'client', location: 'DHA Phase 5, Lahore',
      addresses: { create: [
        { label: 'Home', line1: 'House 42, Street 7, Block D', area: 'DHA Phase 5, Lahore', isDefault: true },
        { label: 'Office', line1: 'Plaza 12, Gulberg III', area: 'Lahore' },
      ] },
      paymentMethods: { create: [
        { type: 'bank', name: 'Bank Transfer', detail: 'Meezan Bank •••• 1234', isDefault: true },
        { type: 'easypaisa', name: 'Easypaisa', detail: '0312 •••• 789' },
        { type: 'jazzcash', name: 'JazzCash', detail: '0300 •••• 456' },
      ] },
    },
  });

  const addr = 'House 42, Street 7, Block D, DHA Phase 5, Lahore';

  // ── Bookings ──
  const b1 = await prisma.booking.create({ data: {
    userId: user.id, serviceId: 'bathroom', serviceName: 'Bathroom Cleaning', status: 'on_the_way',
    scheduledType: 'now', dateLabel: 'Today, 24 June 2025', timeLabel: '10:00 AM', address: addr,
    total: 1785, cleanerId: sara.id, accepted: true, addOns: { create: [{ name: 'Window & Glass Cleaning', price: 500 }] },
  } });
  // A NEW request for the cleaner to Accept/Reject (assigned to Sara, not yet accepted).
  await prisma.booking.create({ data: {
    userId: user.id, serviceId: 'kitchen', serviceName: 'Kitchen Cleaning', status: 'confirmed',
    scheduledType: 'now', dateLabel: 'Today, 24 June 2025', timeLabel: '2:00 PM', address: addr,
    total: 1575, cleanerId: sara.id, accepted: false, addOns: { create: [{ name: 'Refrigerator Interior', price: 400 }] },
  } });
  await prisma.booking.create({ data: {
    userId: user.id, serviceId: 'general', serviceName: 'General Cleaning', status: 'completed',
    scheduledType: 'later', dateLabel: 'Sat, 14 June 2025', timeLabel: '11:00 AM', address: addr,
    total: 3255, cleanerId: maria.id, accepted: true, rating: 5, addOns: { create: [{ name: 'Windows & Glass', price: 600 }] },
  } });

  // ── Messages for b1 ──
  await prisma.message.createMany({ data: [
    { bookingId: b1.id, senderRole: 'cleaner', text: "Salam! I'm on my way. Will arrive in about 10 minutes insha'Allah." },
    { bookingId: b1.id, senderRole: 'client', text: 'JazakAllah! Main ghar par hoon. Main door open kar deti hoon.', read: true },
    { bookingId: b1.id, senderRole: 'cleaner', text: 'Shukriya! Please ensure the main entrance is unlocked. 🙏' },
  ] });

  const n = await prisma.service.count();
  console.log(`✅ Seed complete: ${n} services, 3 cleaners, 1 user, 3 bookings.`);
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
