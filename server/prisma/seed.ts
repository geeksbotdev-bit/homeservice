import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
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
  const services = [
    {
      id: 'bathroom', name: 'Bathroom Cleaning', tagline: 'Tiles, fixtures, deep scrub',
      category: 'QUICK', categoryColor: '#0B7C82', categoryBg: '#E6F4F5',
      basePrice: 1200, unitLabel: 'per bathroom', unitNoun: 'bathroom', duration: '1–2 hrs',
      rating: 4.8, reviews: 312, icon: 'shower', gradientStart: '#0B7C82', gradientEnd: '#1DB8C2',
      description: 'A thorough bathroom clean by our background-verified HomeService professionals — using eco-friendly, fragrance-free cleaning products safe for families and children.',
      includedJson: JSON.stringify(['Toilet scrub & disinfection', 'Tiles & grout deep cleaning', 'Mirror & fixture polishing', 'Sink, countertop & vanity wipe-down', 'Floor mopping & drain cleaning', 'All cleaning supplies provided']),
      addOns: [
        { key: 'toilet', name: 'Toilet Deep Disinfection', desc: 'Hospital-grade disinfectant used', price: 300 },
        { key: 'window', name: 'Window & Glass Cleaning', desc: 'Interior windows & all mirrors', price: 500 },
        { key: 'cabinet', name: 'Cabinet Interior Cleaning', desc: 'Inside all bathroom cabinets & shelves', price: 400 },
      ],
    },
    {
      id: 'kitchen', name: 'Kitchen Cleaning', tagline: 'Stove, counter, sink, cabinets',
      category: 'POPULAR', categoryColor: '#D68910', categoryBg: '#FEF3DC',
      basePrice: 1500, unitLabel: 'per kitchen', unitNoun: 'kitchen', duration: '2–3 hrs',
      rating: 4.9, reviews: 198, icon: 'pot-steam', gradientStart: '#E67E22', gradientEnd: '#F39C12',
      description: 'Complete kitchen deep-clean: degreased stove and hood, sanitised counters and sink, wiped cabinet fronts and appliances — leaving your kitchen spotless and hygienic.',
      includedJson: JSON.stringify(['Stove & hood degreasing', 'Countertop & backsplash cleaning', 'Sink scrub & sanitisation', 'Cabinet front wipe-down', 'Appliance exterior cleaning', 'Floor mopping & all supplies provided']),
      addOns: [
        { key: 'fridge', name: 'Refrigerator Interior', desc: 'Inside fridge clean & deodorise', price: 400 },
        { key: 'oven', name: 'Oven Deep Clean', desc: 'Interior oven degrease', price: 600 },
        { key: 'cabinet', name: 'Cabinet Interior Cleaning', desc: 'Inside all kitchen cabinets', price: 500 },
      ],
    },
    {
      id: 'general', name: 'General Cleaning', tagline: 'All rooms, dusting, mopping',
      category: 'FULL HOME', categoryColor: '#7C3AED', categoryBg: '#EDE9FE',
      basePrice: 2500, unitLabel: 'per home', unitNoun: 'home', duration: '3–4 hrs',
      rating: 4.7, reviews: 445, icon: 'broom', gradientStart: '#7C3AED', gradientEnd: '#9B6DFF',
      description: 'Full-home cleaning by a team of two: every room dusted, floors mopped, surfaces sanitised. Ideal for routine upkeep or pre-event preparation.',
      includedJson: JSON.stringify(['All rooms dusted & tidied', 'Floor sweeping & mopping', 'Surface sanitisation', 'Bins emptied', 'Skirting & switch wipe-down', 'Team of 2 · all supplies provided']),
      addOns: [
        { key: 'balcony', name: 'Balcony & Terrace', desc: 'Sweep & wash outdoor areas', price: 400 },
        { key: 'windows', name: 'Windows & Glass', desc: 'All interior windows & mirrors', price: 600 },
        { key: 'ironing', name: 'Laundry & Ironing', desc: 'Up to 2 hours of laundry', price: 800 },
      ],
    },
  ];

  for (const s of services) {
    const { addOns, ...svc } = s;
    await prisma.service.create({ data: { ...svc, addOns: { create: addOns } } });
  }

  // ── Cleaners ──
  const sara = await prisma.cleaner.create({ data: { name: 'Sara Ahmad', initials: 'SA', rating: 4.9, jobs: 312, distanceKm: 1.2, bio: 'Specialist in bathroom & kitchen deep cleans. 3 years with HomeService.', preferred: true } });
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

  console.log('✅ Seed complete: 3 services, 3 cleaners, 1 user, 3 bookings.');
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
