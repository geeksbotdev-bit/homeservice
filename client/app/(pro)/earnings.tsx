import { useCallback, useState } from 'react';
import { View, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { Text, Card, NavBar } from '../../src/components';
import { colors, radius, shadow } from '../../src/theme/theme';
import { pro } from '../../src/services/api';
import { formatPKR } from '../../src/utils';
import { useLiveRefresh } from '../../src/hooks/useLiveRefresh';

interface Payout {
  id: string; period: string; amount: number; gross: number; commission: number;
  jobCount: number; status: string; method: string | null; reference: string | null;
  note: string | null; paidAt: string | null;
}

interface Earnings {
  total: number; gross: number; fee: number; net: number;
  commissionPct: number; jobs: number;
  thisWeek: number; thisWeekJobs: number; periodLabel: string;
  nextPayoutAt: string; paidToDate: number; awaitingTransfer: number;
  payouts: Payout[];
  items: { id: string; service: string; amount: number; dateLabel: string }[];
}

/**
 * Earnings, on a weekly cycle.
 *
 * There is no withdraw button: each week's completed jobs are transferred by
 * the company after the week closes. Showing a "withdraw" control implied the
 * cleaner had to ask, and that money was sitting there to be taken.
 */
export default function ProEarnings() {
  const [data, setData] = useState<Earnings | null>(null);

  useLiveRefresh(useCallback(() => { pro.earnings().then(setData as any).catch(() => {}); }, []), 15000);

  if (!data) {
    return (
      <SafeAreaView style={styles.root} edges={['top']}>
        <NavBar title="Earnings" />
        <ActivityIndicator color={colors.primary} style={{ paddingVertical: 50 }} />
      </SafeAreaView>
    );
  }

  const payDate = new Date(data.nextPayoutAt);
  const days = Math.max(0, Math.ceil((payDate.getTime() - Date.now()) / 86400000));
  const when = days === 0 ? 'today' : days === 1 ? 'tomorrow' : `in ${days} days`;

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <NavBar title="Earnings" />
      <ScrollView contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: 28 }}>

        {/* This week — an estimate while the week is still running */}
        <View style={styles.hero}>
          <Text variant="caption" color="rgba(255,255,255,0.75)" style={{ letterSpacing: 1 }}>THIS WEEK</Text>
          <Text weight="extrabold" color={colors.white} style={{ fontSize: 36, letterSpacing: -1, marginTop: 4 }}>
            {formatPKR(data.thisWeek)}
          </Text>
          <Text color="rgba(255,255,255,0.85)" variant="bodySm" style={{ marginTop: 2 }}>
            {data.periodLabel} · {data.thisWeekJobs} job{data.thisWeekJobs === 1 ? '' : 's'}
          </Text>
          <View style={styles.payNote}>
            <Feather name="calendar" size={13} color={colors.white} />
            <Text color={colors.white} variant="bodySm" style={{ flex: 1, fontSize: 12 }}>
              Transferred {when}, after the week closes
            </Text>
          </View>
        </View>

        {data.awaitingTransfer > 0 && (
          <View style={styles.pending}>
            <Feather name="clock" size={15} color={colors.accent600} />
            <Text variant="bodySm" color={colors.textSecondary} style={{ flex: 1 }}>
              {formatPKR(data.awaitingTransfer)} from closed weeks is being transferred.
            </Text>
          </View>
        )}

        <Card style={{ padding: 16 }}>
          <Row label="Paid to you so far" value={formatPKR(data.paidToDate)} />
          <Row label="Jobs completed" value={String(data.jobs)} muted />
          <Row label={`Company commission (${Math.round(data.commissionPct * 100)}%)`} value={`− ${formatPKR(data.fee)}`} muted />
          <View style={styles.totalRow}>
            <Text weight="bold">Lifetime earnings</Text>
            <Text weight="extrabold" color={colors.primary} style={{ fontSize: 18 }}>{formatPKR(data.net)}</Text>
          </View>
        </Card>

        <View style={styles.note}>
          <Feather name="info" size={14} color={colors.primary} />
          <Text variant="bodySm" color={colors.textSecondary} style={{ flex: 1, lineHeight: 18 }}>
            Earnings are sent every week to the payout account on your profile. Keep it up to date so transfers do not fail.
          </Text>
        </View>

        {/* Payment history */}
        <Text variant="caption" color={colors.textTertiary} style={{ letterSpacing: 0.8, marginTop: 4 }}>
          PAYOUT HISTORY
        </Text>

        {data.payouts.length === 0 ? (
          <Card style={{ padding: 22, alignItems: 'center', gap: 8 }}>
            <Feather name="calendar" size={24} color={colors.border} />
            <Text color={colors.textTertiary} center variant="bodySm">
              Your first payout appears after your first full week of jobs.
            </Text>
          </Card>
        ) : (
          data.payouts.map((p) => (
            <Card key={p.id} style={{ padding: 15 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <View style={{ flex: 1 }}>
                  <Text weight="bold" style={{ fontSize: 14.5 }}>{p.period}</Text>
                  <Text variant="bodySm" color={colors.textTertiary}>
                    {p.jobCount} job{p.jobCount === 1 ? '' : 's'}{p.method ? ` · ${p.method}` : ''}
                  </Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text weight="extrabold" color={colors.primary} style={{ fontSize: 16 }}>{formatPKR(p.amount)}</Text>
                  <StatusPill status={p.status} />
                </View>
              </View>
              {p.reference && (
                <Text variant="bodySm" color={colors.textDisabled} style={{ marginTop: 8, fontSize: 11 }}>
                  Reference: {p.reference}
                </Text>
              )}
              {p.status === 'failed' && p.note && (
                <Text variant="bodySm" color={colors.error} style={{ marginTop: 8 }}>{p.note}</Text>
              )}
            </Card>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function StatusPill({ status }: { status: string }) {
  const map: Record<string, { bg: string; fg: string; label: string }> = {
    paid: { bg: colors.successBg, fg: colors.success, label: 'Transferred' },
    pending: { bg: colors.warningBg, fg: colors.accent600, label: 'Being sent' },
    failed: { bg: colors.errorBg, fg: colors.error, label: 'Failed' },
  };
  const s = map[status] ?? map.pending;
  return (
    <View style={[styles.pill, { backgroundColor: s.bg }]}>
      <Text weight="bold" color={s.fg} style={{ fontSize: 10 }}>{s.label}</Text>
    </View>
  );
}

function Row({ label, value, muted }: { label: string; value: string; muted?: boolean }) {
  return (
    <View style={styles.row}>
      <Text color={muted ? colors.textTertiary : colors.textSecondary}>{label}</Text>
      <Text weight="semibold" color={muted ? colors.textTertiary : colors.textPrimary}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surface },
  hero: { backgroundColor: colors.primary, borderRadius: radius.xl, padding: 20, ...shadow.card },
  payNote: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 14, backgroundColor: 'rgba(255,255,255,0.16)', borderRadius: radius.md, paddingHorizontal: 11, paddingVertical: 9 },
  pending: { flexDirection: 'row', alignItems: 'center', gap: 9, backgroundColor: colors.warningBg, borderRadius: radius.lg, padding: 13 },
  note: { flexDirection: 'row', alignItems: 'flex-start', gap: 9, backgroundColor: colors.primary50, borderRadius: radius.lg, padding: 13 },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 7 },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, borderTopColor: colors.border, marginTop: 8, paddingTop: 12 },
  pill: { borderRadius: 6, paddingHorizontal: 7, paddingVertical: 2, marginTop: 3 },
});
