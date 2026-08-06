import { useCallback, useState } from 'react';
import { View, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';
import { Text, Card, Button } from '../../src/components';
import { colors, radius, shadow } from '../../src/theme/theme';
import { pro } from '../../src/services/api';
import { formatPKR } from '../../src/utils';

type Earn = {
  total: number; gross: number; fee: number; net: number; commissionPct: number;
  withdrawn: number; available: number; jobs: number;
  items: { id: string; service: string; amount: number; dateLabel: string }[];
};

export default function ProEarnings() {
  const router = useRouter();
  const [data, setData] = useState<Earn | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const load = useCallback(() => { pro.earnings().then(setData as any).catch(() => {}); }, []);
  useFocusEffect(load);

  async function withdraw() {
    setBusy(true); setMsg(null);
    try {
      const r = await pro.withdraw();
      setMsg(`✅ PKR ${r.amount.toLocaleString('en-PK')} sent to ${r.to}`);
      load();
    } catch (e: any) {
      const m = String(e?.message ?? '');
      setMsg(m.includes('payout method') ? 'Add a payout method first (Profile → Payout method).' : m.includes('No balance') ? 'No balance available to withdraw yet.' : 'Withdrawal failed. Please try again.');
    } finally { setBusy(false); }
  }

  return (
    <View style={styles.root}>
      <SafeAreaView edges={['top']} style={styles.header}>
        <Text variant="h1" color={colors.white} style={{ fontSize: 22 }}>Earnings</Text>
      </SafeAreaView>

      {!data ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
      ) : (
        <ScrollView contentContainerStyle={{ padding: 16, gap: 16 }} showsVerticalScrollIndicator={false}>
          <LinearGradient colors={[colors.primary, colors.primary400]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.balance}>
            <Text color="rgba(255,255,255,0.8)" style={{ fontSize: 13 }}>Available to withdraw</Text>
            <Text weight="extrabold" color={colors.white} style={{ fontSize: 36, letterSpacing: -1, marginTop: 4 }}>{formatPKR(data.available)}</Text>
            <View style={styles.balRow}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Feather name="check-circle" size={14} color="rgba(255,255,255,0.85)" />
                <Text color="rgba(255,255,255,0.85)" style={{ fontSize: 13 }}>{data.jobs} completed jobs · {formatPKR(data.net)} net earned</Text>
              </View>
            </View>
          </LinearGradient>

          {/* Earnings breakdown — company keeps 30% */}
          <Card style={{ padding: 16 }}>
            <Row label="Gross earnings" value={formatPKR(data.gross)} />
            <Row label={`Company service fee (${Math.round(data.commissionPct * 100)}%)`} value={`− ${formatPKR(data.fee)}`} muted />
            <Row label="Already withdrawn" value={`− ${formatPKR(data.withdrawn)}`} muted />
            <View style={styles.totalRow}>
              <Text weight="extrabold" style={{ fontSize: 15 }}>Available</Text>
              <Text weight="extrabold" color={colors.primary} style={{ fontSize: 18 }}>{formatPKR(data.available)}</Text>
            </View>
          </Card>

          <Button
            label={data.available > 0 ? `Withdraw ${formatPKR(data.available)}` : 'Nothing to withdraw'}
            icon="dollar-sign"
            onPress={withdraw}
            disabled={data.available <= 0 || busy}
            loading={busy}
            loadingLabel="Processing…"
          />
          {msg && <Text center variant="bodySm" color={msg.startsWith('✅') ? colors.success : colors.error}>{msg}</Text>}
          <Text center variant="bodySm" color={colors.textDisabled} style={{ fontSize: 11 }}>
            Payouts go to your saved account · manage in Profile → Payout method
          </Text>

          <View style={{ flexDirection: 'row', gap: 12 }}>
            <Stat icon="briefcase" label="Jobs done" value={String(data.jobs)} />
            <Stat icon="trending-up" label="Avg / job" value={data.jobs ? formatPKR(Math.round(data.net / data.jobs)) : 'PKR 0'} />
          </View>

          <View>
            <Text variant="h3" style={{ fontSize: 15, marginBottom: 10 }}>Payout history</Text>
            {data.items.length === 0 ? (
              <Card style={{ padding: 20, alignItems: 'center' }}><Text color={colors.textDisabled}>No payouts yet</Text></Card>
            ) : (
              <Card style={{ overflow: 'hidden' }}>
                {data.items.map((it, i, arr) => (
                  <View key={it.id} style={[styles.item, i < arr.length - 1 && styles.divider]}>
                    <View style={styles.itemIcon}><Feather name="check" size={15} color={colors.success} /></View>
                    <View style={{ flex: 1 }}>
                      <Text weight="semibold" style={{ fontSize: 14 }}>{it.service}</Text>
                      <Text variant="bodySm" color={colors.textTertiary}>{it.dateLabel}</Text>
                    </View>
                    <Text weight="bold" color={colors.success}>+{formatPKR(it.amount)}</Text>
                  </View>
                ))}
              </Card>
            )}
          </View>
        </ScrollView>
      )}
    </View>
  );
}

function Row({ label, value, muted }: { label: string; value: string; muted?: boolean }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 7 }}>
      <Text color={colors.textTertiary}>{label}</Text>
      <Text weight="semibold" color={muted ? colors.textTertiary : colors.textSecondary}>{value}</Text>
    </View>
  );
}

function Stat({ icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <Card style={{ flex: 1, padding: 16, gap: 6 }}>
      <Feather name={icon} size={18} color={colors.primary} />
      <Text weight="extrabold" style={{ fontSize: 18 }}>{value}</Text>
      <Text variant="bodySm" color={colors.textTertiary}>{label}</Text>
    </Card>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surface },
  header: { backgroundColor: colors.primary, paddingHorizontal: 20, paddingBottom: 18, paddingTop: 8 },
  balance: { borderRadius: radius.xxl, padding: 22, ...shadow.card },
  balRow: { flexDirection: 'row', marginTop: 14 },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, borderTopColor: colors.surface, marginTop: 4, paddingTop: 10 },
  item: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 },
  itemIcon: { width: 38, height: 38, borderRadius: 19, backgroundColor: colors.successBg, alignItems: 'center', justifyContent: 'center' },
  divider: { borderBottomWidth: 1, borderBottomColor: colors.surface },
});
