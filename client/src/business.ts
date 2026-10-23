/**
 * The registered business behind WithUrooj.
 *
 * An invoice is a financial document: it has to name the entity actually being
 * paid, with the tax number and registered address, not just the brand. These
 * are the FBR-registered details, kept in one place so the receipt, the app and
 * the website cannot drift apart.
 */
export const BUSINESS = {
  /** Trading name shown to customers. */
  brand: 'WithUrooj',
  /** Registered legal entity — this is who the money goes to. */
  legalName: 'Al Urooj',
  proprietor: 'Khushnudi Bano',
  ntn: '4220180415054',
  taxOffice: 'FBR, RTO-I Karachi',
  address: 'House No. 28, Street No. 419/1, Malir, Karachi, Pakistan',
  city: 'Karachi',
  country: 'Pakistan',
  phone: '+92 333 3276896',
  email: 'support@withurooj.com',
  website: 'uroojwithus.vercel.app',
  currency: 'PKR',
  /** Absolute URL — a PDF renderer cannot resolve a bundled asset. */
  logoUrl: 'https://uroojwithus.vercel.app/brand/logo-withurooj-source.png',
} as const;

/** One-line entity description for an invoice footer. */
export const legalLine = () =>
  `${BUSINESS.legalName} (Proprietor: ${BUSINESS.proprietor}) · NTN ${BUSINESS.ntn}`;
