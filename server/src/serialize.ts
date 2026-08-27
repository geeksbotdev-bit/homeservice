/** Transform Prisma rows into the JSON shapes the client's api.ts expects. */

export function serializeService(s: any) {
  return {
    id: s.id,
    name: s.name,
    tagline: s.tagline,
    category: s.category,
    categoryColor: s.categoryColor,
    categoryBg: s.categoryBg,
    basePrice: s.basePrice,
    unitLabel: s.unitLabel,
    unitNoun: s.unitNoun,
    duration: s.duration,
    rating: s.rating,
    reviews: s.reviews,
    icon: s.icon,
    gradient: [s.gradientStart, s.gradientEnd] as [string, string],
    description: s.description,
    included: safeParse(s.includedJson),
    addOns: (s.addOns ?? []).map((a: any) => ({ id: a.key, name: a.name, desc: a.desc, price: a.price })),
  };
}

export function serializeCleaner(c: any) {
  if (!c) return undefined;
  return {
    id: c.id,
    name: c.name,
    initials: c.initials,
    rating: c.rating,
    jobs: c.jobs,
    distanceKm: c.distanceKm,
    bio: c.bio ?? undefined,
    preferred: c.preferred ?? undefined,
    available: c.available ?? undefined,
    phone: c.user?.phone ?? undefined,
  };
}

export function serializeBooking(b: any) {
  return {
    id: b.id,
    service: b.serviceName,
    addOns: (b.addOns ?? []).map((a: any) => a.name),
    status: b.status,
    scheduledType: b.scheduledType,
    dateLabel: b.dateLabel,
    timeLabel: b.timeLabel,
    address: b.address,
    total: b.total,
    cleaner: serializeCleaner(b.cleaner),
    accepted: b.accepted ?? undefined,
    rating: b.rating ?? undefined,
    invoiceNo: b.invoiceNo ?? undefined,
    payment: b.payment ? { method: b.payment.method, txnId: b.payment.txnId, amount: b.payment.amount, status: b.payment.status } : undefined,
    // Live location sharing
    custLat: b.custLat ?? undefined,
    custLng: b.custLng ?? undefined,
    proLat: b.proLat ?? undefined,
    proLng: b.proLng ?? undefined,
  };
}

/** `fromMe` is relative to who's viewing — pass the viewer's normalized role
 *  ('client' | 'cleaner'). Defaults to 'client' for backward compatibility. */
export function serializeMessage(m: any, viewerRole: 'client' | 'cleaner' = 'client') {
  return {
    id: m.id,
    bookingId: m.bookingId,
    fromMe: m.senderRole === viewerRole,
    senderRole: m.senderRole,
    text: m.text,
    time: fmtTime(m.createdAt),
    read: m.read,
  };
}

export function serializeUser(u: any) {
  return {
    id: u.id,
    role: u.role ?? 'client',
    name: u.name,
    phone: u.phone ?? '',
    email: u.email ?? undefined,
    location: u.location,
    avatarUrl: u.avatarUrl ?? undefined,
    gender: u.gender ?? undefined,
    dob: u.dob ?? undefined,
    addresses: (u.addresses ?? []).map((a: any) => ({
      id: a.id, label: a.label, line1: a.line1, area: a.area, isDefault: a.isDefault,
    })),
    paymentMethods: (u.paymentMethods ?? []).map((p: any) => ({
      id: p.id, type: p.type, name: p.name, detail: p.detail, isDefault: p.isDefault,
    })),
  };
}

function safeParse(s: string): string[] {
  try { return JSON.parse(s); } catch { return []; }
}

function fmtTime(d: Date): string {
  return new Date(d).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}
