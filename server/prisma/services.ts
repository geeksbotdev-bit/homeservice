/**
 * The live service catalogue.
 *
 * Kept apart from the demo seed so the services can be loaded on their own —
 * a database with real customers in it should not be given fake cleaners and
 * sample bookings just to get the catalogue back.
 */
export const SERVICES = [
  {
    id: 'bathroom', name: 'Bathroom Cleaning', tagline: 'Tiles, fixtures, deep scrub',
    category: 'QUICK', categoryColor: '#0B7C82', categoryBg: '#E6F4F5',
    basePrice: 1200, unitLabel: 'per bathroom', unitNoun: 'bathroom', duration: '1–2 hrs',
    rating: 4.8, reviews: 312, icon: 'shower', gradientStart: '#0B7C82', gradientEnd: '#1DB8C2',
    description: 'A thorough bathroom clean by our background-verified WithUrooj professionals — using eco-friendly, fragrance-free cleaning products safe for families and children.',
    sheetGroup: 'Home Cleaning',
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
    sheetGroup: 'Home Cleaning',
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
    sheetGroup: 'Home Cleaning',
    includedJson: JSON.stringify(['All rooms dusted & tidied', 'Floor sweeping & mopping', 'Surface sanitisation', 'Bins emptied', 'Skirting & switch wipe-down', 'Team of 2 · all supplies provided']),
    addOns: [
      { key: 'balcony', name: 'Balcony & Terrace', desc: 'Sweep & wash outdoor areas', price: 400 },
      { key: 'windows', name: 'Windows & Glass', desc: 'All interior windows & mirrors', price: 600 },
      { key: 'ironing', name: 'Laundry & Ironing', desc: 'Up to 2 hours of laundry', price: 800 },
    ],
  },
];

/** Insert any of these that are missing. Existing rows are left untouched. */
export async function seedServices(prisma: any) {
  let added = 0;
  for (const s of SERVICES) {
    const { addOns, ...svc } = s as any;
    const exists = await prisma.service.findUnique({ where: { id: svc.id } });
    if (exists) continue;
    await prisma.service.create({ data: { ...svc, addOns: { create: addOns } } });
    added++;
  }
  return added;
}
