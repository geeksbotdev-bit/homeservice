/**
 * Public web pages and support contacts.
 *
 * These are the same pages linked from the website footer — the bank requires
 * the policies to be reachable from inside the app too, so both must point at
 * the live site rather than a domain we do not serve.
 */
export const SITE_URL = 'https://uroojwithus.vercel.app';

export const LINKS = {
  terms: `${SITE_URL}/terms`,
  privacy: `${SITE_URL}/privacy`,
  refunds: `${SITE_URL}/refund-policy`,
  deleteAccount: `${SITE_URL}/delete-account`,
  whatsapp: 'https://wa.me/923333276896',
  phone: 'tel:+923333276896',
  email: 'mailto:support@withurooj.com',
} as const;
