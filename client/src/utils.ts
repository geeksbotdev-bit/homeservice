/** Format a number as Pakistani Rupees, e.g. 1785 -> "PKR 1,785". */
export function formatPKR(n: number): string {
  return 'PKR ' + n.toLocaleString('en-PK');
}

/**
 * What to show where a service's price goes.
 *
 * Cleaning jobs are quoted once the cleaner has seen the size of the work, so
 * they have no list price. Printing PKR 0 for those would read as "free".
 */
export function servicePrice(s: { basePrice: number; quoteOnly?: boolean }): string {
  return s.quoteOnly || !s.basePrice ? 'Price on request' : formatPKR(s.basePrice);
}

/** Initials from a name, e.g. "Sara Ahmad" -> "SA". */
export function initials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('');
}
