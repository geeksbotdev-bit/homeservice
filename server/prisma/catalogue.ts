/**
 * The WithUrooj service catalogue, transcribed from the client's category sheet.
 *
 * Two kinds of entry:
 *   · cleaning work  — the sheet lists no prices for these, so they are quoted
 *                      after the job is sized. `quoteOnly` is true and
 *                      `basePrice` stays 0; the app shows "Price on request"
 *                      rather than PKR 0.
 *   · document work  — the sheet gives a fixed PKR price for each, so these are
 *                      bookable at that price.
 *
 * `group` is the sheet's own heading, kept so the app can show the catalogue in
 * the same order and grouping the client works from.
 */

export interface SheetItem {
  id: string;
  name: string;
  /** PKR. 0 means quote-on-request. */
  price?: number;
  /** What one unit is, when the item is charged per something. */
  unit?: string;
}

export interface SheetGroup {
  n: number;
  group: string;
  icon: string;
  color: string;
  bg: string;
  gradientStart: string;
  gradientEnd: string;
  tagline: string;
  items: SheetItem[];
}

export const SHEET: SheetGroup[] = [
  {
    n: 1, group: 'Home Cleaning', icon: 'broom',
    color: '#0B7C82', bg: '#E6F4F5', gradientStart: '#0B7C82', gradientEnd: '#1DB8C2',
    tagline: 'Priced per area — book only the rooms you need',
    items: [
      { id: 'hc-bedroom', name: 'Room / Bedroom', unit: 'room' },
      { id: 'hc-bathroom', name: 'Bathroom / Washroom', unit: 'bathroom' },
      { id: 'hc-lounge', name: 'Lounge / TV Lounge', unit: 'lounge' },
      { id: 'hc-drawing', name: 'Drawing Room', unit: 'room' },
      { id: 'hc-dining', name: 'Dining Room / Area', unit: 'room' },
      { id: 'hc-kitchen', name: 'Kitchen', unit: 'kitchen' },
      { id: 'hc-balcony', name: 'Balcony', unit: 'balcony' },
      { id: 'hc-terrace', name: 'Terrace', unit: 'terrace' },
      { id: 'hc-roof', name: 'Roof', unit: 'roof' },
      { id: 'hc-parking', name: 'Parking Area', unit: 'area' },
      { id: 'hc-store', name: 'Store Room', unit: 'room' },
      { id: 'hc-bedheader', name: 'Bed Header', unit: 'piece' },
    ],
  },
  {
    n: 2, group: 'Sofa Cleaning Services', icon: 'sofa',
    color: '#7C3AED', bg: '#EDE9FE', gradientStart: '#7C3AED', gradientEnd: '#9B6DFF',
    tagline: 'Deep shampoo and extraction, by the seat or as a set',
    items: [
      { id: 'sofa-seat', name: 'Sofa Cleaning per Seat', unit: 'seat' },
      { id: 'sofa-5', name: '5 Seater Sofa Set Cleaning', unit: 'set' },
      { id: 'sofa-6', name: '6 Seater Sofa Set Cleaning', unit: 'set' },
      { id: 'sofa-7', name: '7 Seater Sofa Set Cleaning', unit: 'set' },
      { id: 'sofa-10', name: '10 Seater Sofa Cleaning', unit: 'set' },
      { id: 'sofa-dewan', name: 'Dewan Cleaning', unit: 'dewan' },
      { id: 'sofa-cumbed', name: 'Sofa Cum Bed Cleaning', unit: 'piece' },
    ],
  },
  {
    n: 3, group: 'Chair Cleaning Services', icon: 'chair',
    color: '#D68910', bg: '#FEF3DC', gradientStart: '#E67E22', gradientEnd: '#F39C12',
    tagline: 'Dining and office chairs, priced by the number of seats',
    items: [
      { id: 'chair-4', name: 'Chair Cleaning — 4 Seats', unit: 'set' },
      { id: 'chair-6', name: 'Chair Cleaning — 6 Seats', unit: 'set' },
      { id: 'chair-8', name: 'Chair Cleaning — 8 Seats', unit: 'set' },
      { id: 'chair-10', name: 'Chair Cleaning — 10 Seats', unit: 'set' },
      { id: 'chair-12', name: 'Chair Cleaning — 12 Seats', unit: 'set' },
    ],
  },
  {
    n: 4, group: 'Carpet Cleaning Services', icon: 'rug',
    color: '#B45309', bg: '#FEF0E2', gradientStart: '#B45309', gradientEnd: '#E08A3C',
    tagline: 'Lifted, washed and dried — or cleaned in place',
    items: [
      { id: 'carpet-rug', name: 'Rug Cleaning', unit: 'rug' },
      { id: 'carpet-carpet', name: 'Carpet Cleaning', unit: 'carpet' },
    ],
  },
  {
    n: 5, group: 'Curtain Cleaning Services', icon: 'curtains',
    color: '#0E7490', bg: '#E0F2FE', gradientStart: '#0E7490', gradientEnd: '#38BDF8',
    tagline: 'Taken down, cleaned and re-hung',
    items: [
      { id: 'curtain-curtain', name: 'Curtain Cleaning', unit: 'curtain' },
      { id: 'curtain-blind', name: 'Blind Cleaning', unit: 'blind' },
    ],
  },
  {
    n: 6, group: 'Bed & Mattress Cleaning Services', icon: 'bed',
    color: '#9333EA', bg: '#F3E8FF', gradientStart: '#9333EA', gradientEnd: '#C084FC',
    tagline: 'Dust-mite and stain treatment, then dried',
    items: [
      { id: 'mattress-single', name: 'Single Mattress Cleaning', unit: 'mattress' },
      { id: 'mattress-double', name: 'Double Mattress Cleaning', unit: 'mattress' },
      { id: 'mattress-bed', name: 'Bed Cleaning', unit: 'bed' },
    ],
  },
  {
    n: 7, group: 'Cement Water Tank Cleaning Services', icon: 'water',
    color: '#0369A1', bg: '#E0F2FE', gradientStart: '#0369A1', gradientEnd: '#38BDF8',
    tagline: 'Drained, scrubbed, disinfected and refilled',
    items: [
      { id: 'tank-roof-s', name: 'Roof Top Water Tank — 3x5 ft to 5x5 ft', unit: 'tank' },
      { id: 'tank-roof-m', name: 'Roof Top Water Tank — 6x6 ft to 8x8 ft', unit: 'tank' },
      { id: 'tank-roof-l', name: 'Roof Top Water Tank — 9x9 ft to 12x12 ft', unit: 'tank' },
      { id: 'tank-ground-s', name: 'Ground Water Tank — Small', unit: 'tank' },
      { id: 'tank-ground-m', name: 'Ground Water Tank — Medium', unit: 'tank' },
      { id: 'tank-ground-l', name: 'Ground Water Tank — Large', unit: 'tank' },
    ],
  },
  {
    n: 8, group: 'Car Detailing Services', icon: 'car',
    color: '#1D4ED8', bg: '#E0E7FF', gradientStart: '#1D4ED8', gradientEnd: '#60A5FA',
    tagline: 'Interior and exterior detailing at your home',
    items: [
      { id: 'car-hatchback', name: 'Car Detailing — Hatchback', unit: 'car' },
      { id: 'car-sedan', name: 'Car Detailing — Sedan', unit: 'car' },
      { id: 'car-luxury', name: 'Car Detailing — Luxury Sedan', unit: 'car' },
      { id: 'car-crossover', name: 'Car Detailing — Crossover', unit: 'car' },
      { id: 'car-suv', name: 'Car Detailing — SUV', unit: 'car' },
      { id: 'car-minivan', name: 'Car Detailing — Minivan', unit: 'car' },
    ],
  },
  {
    n: 9, group: 'Commercial Deep Cleaning Services', icon: 'office',
    color: '#334155', bg: '#E2E8F0', gradientStart: '#334155', gradientEnd: '#64748B',
    tagline: 'Out-of-hours cleaning for business premises',
    items: [
      { id: 'comm-office', name: 'Office Deep Cleaning', unit: 'premises' },
      { id: 'comm-restaurant', name: 'Restaurant Deep Cleaning', unit: 'premises' },
      { id: 'comm-institute', name: 'Educational Institute Deep Cleaning', unit: 'premises' },
      { id: 'comm-hospital', name: 'Hospital Deep Cleaning', unit: 'premises' },
      { id: 'comm-salon', name: 'Salon Deep Cleaning', unit: 'premises' },
    ],
  },
  {
    n: 10, group: 'Solar Panel Cleaning Services', icon: 'solar',
    color: '#CA8A04', bg: '#FEF9C3', gradientStart: '#CA8A04', gradientEnd: '#FACC15',
    tagline: 'Dust and residue removed so output recovers',
    items: [
      { id: 'solar-panels', name: 'Solar Panel Cleaning', unit: 'panel' },
    ],
  },
  {
    n: 11, group: 'Sanitization & Disinfection', icon: 'spray',
    color: '#059669', bg: '#D1FAE5', gradientStart: '#059669', gradientEnd: '#34D399',
    tagline: 'Fogging and surface disinfection for homes and offices',
    items: [
      { id: 'sanit-general', name: 'Disinfection & Sanitization', unit: 'visit' },
    ],
  },
  {
    n: 12, group: 'Fumigation & Pest Control', icon: 'pest',
    color: '#B91C1C', bg: '#FEE2E2', gradientStart: '#B91C1C', gradientEnd: '#F87171',
    tagline: 'Treatment with a follow-up where the infestation needs it',
    items: [
      { id: 'pest-termite', name: 'Termite Spray', unit: 'treatment' },
      { id: 'pest-cockroach', name: 'Cockroach Spray', unit: 'treatment' },
      { id: 'pest-ant', name: 'Ant Spray', unit: 'treatment' },
      { id: 'pest-bedbugs', name: 'Bed Bugs Treatment', unit: 'treatment' },
      { id: 'pest-rat', name: 'Rat Control', unit: 'treatment' },
    ],
  },
  {
    n: 13, group: 'Home Movers', icon: 'truck',
    color: '#C2410C', bg: '#FFEDD5', gradientStart: '#C2410C', gradientEnd: '#FB923C',
    tagline: 'Packing, loading and shifting for apartments and homes',
    items: [
      { id: 'mover-apartment', name: 'Home Mover — Apartment', unit: 'move' },
    ],
  },
  {
    n: 14, group: 'Helpers', icon: 'helper',
    color: '#4F46E5', bg: '#E0E7FF', gradientStart: '#4F46E5', gradientEnd: '#818CF8',
    tagline: 'An extra pair of hands, booked by the job',
    items: [
      { id: 'helper-general', name: 'Helper', unit: 'helper' },
    ],
  },
  {
    // These carry the sheet's own prices, so they are bookable as listed.
    n: 15, group: 'Documents & Notary Services', icon: 'document',
    color: '#0F766E', bg: '#CCFBF1', gradientStart: '#0F766E', gradientEnd: '#2DD4BF',
    tagline: 'Government, NADRA and legal paperwork handled for you',
    items: [
      { id: 'doc-domicile', name: 'Student & Government Service Domicile & PRC', price: 5000 },
      { id: 'doc-affidavit', name: 'College / University Undertaking & Affidavit', price: 1000, unit: 'document' },
      { id: 'doc-pension', name: 'Government Pension Transfer Documents', price: 15000 },
      { id: 'doc-birth-20', name: 'NADRA Birth Certificate (1–20 Years)', price: 3000 },
      { id: 'doc-birth-50', name: 'NADRA Birth Certificate (20–50 Years)', price: 6000 },
      { id: 'doc-birth-100', name: 'NADRA Birth Certificate (50–100 Years)', price: 10000 },
      { id: 'doc-marriage-new', name: 'NADRA Marriage Certificate — New Couple', price: 5000 },
      { id: 'doc-marriage-old', name: 'NADRA Marriage Certificate — Old Couple', price: 7000 },
      { id: 'doc-death', name: 'NADRA Death Certificate', price: 5000 },
      { id: 'doc-death-old', name: 'NADRA Death Certificate — Old', price: 10000 },
      { id: 'doc-widow', name: 'Widow Non-Marriage Certificate', price: 5000 },
      { id: 'doc-tr-cnic', name: 'CNIC Translation Urdu to English', price: 1500, unit: 'document' },
      { id: 'doc-tr-birth', name: 'Birth Certificate Translation Urdu to English', price: 1500, unit: 'document' },
      { id: 'doc-tr-marriage', name: 'Marriage Certificate Translation Urdu to English', price: 1500, unit: 'document' },
      { id: 'doc-tr-old', name: 'Old Death / Birth / Marriage Certificate Translation', price: 3000, unit: 'document' },
      { id: 'doc-agr-vehicle', name: 'Vehicle Agreement', price: 2500 },
      { id: 'doc-agr-rent', name: 'Rent Agreement', price: 2500 },
      { id: 'doc-agr-sale', name: 'Sale Agreement', price: 2500 },
      { id: 'doc-poa', name: 'Special Power of Attorney', price: 3000 },
      { id: 'doc-deed', name: 'Gift Deed / Partnership Deed / Will Deed', price: 5000, unit: 'deed' },
      { id: 'doc-frc', name: 'NADRA F.R.C.', price: 5000 },
      { id: 'doc-divorce', name: 'NADRA Divorce Deed', price: 5000 },
      { id: 'doc-passport', name: 'Passport — Normal', price: 8000 },
      { id: 'doc-passport-urgent', name: 'Passport — Urgent', price: 15000 },
      { id: 'doc-passport-fast', name: 'Passport — Fast Track', price: 22000 },
      { id: 'doc-licence', name: 'Driving Licence', price: 25000 },
      { id: 'doc-att-local', name: 'Legal Documents Attestation', price: 200, unit: 'document' },
      { id: 'doc-att-intl', name: 'Legal International Documents Attestation', price: 500, unit: 'document' },
      { id: 'doc-att-apostille', name: 'Documents Attestation — Apostille', price: 35000, unit: 'document' },
      { id: 'doc-att-mofa', name: 'Documents Attestation — MOFA', price: 25000, unit: 'document' },
      { id: 'doc-att-hec', name: 'Documents Attestation — HEC', price: 25000, unit: 'document' },
      { id: 'doc-fbr', name: 'FBR (Filer) Registration', price: 6000 },
      { id: 'doc-succession', name: 'Succession Certificate — NADRA and Court', price: 100000 },
      { id: 'doc-death-case', name: 'Death Case (Documents)', price: 25000 },
    ],
  },
];

/** Categories the sheet marks COMING SOON — shown, but not bookable. */
export const COMING_SOON: string[] = [
  'AC Repair & Maintenance Services',
  'Doctors / Medical Services',
  'Plumbing Services',
  'Beautician / Beauty Services',
  'Electrical Services',
  'Car Mechanic / Auto Repair Services',
  'Bike Mechanic / Motorcycle Repair Services',
  'Notary Services',
];

/** Flatten the sheet into Service rows. */
export function catalogueRows() {
  const rows: any[] = [];
  let order = 0;
  for (const g of SHEET) {
    for (const it of g.items) {
      const quoteOnly = it.price === undefined;
      rows.push({
        id: it.id,
        name: it.name,
        tagline: g.tagline,
        category: g.group.toUpperCase(),
        categoryColor: g.color,
        categoryBg: g.bg,
        basePrice: it.price ?? 0,
        unitLabel: it.unit ? `per ${it.unit}` : 'per job',
        unitNoun: it.unit ?? 'job',
        duration: quoteOnly ? 'Quoted on site' : '2–5 working days',
        rating: 4.8,
        reviews: 0,
        icon: g.icon,
        gradientStart: g.gradientStart,
        gradientEnd: g.gradientEnd,
        description: `${it.name} by WithUrooj — ${g.tagline.toLowerCase()}.`,
        includedJson: JSON.stringify([]),
        quoteOnly,
        sheetGroup: g.group,
        sortOrder: order++,
      });
    }
  }
  return rows;
}
