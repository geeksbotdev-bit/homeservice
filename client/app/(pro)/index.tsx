import { useCallback, useState } from 'react';
import { View, StyleSheet, ScrollView, Pressable, ActivityIndicator } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather, FontAwesome } from '@expo/vector-icons';
import { Text, Card, StatusBadge } from '../../src/components';
import { colors, radius, shadow } from '../../src/theme/theme';
import { pro } from '../../src/services/api';
import { formatPKR } from '../../src/utils';
import type { Booking, BookingStatus } from '../../src/data/types';

// What the cleaner does next from each (accepted) status.
const NEXT: Partial<Record<BookingStatus, { to: BookingStatus; label: string; icon: any }>> = {
  confirmed: { to: 'on_the_way', label: 'On My Way', icon: 'navigation' },
  on_the_way: { to: 'arrived', label: 'Arrived', icon: 'map-pin' },
  arrived: { to: 'in_progress', label: 'Start Job', icon: 'play' },
  in_progress: { to: 'completed', label: 'Complete', icon: 'check-circle' },
};

type Data = { available: Booking[]; requests: Booking[]; active: Booking[]; history: Booking[] };

export default function ProJobs() {
  const router = useRouter();
  const [data, setData] = useState<Data | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(() => { pro.jobs().then(setData).catch(() => {}); }, []);
  // Poll every 5s while focused so newly posted jobs / requests appear live.
  useFocusEffect(useCallback(() => {
    load();
    const t = setInterval(load, 5000);
    return () => clearInterval(t);
  }, [load]));

  async function act(id: string, fn: () => Promise<any>) {
    setBusy(id);
    try {
      await fn();
    } catch { /* e.g. a scheduled job claimed by someone else first — just refresh */ }
    await pro.jobs().then(setData).catch(() => {});
    setBusy(null);
  }

  const open = (b: Booking) => router.push(`/pro-job/${b.id}`);

  return (
    <View style={styles.root}>
      <SafeAreaView edges={['top']} style={styles.header}>
        <Text color="rgba(255,255,255,0.7)" style={{ fontSize: 13 }}>Good morning 👋</Text>
        <Text variant="h1" color={colors.white} style={{ fontSize: 22 }}>Your Jobs</Text>
      </SafeAreaView>

      {!data ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
      ) : (
        <ScrollView contentContainerStyle={{ padding: 16, gap: 16 }} showsVerticalScrollIndicator={false}>
          {/* Available scheduled jobs — open pool, first cleaner to claim gets it */}
          {data.available.length > 0 && (
            <Section title={`Available jobs (${data.available.length})`}>
              {data.available.map((b) => (
                <Card key={b.id} style={{ padding: 16, gap: 12, borderWidth: 1.5, borderColor: colors.primary }}>
                  <View style={[styles.reqTag, { backgroundColor: colors.primary }]}>
                    <Feather name="calendar" size={11} color={colors.white} />
                    <Text weight="bold" color={colors.white} style={{ fontSize: 10 }}>SCHEDULED · PICK UP</Text>
                  </View>
                  <Pressable onPress={() => open(b)}>
                    <Text weight="bold" style={{ fontSize: 15 }}>{b.service}</Text>
                    <Text variant="bodySm" color={colors.textTertiary} style={{ marginTop: 2 }}>{b.dateLabel} · {b.timeLabel}</Text>
                    {b.addOns.length > 0 && <Text variant="bodySm" color={colors.primary} style={{ marginTop: 4 }}>+ {b.addOns.join(', ')}</Text>}
                    <View style={styles.addr}>
                      <Feather name="map-pin" size={14} color={colors.primary} />
                      <Text variant="bodySm" color={colors.textSecondary} style={{ flex: 1 }} numberOfLines={1}>{b.address?.trim() || 'No address provided'}</Text>
                    </View>
                    <Text weight="extrabold" color={colors.primary} style={{ fontSize: 17, marginTop: 4 }}>{formatPKR(b.total)}</Text>
                  </Pressable>
                  <Pressable onPress={() => act(b.id, () => pro.claim(b.id))} disabled={busy === b.id} style={[styles.btn, styles.accept]}>
                    {busy === b.id ? <ActivityIndicator color={colors.white} size="small" /> : <><Feather name="check-circle" size={15} color={colors.white} /><Text weight="bold" color={colors.white} style={{ fontSize: 13 }}>Accept this job</Text></>}
                  </Pressable>
                </Card>
              ))}
            </Section>
          )}

          {/* Instant requests — broadcast to all cleaners; first to accept wins */}
          {data.requests.length > 0 && (
            <Section title={`New requests (${data.requests.length})`}>
              {data.requests.map((b) => (
                <Card key={b.id} style={{ padding: 16, gap: 12, borderWidth: 1.5, borderColor: colors.accent }}>
                  <View style={styles.reqTag}><Feather name="zap" size={11} color={colors.white} /><Text weight="bold" color={colors.white} style={{ fontSize: 10 }}>INSTANT · FIRST TO ACCEPT</Text></View>
                  <Pressable onPress={() => open(b)}>
                    <Text weight="bold" style={{ fontSize: 15 }}>{b.service}</Text>
                    <Text variant="bodySm" color={colors.textTertiary} style={{ marginTop: 2 }}>{b.dateLabel} · {b.timeLabel}</Text>
                    {b.addOns.length > 0 && <Text variant="bodySm" color={colors.primary} style={{ marginTop: 4 }}>+ {b.addOns.join(', ')}</Text>}
                    <View style={styles.addr}>
                      <Feather name="map-pin" size={14} color={colors.primary} />
                      <Text variant="bodySm" color={colors.textSecondary} style={{ flex: 1 }} numberOfLines={1}>{b.address?.trim() || 'Address shared after you accept'}</Text>
                    </View>
                    <Text weight="extrabold" color={colors.primary} style={{ fontSize: 17, marginTop: 4 }}>{formatPKR(b.total)}</Text>
                  </Pressable>
                  <Pressable onPress={() => act(b.id, () => pro.claim(b.id))} disabled={busy === b.id} style={[styles.btn, styles.accept]}>
                    {busy === b.id ? <ActivityIndicator color={colors.white} size="small" /> : <><Feather name="check" size={15} color={colors.white} /><Text weight="bold" color={colors.white} style={{ fontSize: 13 }}>Accept this job</Text></>}
                  </Pressable>
                </Card>
              ))}
            </Section>
          )}

          {/* Active */}
          <Section title={`Active jobs (${data.active.length})`}>
            {data.active.length === 0 ? <Empty label="No active jobs right now" /> : data.active.map((b) => {
              const next = NEXT[b.status];
              return (
                <Card key={b.id} style={{ padding: 16, gap: 12 }}>
                  <Pressable onPress={() => open(b)}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <View style={{ flex: 1 }}>
                        <Text weight="bold" style={{ fontSize: 15 }}>{b.service}</Text>
                        <Text variant="bodySm" color={colors.textTertiary} style={{ marginTop: 2 }}>{b.dateLabel} · {b.timeLabel}</Text>
                      </View>
                      <StatusBadge status={b.status} />
                    </View>
                    <View style={styles.addr}>
                      <Feather name="map-pin" size={14} color={colors.primary} />
                      <Text variant="bodySm" color={colors.textSecondary} style={{ flex: 1 }} numberOfLines={1}>{b.address}</Text>
                    </View>
                  </Pressable>
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Text weight="extrabold" color={colors.primary} style={{ fontSize: 17 }}>{formatPKR(b.total)}</Text>
                    {next && (
                      <Pressable onPress={() => act(b.id, () => pro.setStatus(b.id, next.to))} disabled={busy === b.id} style={[styles.action, busy === b.id && { opacity: 0.6 }]}>
                        {busy === b.id ? <ActivityIndicator color={colors.white} size="small" /> : <><Feather name={next.icon} size={15} color={colors.white} /><Text weight="bold" color={colors.white} style={{ fontSize: 13 }}>{next.label}</Text></>}
                      </Pressable>
                    )}
                  </View>
                </Card>
              );
            })}
          </Section>

          {/* History */}
          <Section title="Recent">
            {data.history.length === 0 ? <Empty label="No past jobs yet" /> : data.history.slice(0, 5).map((b) => (
              <Pressable key={b.id} onPress={() => open(b)}>
                <Card style={{ padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                  <View style={{ flex: 1 }}>
                    <Text weight="semibold" style={{ fontSize: 14 }}>{b.service}</Text>
                    <Text variant="bodySm" color={colors.textTertiary}>{b.dateLabel} · {b.timeLabel}</Text>
                  </View>
                  {b.rating ? (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                      <FontAwesome name="star" size={12} color={colors.accent} /><Text weight="semibold" color={colors.textSecondary}>{b.rating}</Text>
                    </View>
                  ) : <StatusBadge status={b.status} />}
                </Card>
              </Pressable>
            ))}
          </Section>
        </ScrollView>
      )}
    </View>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return <View style={{ gap: 10 }}><Text variant="h3" style={{ fontSize: 15 }}>{title}</Text>{children}</View>;
}
function Empty({ label }: { label: string }) {
  return <View style={styles.empty}><Text color={colors.textDisabled}>{label}</Text></View>;
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surface },
  header: { backgroundColor: colors.primary, paddingHorizontal: 20, paddingBottom: 18, paddingTop: 8 },
  addr: { flexDirection: 'row', alignItems: 'center', gap: 8, borderTopWidth: 1, borderTopColor: colors.surface, paddingTop: 12, marginTop: 10 },
  action: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.primary, borderRadius: radius.md, paddingVertical: 10, paddingHorizontal: 16, ...shadow.button },
  reqTag: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: colors.accent, alignSelf: 'flex-start', borderRadius: 6, paddingVertical: 3, paddingHorizontal: 8 },
  btn: { flex: 1, minHeight: 48, paddingVertical: 14, paddingHorizontal: 16, borderRadius: radius.md, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  reject: { borderWidth: 1.5, borderColor: colors.error, backgroundColor: colors.errorBg },
  accept: { backgroundColor: colors.primary, ...shadow.button },
  empty: { backgroundColor: colors.white, borderRadius: radius.lg, padding: 20, alignItems: 'center', ...shadow.soft },
});
