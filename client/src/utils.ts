/** Format a number as Pakistani Rupees, e.g. 1785 -> "PKR 1,785". */
export function formatPKR(n: number): string {
  return 'PKR ' + n.toLocaleString('en-PK');
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
