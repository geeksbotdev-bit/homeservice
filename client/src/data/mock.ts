import { colors } from '../theme/theme';
import type { Service, Cleaner, Booking, Conversation, ChatMessage, User, AppNotification } from './types';

export const SERVICES: Service[] = [
  {
    id: 'bathroom',
    name: 'Bathroom Cleaning',
    tagline: 'Tiles, fixtures, deep scrub',
    category: 'QUICK',
    categoryColor: colors.primary,
    categoryBg: colors.primary50,
    basePrice: 1200,
    unitLabel: 'per bathroom',
    unitNoun: 'bathroom',
    duration: '1–2 hrs',
    rating: 4.8,
    reviews: 312,
    icon: 'shower',
    gradient: ['#0B7C82', '#1DB8C2'],
    description:
      'A thorough bathroom clean by our background-verified HomeService professionals — using eco-friendly, fragrance-free cleaning products safe for families and children.',
    included: [
      'Toilet scrub & disinfection',
      'Tiles & grout deep cleaning',
      'Mirror & fixture polishing',
      'Sink, countertop & vanity wipe-down',
      'Floor mopping & drain cleaning',
      'All cleaning supplies provided',
    ],
    addOns: [
      { id: 'toilet', name: 'Toilet Deep Disinfection', desc: 'Hospital-grade disinfectant used', price: 300 },
      { id: 'window', name: 'Window & Glass Cleaning', desc: 'Interior windows & all mirrors', price: 500 },
      { id: 'cabinet', name: 'Cabinet Interior Cleaning', desc: 'Inside all bathroom cabinets & shelves', price: 400 },
    ],
  },
  {
    id: 'kitchen',
    name: 'Kitchen Cleaning',
    tagline: 'Stove, counter, sink, cabinets',
    category: 'POPULAR',
    categoryColor: colors.accent600,
    categoryBg: colors.accent50,
    basePrice: 1500,
    unitLabel: 'per kitchen',
    unitNoun: 'kitchen',
    duration: '2–3 hrs',
    rating: 4.9,
    reviews: 198,
    icon: 'pot-steam',
    gradient: ['#E67E22', '#F39C12'],
    description:
      'Complete kitchen deep-clean: degreased stove and hood, sanitised counters and sink, wiped cabinet fronts and appliances — leaving your kitchen spotless and hygienic.',
    included: [
      'Stove & hood degreasing',
      'Countertop & backsplash cleaning',
      'Sink scrub & sanitisation',
      'Cabinet front wipe-down',
      'Appliance exterior cleaning',
      'Floor mopping & all supplies provided',
    ],
    addOns: [
      { id: 'fridge', name: 'Refrigerator Interior', desc: 'Inside fridge clean & deodorise', price: 400 },
      { id: 'oven', name: 'Oven Deep Clean', desc: 'Interior oven degrease', price: 600 },
      { id: 'cabinet', name: 'Cabinet Interior Cleaning', desc: 'Inside all kitchen cabinets', price: 500 },
    ],
  },
  {
    id: 'general',
    name: 'General Cleaning',
    tagline: 'All rooms, dusting, mopping',
    category: 'FULL HOME',
    categoryColor: colors.arrived,
    categoryBg: colors.arrivedBg,
    basePrice: 2500,
    unitLabel: 'per home',
    unitNoun: 'home',
    duration: '3–4 hrs',
    rating: 4.7,
    reviews: 445,
    icon: 'broom',
    gradient: ['#7C3AED', '#9B6DFF'],
    description:
      'Full-home cleaning by a team of two: every room dusted, floors mopped, surfaces sanitised. Ideal for routine upkeep or pre-event preparation.',
    included: [
      'All rooms dusted & tidied',
      'Floor sweeping & mopping',
      'Surface sanitisation',
      'Bins emptied',
      'Skirting & switch wipe-down',
      'Team of 2 · all supplies provided',
    ],
    addOns: [
      { id: 'balcony', name: 'Balcony & Terrace', desc: 'Sweep & wash outdoor areas', price: 400 },
      { id: 'windows', name: 'Windows & Glass', desc: 'All interior windows & mirrors', price: 600 },
      { id: 'ironing', name: 'Laundry & Ironing', desc: 'Up to 2 hours of laundry', price: 800 },
    ],
  },
];

export const CLEANERS: Cleaner[] = [
  { id: 'sara', name: 'Sara Ahmad', initials: 'SA', rating: 4.9, jobs: 312, distanceKm: 1.2, bio: 'Specialist in bathroom & kitchen deep cleans. 3 years with HomeService.', preferred: true },
  { id: 'maria', name: 'Maria Khan', initials: 'MK', rating: 4.8, jobs: 187, distanceKm: 2.1, bio: 'Detail-focused, great with full-home cleaning.' },
  { id: 'ali', name: 'Ali Zaman', initials: 'AZ', rating: 4.7, jobs: 96, distanceKm: 3.4, bio: 'Reliable and punctual. Kitchen specialist.' },
];

export const BOOKINGS: Booking[] = [
  {
    id: 'HS-2025-00124',
    service: 'Bathroom Cleaning',
    addOns: ['Window & Glass Cleaning'],
    status: 'on_the_way',
    scheduledType: 'now',
    dateLabel: 'Today, 24 June 2025',
    timeLabel: '10:00 AM',
    address: 'House 42, Street 7, Block D, DHA Phase 5, Lahore',
    total: 1785,
    cleaner: CLEANERS[0],
  },
  {
    id: 'HS-2025-00118',
    service: 'Kitchen Cleaning',
    addOns: [],
    status: 'confirmed',
    scheduledType: 'later',
    dateLabel: 'Wed, 25 June 2025',
    timeLabel: '9:00 AM',
    address: 'House 42, Street 7, Block D, DHA Phase 5, Lahore',
    total: 1575,
    cleaner: CLEANERS[2],
  },
  {
    id: 'HS-2025-00097',
    service: 'General Cleaning',
    addOns: ['Windows & Glass'],
    status: 'completed',
    scheduledType: 'later',
    dateLabel: 'Sat, 14 June 2025',
    timeLabel: '11:00 AM',
    address: 'House 42, Street 7, Block D, DHA Phase 5, Lahore',
    total: 3255,
    cleaner: CLEANERS[1],
    rating: 5,
  },
  {
    id: 'HS-2025-00081',
    service: 'Bathroom Cleaning',
    addOns: [],
    status: 'cancelled',
    scheduledType: 'now',
    dateLabel: 'Mon, 2 June 2025',
    timeLabel: '3:00 PM',
    address: 'House 42, Street 7, Block D, DHA Phase 5, Lahore',
    total: 1260,
    cleaner: CLEANERS[0],
  },
];

export const MESSAGES: Record<string, ChatMessage[]> = {
  'HS-2025-00124': [
    { id: 'm1', bookingId: 'HS-2025-00124', fromMe: false, text: "Salam! I'm on my way. Will arrive in about 10 minutes insha'Allah.", time: '9:46 AM' },
    { id: 'm2', bookingId: 'HS-2025-00124', fromMe: true, text: 'JazakAllah! Main ghar par hoon. Main door open kar deti hoon.', time: '9:47 AM', read: true },
    { id: 'm3', bookingId: 'HS-2025-00124', fromMe: false, text: 'Shukriya! Please ensure the main entrance is unlocked. 🙏', time: '9:48 AM' },
    { id: 'm4', bookingId: 'HS-2025-00124', fromMe: true, text: 'Done! 👍', time: '9:49 AM', read: true },
  ],
};

export const CONVERSATIONS: Conversation[] = [
  { bookingId: 'HS-2025-00124', name: CLEANERS[0].name, initials: CLEANERS[0].initials, cleaner: CLEANERS[0], lastMessage: 'Shukriya! Please ensure the main entrance is unlocked. 🙏', lastTime: '9:48 AM', unread: 1, serviceName: 'Bathroom Cleaning' },
  { bookingId: 'HS-2025-00118', name: CLEANERS[2].name, initials: CLEANERS[2].initials, cleaner: CLEANERS[2], lastMessage: 'See you on Wednesday at 9 AM!', lastTime: 'Yesterday', unread: 0, serviceName: 'Kitchen Cleaning' },
];

export const USER: User = {
  name: 'Fatima Ahmed',
  phone: '+92 312 3456789',
  email: 'fatima.ahmed@example.com',
  location: 'DHA Phase 5, Lahore',
  addresses: [
    { id: 'a1', label: 'Home', line1: 'House 42, Street 7, Block D', area: 'DHA Phase 5, Lahore', isDefault: true },
    { id: 'a2', label: 'Office', line1: 'Plaza 12, Gulberg III', area: 'Lahore' },
  ],
  paymentMethods: [
    { id: 'p1', type: 'bank', name: 'Bank Transfer', detail: 'Meezan Bank •••• 1234', isDefault: true },
    { id: 'p2', type: 'easypaisa', name: 'Easypaisa', detail: '0312 •••• 789' },
    { id: 'p3', type: 'jazzcash', name: 'JazzCash', detail: '0300 •••• 456' },
  ],
};

export const NOTIFICATIONS: AppNotification[] = [
  { id: 'n1', icon: 'navigation', title: 'Sara is on the way!', body: 'Your cleaner will arrive in about 10 minutes for your Bathroom Cleaning.', read: false, time: '8 min' },
  { id: 'n2', icon: 'check-circle', title: 'Booking confirmed', body: 'Your Kitchen Cleaning on Wed, 25 June at 9:00 AM is confirmed.', read: false, time: 'Yesterday' },
  { id: 'n3', icon: 'tag', title: '20% off this weekend', body: 'Book any Full Home cleaning before Sunday and save 20%. Use code CLEAN20.', read: true, time: '2 days' },
  { id: 'n4', icon: 'star', title: 'Rate your last clean', body: 'How was your General Cleaning with Maria? Leave a rating to help others.', read: true, time: '3 days' },
];

export const HOMESERVICE_FEE_PCT = 0.05;
