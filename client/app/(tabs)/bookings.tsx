import { useCallback, useState } from 'react';
import { View, StyleSheet, ScrollView, Pressable, ActivityIndicator } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather, FontAwesome } from '@expo/vector-icons';
import { Text, StatusBadge, Card } from '../../src/components';
import { colors, radius, spacing, shadow } from '../../src/theme/theme';
import { bookings as bookingsApi, services as servicesApi } from '../../src/services/api';
import { formatPKR, initials } from '../../src/utils';
import { useBooking } from '../../src/store/booking';
import type { Booking, Service } from '../../src/data/types';

const UPCOMING = ['confirmed', 'on_the_way', 'arrived', 'in_progress'];

export default function Bookings() {
  const router = useRouter();
  const { startBooking } = useBooking();
  const [tab, setTab] = useState<'upcoming' | 'past'>('upcoming');
  const [list, setList] = useState<Booking[] | null>(null);
  const [services, setServices] = useState<Service[]>([]);

  // Refetch on focus so status changes (e.g. cleaner advancing a job) show up.
  useFocusEffect(useCallback(() => {
    bookingsApi.list().then(setList);
    servicesApi.list().then(setServices);
  }, []));

  function rebook(b: Booking) {
    const svc = services.find((s) => s.name === b.service);
    if (svc) { startBooking(svc, 'now', b.cleaner); router.push(`/service/${svc.id}`); }
  }

  const filtered = (list ?? []).filter((b) =>
    tab === 'upcoming' ? UPCOMING.includes(b.status) : ['completed', 'cancelled'].includes(b.status),
  );

  return (
    <View style={styles.root}>
      <SafeAreaView edges={['top']} style={styles.header}>
        <Text variant="h1" color={colors.white} style={{ fontSize: 22 }}>My Bookings</Text>
        <Text color="rgba(255,255,255,0.7)" style={{ marginTop: 2 }}>Track and manage your cleanings</Text>
      </SafeAreaView>

      {/* Segmented control */}
      <View style={styles.segment}>
        {(['upcoming', 'past'] as const).map((t) => (
          <Pressable key={t} onPress={() => setTab(t)} style={[styles.segItem, tab === t && styles.segActive]}>
            <Text weight="bold" color={tab === t ? colors.primary : colors.textTertiary} style={{ textTransform: 'capitalize' }}>{t}</Text>
          </Pressable>
        ))}
      </View>

      {list === null ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
      ) : (
        <ScrollView contentContainerStyle={{ padding: 16, paddingTop: 4, gap: 12 }} showsVerticalScrollIndicator={false}>
          {filtered.length === 0 && (
            <View style={styles.empty}>
              <Feather name="calendar" size={40} color={colors.border} />
              <Text color={colors.textDisabled} style={{ marginTop: 12 }}>No {tab} bookings</Text>
            </View>
          )}
          {filtered.map((b) => (
            <Pressable key={b.id} onPress={() => router.push(`/booking/${b.id}`)}>
              <Card style={{ padding: 16 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                  <View style={{ flex: 1 }}>
                    <Text weight="bold" style={{ fontSize: 15 }}>{b.service}</Text>
                    <Text variant="bodySm" color={colors.textTertiary} style={{ marginTop: 2 }}>{b.dateLabel} · {b.timeLabel}</Text>
                  </View>
                  <StatusBadge status={b.status} />
                </View>

                {b.cleaner && (
                  <View style={styles.cleanerRow}>
                    <View style={styles.avatar}>
                      <Text weight="bold" color={colors.primary700} style={{ fontSize: 13 }}>{b.cleaner.initials}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text weight="semibold" style={{ fontSize: 13 }}>{b.cleaner.name}</Text>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                        <FontAwesome name="star" size={10} color={colors.accent} />
                        <Text variant="bodySm" color={colors.textTertiary}>{b.cleaner.rating} · {b.cleaner.jobs} jobs</Text>
                      </View>
                    </View>
                    <Text weight="extrabold" color={colors.primary}>{formatPKR(b.total)}</Text>
                  </View>
                )}

                {/* Action row */}
                <View style={styles.actions}>
                  {b.status === 'completed' && !b.rating && (
                    <Pressable style={[styles.action, { backgroundColor: colors.accent }]} onPress={() => router.push(`/rate/${b.id}`)}>
                      <Text weight="bold" color={colors.white} style={{ fontSize: 13 }}>Rate service</Text>
                    </Pressable>
                  )}
                  {b.status === 'completed' && (
                    <Pressable style={[styles.action, styles.actionOutline]} onPress={() => rebook(b)}>
                      <Text weight="bold" color={colors.primary} style={{ fontSize: 13 }}>Re-book</Text>
                    </Pressable>
                  )}
                  {UPCOMING.includes(b.status) && (
                    <Pressable style={[styles.action, { backgroundColor: colors.primary }]} onPress={() => router.push(`/booking/${b.id}`)}>
                      <Feather name="map-pin" size={13} color={colors.white} />
                      <Text weight="bold" color={colors.white} style={{ fontSize: 13 }}>Track</Text>
                    </Pressable>
                  )}
                </View>
              </Card>
            </Pressable>
          ))}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surface },
  header: { backgroundColor: colors.primary, paddingHorizontal: 20, paddingBottom: 18, paddingTop: 6 },
  segment: { flexDirection: 'row', backgroundColor: colors.white, marginHorizontal: 16, marginTop: -14, borderRadius: radius.lg, padding: 4, ...shadow.card },
  segItem: { flex: 1, height: 40, alignItems: 'center', justifyContent: 'center', borderRadius: radius.md },
  segActive: { backgroundColor: colors.primary50 },
  cleanerRow: { flexDirection: 'row', alignItems: 'center', gap: 10, borderTopWidth: 1, borderTopColor: colors.surface, paddingTop: 12 },
  avatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.primary200, alignItems: 'center', justifyContent: 'center' },
  actions: { flexDirection: 'row', gap: 8, marginTop: 12 },
  action: { flex: 1, height: 40, borderRadius: radius.md, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  actionOutline: { borderWidth: 1.5, borderColor: colors.primary, backgroundColor: 'transparent' },
  empty: { alignItems: 'center', paddingVertical: 60 },
});
