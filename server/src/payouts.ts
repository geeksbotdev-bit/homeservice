/**
 * Weekly cleaner payouts.
 *
 * Cleaners do not withdraw on demand. Each week's completed jobs are gathered
 * into one payout that the company transfers to the account the cleaner saved.
 * The week runs Monday 00:00 to Sunday 23:59:59 (Pakistan time), and a week is
 * only ever gathered once it has closed — paying for a week still in progress
 * would mean paying twice for the jobs that land later in it.
 */

/** Pakistan has no daylight saving, so a fixed offset is correct year-round. */
const PKT_OFFSET_MS = 5 * 60 * 60 * 1000;

/** Monday 00:00 PKT of the week containing `d`, as a UTC instant. */
export function weekStart(d: Date = new Date()): Date {
  const pk = new Date(d.getTime() + PKT_OFFSET_MS);
  const day = (pk.getUTCDay() + 6) % 7;          // Monday = 0
  const monday = Date.UTC(pk.getUTCFullYear(), pk.getUTCMonth(), pk.getUTCDate() - day);
  return new Date(monday - PKT_OFFSET_MS);
}

/** The instant the given week ends (exclusive): the following Monday 00:00. */
export function weekEnd(start: Date): Date {
  return new Date(start.getTime() + 7 * 24 * 60 * 60 * 1000);
}

/** When the current week's earnings will be transferred. */
export function nextPayoutDate(now: Date = new Date()): Date {
  return weekEnd(weekStart(now));
}

/** "13–19 Oct 2026" — the period a payout covers, for a human. */
export function periodLabel(start: Date, end: Date): string {
  const last = new Date(end.getTime() - 1);
  const fmt = (d: Date, withMonth: boolean) => {
    const pk = new Date(d.getTime() + PKT_OFFSET_MS);
    const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return withMonth
      ? `${pk.getUTCDate()} ${MONTHS[pk.getUTCMonth()]} ${pk.getUTCFullYear()}`
      : String(pk.getUTCDate());
  };
  const a = new Date(start.getTime() + PKT_OFFSET_MS);
  const b = new Date(last.getTime() + PKT_OFFSET_MS);
  const sameMonth = a.getUTCMonth() === b.getUTCMonth() && a.getUTCFullYear() === b.getUTCFullYear();
  return `${fmt(start, !sameMonth)}–${fmt(last, true)}`;
}

/**
 * Create the payout records for every closed week that has not been gathered
 * yet, for every cleaner with completed work in it.
 *
 * Idempotent: the unique key on (cleanerId, periodStart) means running this
 * twice cannot pay a week twice, which matters because it runs both on a
 * schedule and whenever an admin opens the payouts screen.
 */
export async function gatherDuePayouts(prisma: any, commissionPct: number, now: Date = new Date()) {
  const currentWeek = weekStart(now);

  // Only completed jobs, and only those that closed before this week began.
  const jobs = await prisma.booking.findMany({
    where: { status: 'completed', cleanerId: { not: null }, completedAt: { lt: currentWeek, not: null } },
    select: { id: true, cleanerId: true, total: true, completedAt: true },
  });

  // Group by cleaner and by the week the job completed in.
  const buckets = new Map<string, { cleanerId: string; start: Date; gross: number; jobs: number }>();
  for (const j of jobs) {
    const start = weekStart(new Date(j.completedAt));
    const key = `${j.cleanerId}|${start.toISOString()}`;
    const b = buckets.get(key) ?? { cleanerId: j.cleanerId, start, gross: 0, jobs: 0 };
    b.gross += j.total;
    b.jobs += 1;
    buckets.set(key, b);
  }

  let created = 0;
  for (const b of buckets.values()) {
    const commission = Math.round(b.gross * commissionPct);
    const amount = b.gross - commission;
    if (amount <= 0) continue;

    // Record where it will be sent, as it stands now.
    const cleaner = await prisma.cleaner.findUnique({
      where: { id: b.cleanerId },
      select: { userId: true },
    });
    const method = cleaner?.userId
      ? await prisma.paymentMethod.findFirst({
          where: { userId: cleaner.userId },
          orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }],
        })
      : null;

    try {
      await prisma.payout.create({
        data: {
          cleanerId: b.cleanerId,
          periodStart: b.start,
          periodEnd: weekEnd(b.start),
          gross: b.gross,
          commission,
          amount,
          jobCount: b.jobs,
          methodName: method?.name ?? null,
          methodDetail: method?.detail ?? null,
        },
      });
      created++;
    } catch {
      // Already gathered for this cleaner and week — the unique key did its job.
    }
  }
  return created;
}
