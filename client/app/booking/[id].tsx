import { useEffect, useRef, useState } from 'react';
import { View, StyleSheet, ScrollView, Pressable, ActivityIndicator, Linking, Alert, Platform } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather, FontAwesome } from '@expo/vector-icons';
import { Text, Button, Card, StatusBadge, NavBar, LiveMap } from '../../src/components';
import { useShareLocation } from '../../src/hooks/useShareLocation';
import { colors, radius, shadow } from '../../src/theme/theme';
import { bookings as bookingsApi, user as userApi, cleaners as cleanersApi } from '../../src/services/api';
import { downloadReceipt, methodLabel } from '../../src/receipt';
import type { InvoiceData } from '../../src/invoice';
import { formatPKR } from '../../src/utils';
import type { Booking, BookingStatus } from '../../src/data/types';

const ETA_TOTAL = 300; // seconds — live ETA countdown once the cleaner is en route

const TIMELINE: { key: BookingStatus; label: string; icon: any }[] = [
  { key: 'confirmed', label: 'Booking confirmed', icon: 'check-circle' },
  { key: 'on_the_way', label: 'Cleaner on the way', icon: 'navigation' },
  { key: 'arrived', label: 'Cleaner arrived', icon: 'map-pin' },
  { key: 'in_progress', label: 'Cleaning in progress', icon: 'loader' },
  { key: 'completed', label: 'Service completed', icon: 'star' },
];
const ORDER: BookingStatus[] = ['confirmed', 'on_the_way', 'arrived', 'in_progress', 'completed'];

export default function BookingDetail() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [b, setB] = useState<Booking | null>(null);
  const [etaSec, setEtaSec] = useState(ETA_TOTAL);
  const [searchSec, setSearchSec] = useState(0);
  const [fav, setFav] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Share the customer's location (destination) while a cleaner is engaged.
  const shareActive = !!b && !!b.cleaner && ['confirmed', 'on_the_way', 'arrived', 'in_progress'].includes(b.status);
  const mine = useShareLocation(id, shareActive);

  // Reflect whether this booking's cleaner is already in the user's favourites.
  useEffect(() => {
    cleanersApi.preferred().then((list) => setFav(list.some((c) => c.id === b?.cleaner?.id))).catch(() => {});
  }, [b?.cleaner?.id]);

  function toggleFav() {
    if (!b?.cleaner) return;
    const next = !fav;
    setFav(next);
    cleanersApi.setPreferred(b.cleaner.id, next).catch(() => {});
  }

  // Initial load + poll the backend every 4s so status changes made by the
  // professional appear live on the customer's screen (realtime-ish).
  useEffect(() => {
    if (!id) return;
    let alive = true;
    const fetchIt = () => bookingsApi.get(id).then((data) => { if (alive) setB(data); }).catch(() => {});
    fetchIt();
    pollRef.current = setInterval(fetchIt, 4000);
    return () => { alive = false; if (pollRef.current) clearInterval(pollRef.current); };
  }, [id]);

  // ETA countdown while the cleaner is on the way.
  useEffect(() => {
    if (b?.status !== 'on_the_way') return;
    const t = setInterval(() => setEtaSec((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(t);
  }, [b?.status]);

  // "Searching" timer — runs while an instant booking waits for a cleaner to accept.
  useEffect(() => {
    const isSearching = !!b && !b.accepted && b.status === 'confirmed' && b.scheduledType !== 'later';
    if (!isSearching) { setSearchSec(0); return; }
    const t = setInterval(() => setSearchSec((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [b?.accepted, b?.status, b?.scheduledType]);

  if (!b) {
    return (
      <SafeAreaView style={styles.root} edges={['top']}>
        <NavBar title="Booking" />
        <ActivityIndicator color={colors.primary} style={{ marginTop: 60 }} />
      </SafeAreaView>
    );
  }

  const currentIdx = ORDER.indexOf(b.status);
  const cancelled = b.status === 'cancelled';
  // Instant booking still waiting for a cleaner to accept → show searching.
  const searching = !b.accepted && b.status === 'confirmed' && b.scheduledType !== 'later';

  async function cancelSearch() {
    if (!b) return;
    await bookingsApi.cancel(b.id).catch(() => {});
    router.replace('/(tabs)/bookings');
  }

  if (searching) {
    const mins = Math.floor(searchSec / 60);
    const secs = String(searchSec % 60).padStart(2, '0');
    return (
      <View style={styles.root}>
        <SafeAreaView edges={['top']} style={styles.header}>
          <NavBar title={b.id} bordered={false} />
        </SafeAreaView>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 }}>
          {/* Radar */}
          <View style={styles.radarWrap}>
            <View style={[styles.radarRing, { width: 180, height: 180, opacity: 0.12 }]} />
            <View style={[styles.radarRing, { width: 130, height: 130, opacity: 0.18 }]} />
            <View style={[styles.radarRing, { width: 84, height: 84, opacity: 0.28 }]} />
            <View style={styles.radarCore}>
              <Feather name="search" size={30} color={colors.white} />
            </View>
          </View>

          <Text weight="extrabold" style={{ fontSize: 20, marginTop: 36 }} center>Finding you a cleaner…</Text>
          <Text color={colors.textTertiary} center style={{ marginTop: 8, lineHeight: 21, maxWidth: 300 }}>
            We're contacting verified cleaners near you for your {b.service}. This usually takes under a minute.
          </Text>

          <View style={styles.searchTimer}>
            <ActivityIndicator color={colors.primary} size="small" />
            <Text weight="semibold" color={colors.primary}>Searching · {mins}:{secs}</Text>
          </View>

          <View style={styles.searchInfo}>
            <Feather name="info" size={14} color={colors.textDisabled} />
            <Text variant="bodySm" color={colors.textTertiary} style={{ flex: 1 }}>
              You'll be notified the moment a cleaner accepts. They'll arrive within about an hour.
            </Text>
          </View>
        </View>

        <SafeAreaView edges={['bottom']} style={{ padding: 20, paddingTop: 0 }}>
          <Button label="Cancel Search" variant="danger" icon="x-circle" onPress={cancelSearch} />
        </SafeAreaView>
      </View>
    );
  }

  // Live-tracking derived values
  const activeTracking = ['on_the_way', 'arrived', 'in_progress'].includes(b.status);
  const etaText =
    b.status === 'on_the_way' ? `${Math.max(1, Math.ceil(etaSec / 60))} min` :
    b.status === 'arrived' ? 'Arrived' :
    b.status === 'in_progress' ? 'Cleaning…' :
    b.status === 'completed' ? 'Completed' :
    b.status === 'confirmed' ? 'Assigning' : '—';

  async function doCancel() {
    if (!b) return;
    const res: any = await bookingsApi.cancel(b.id).catch(() => ({}));
    setB({ ...b, status: 'cancelled' });
    const refund = res?.refund ?? 0;
    if (refund > 0) {
      const msg = `PKR ${refund.toLocaleString('en-PK')} will be refunded (30% cancellation fee applied).`;
      Platform.OS === 'web' ? window.alert(msg) : Alert.alert('Refund initiated', msg);
    }
  }
  function cancel() {
    if (!b) return;
    const paid = b.payment?.status === 'paid';
    const refund = paid ? Math.round(b.total * 0.7) : 0;
    const q = paid
      ? `Cancel this booking? You'll be refunded PKR ${refund.toLocaleString('en-PK')} (30% cancellation fee applies).`
      : 'Cancel this booking?';
    if (Platform.OS === 'web') { if (window.confirm(q)) doCancel(); return; }
    Alert.alert('Cancel booking', q, [
      { text: 'Keep', style: 'cancel' },
      { text: 'Cancel booking', style: 'destructive', onPress: doCancel },
    ]);
  }

  async function receipt() {
    if (!b) return;
    const me = await userApi.me().catch(() => null);
    const data: InvoiceData = {
      invoiceNo: b.invoiceNo ?? `INV-${b.id}`,
      date: b.dateLabel,
      billedName: me?.name || 'Customer',
      billedPhone: me?.phone || '',
      billedAddress: b.address,
      cleanerName: b.cleaner?.name ?? '—',
      cleanerRating: b.cleaner?.rating ?? 0,
      cleanerJobs: b.cleaner?.jobs ?? 0,
      items: [{ label: `${b.service}${b.addOns.length ? ` + ${b.addOns.length} add-on` : ''}`, amount: b.total }],
      subtotal: b.total,
      fee: 0,
      total: b.payment?.amount ?? b.total,
      methodLabel: methodLabel(b.payment?.method),
      txnId: b.payment?.txnId ?? '—',
    };
    downloadReceipt(data);
  }

  const isPaid = !!b.payment || !!b.invoiceNo;

  return (
    <View style={styles.root}>
      <SafeAreaView edges={['top']} style={styles.header}>
        <NavBar title={b.id} bordered={false} />
      </SafeAreaView>

      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 24, gap: 16 }} showsVerticalScrollIndicator={false}>
        {/* Status + map placeholder */}
        <Card style={{ overflow: 'hidden' }}>
          {b.cleaner && activeTracking ? (
            <LiveMap
              // Prefer the location the cleaner shares from the job screen;
              // fall back to their general live position (pushed while online)
              // so the dot keeps moving even if they're in a nav app.
              pro={
                b.proLat != null && b.proLng != null ? { lat: b.proLat, lng: b.proLng }
                : (b.cleaner.lat != null && b.cleaner.lng != null ? { lat: b.cleaner.lat, lng: b.cleaner.lng } : null)
              }
              cust={mine ?? (b.custLat != null && b.custLng != null ? { lat: b.custLat, lng: b.custLng } : null)}
              etaText={etaText}
              cleanerName={b.cleaner.name}
            />
          ) : (
            <View style={styles.map}>
              <Feather name={cancelled ? 'x-circle' : b.status === 'completed' ? 'check-circle' : 'map'} size={32} color={colors.primary200} />
              <Text variant="bodySm" color={colors.textDisabled} center style={{ marginTop: 6, paddingHorizontal: 20 }}>
                {cancelled ? 'Booking cancelled'
                  : b.status === 'completed' ? 'Service completed'
                  : b.scheduledType === 'later' && !b.cleaner ? `Scheduled for ${b.dateLabel} · ${b.timeLabel}. We're finding a cleaner to pick up your booking — you'll be notified once one accepts.`
                  : b.scheduledType === 'later' ? `Scheduled for ${b.dateLabel} · ${b.timeLabel}. Live tracking starts when your cleaner sets off.`
                  : 'Live tracking begins when the cleaner sets off'}
              </Text>
            </View>
          )}
          <View style={{ padding: 16 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
              <Text weight="bold" style={{ fontSize: 16 }}>{b.service}</Text>
              <StatusBadge status={b.status} />
            </View>
            <Text variant="bodySm" color={colors.textTertiary}>{b.dateLabel} · {b.timeLabel}</Text>
          </View>
        </Card>

        {/* Cleaner card */}
        {b.cleaner && !cancelled && (
          <Card style={{ padding: 16 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <View style={styles.avatar}><Text weight="extrabold" color={colors.primary700} style={{ fontSize: 17 }}>{b.cleaner.initials}</Text></View>
              <View style={{ flex: 1 }}>
                <Text weight="bold" style={{ fontSize: 15 }}>{b.cleaner.name}</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                  <FontAwesome name="star" size={11} color={colors.accent} />
                  <Text variant="bodySm" color={colors.textTertiary}>{b.cleaner.rating} · {b.cleaner.jobs} jobs</Text>
                </View>
              </View>
              <Pressable style={[styles.iconBtn, fav && { backgroundColor: colors.errorBg }]} onPress={toggleFav}>
                <FontAwesome name={fav ? 'heart' : 'heart-o'} size={16} color={fav ? colors.error : colors.primary} />
              </Pressable>
              <Pressable style={styles.iconBtn} onPress={() => router.push(`/chat/${b.id}`)}>
                <Feather name="message-circle" size={18} color={colors.primary} />
              </Pressable>
              <Pressable style={[styles.iconBtn, { backgroundColor: colors.primary }]} onPress={() => b.cleaner?.phone && Linking.openURL(`tel:${b.cleaner.phone}`)}>
                <Feather name="phone" size={18} color={colors.white} />
              </Pressable>
            </View>
          </Card>
        )}

        {/* Timeline */}
        {!cancelled && (
          <Card style={{ padding: 18 }}>
            <Text variant="h3" style={{ fontSize: 15, marginBottom: 16 }}>Status</Text>
            {TIMELINE.map((t, i) => {
              const done = i < currentIdx;
              const active = i === currentIdx;
              const reached = i <= currentIdx;
              return (
                <View key={t.key} style={{ flexDirection: 'row', gap: 14 }}>
                  <View style={{ alignItems: 'center' }}>
                    <View style={[styles.tlDot, reached && styles.tlDotOn, active && styles.tlDotActive]}>
                      <Feather name={done ? 'check' : t.icon} size={13} color={reached ? colors.white : colors.textDisabled} />
                    </View>
                    {i < TIMELINE.length - 1 && <View style={[styles.tlLine, done && { backgroundColor: colors.primary }]} />}
                  </View>
                  <View style={{ paddingBottom: i < TIMELINE.length - 1 ? 18 : 0, flex: 1 }}>
                    <Text weight={reached ? 'semibold' : 'regular'} color={reached ? colors.textPrimary : colors.textDisabled} style={{ fontSize: 14 }}>{t.label}</Text>
                    {active && <Text variant="bodySm" color={colors.primary} style={{ marginTop: 2 }}>In progress now</Text>}
                  </View>
                </View>
              );
            })}
          </Card>
        )}

        {/* Address & price */}
        <Card style={{ padding: 16, gap: 12 }}>
          <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10 }}>
            <Feather name="map-pin" size={16} color={colors.primary} style={{ marginTop: 2 }} />
            <Text style={{ flex: 1, fontSize: 14 }} color={colors.textSecondary}>{b.address}</Text>
          </View>
          {b.addOns.length > 0 && (
            <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10 }}>
              <Feather name="plus-circle" size={16} color={colors.primary} style={{ marginTop: 2 }} />
              <Text style={{ flex: 1, fontSize: 14 }} color={colors.textSecondary}>{b.addOns.join(', ')}</Text>
            </View>
          )}
          <View style={[styles.totalRow]}>
            <Text weight="bold">Total paid</Text>
            <Text weight="extrabold" color={colors.primary} style={{ fontSize: 18 }}>{formatPKR(b.total)}</Text>
          </View>
        </Card>

        {/* Refunded banner */}
        {b.payment?.status === 'refunded' && (
          <View style={styles.refundCard}>
            <Feather name="rotate-ccw" size={16} color={colors.success} />
            <Text variant="bodySm" color={colors.textSecondary} style={{ flex: 1 }}>
              Refunded <Text weight="bold">{formatPKR(b.payment.refundAmount ?? Math.round(b.total * 0.7))}</Text> to your payment method (30% cancellation fee applied).
            </Text>
          </View>
        )}

        {/* Actions */}
        {isPaid && (
          <Button label="Download Receipt" variant="secondary" icon="download" onPress={receipt} style={{ borderColor: colors.primary }} />
        )}
        {b.status === 'completed' && !b.rating && (
          <Card style={{ padding: 18, alignItems: 'center', gap: 10, borderWidth: 1.5, borderColor: colors.accent }}>
            <Feather name="check-circle" size={26} color={colors.success} />
            <Text weight="extrabold" style={{ fontSize: 16 }} center>Service completed 🎉</Text>
            <Text variant="bodySm" color={colors.textTertiary} center>How was your experience with {b.cleaner?.name ?? 'your cleaner'}? Your review helps other customers.</Text>
            <View style={{ flexDirection: 'row', gap: 6, marginVertical: 4 }}>
              {[1, 2, 3, 4, 5].map((n) => (
                <Pressable key={n} onPress={() => router.push(`/rate/${b.id}?stars=${n}`)} hitSlop={6}>
                  <FontAwesome name="star-o" size={26} color={colors.accent} />
                </Pressable>
              ))}
            </View>
            <Button label="Rate your cleaner" variant="accent" icon="star" fullWidth onPress={() => router.push(`/rate/${b.id}`)} />
          </Card>
        )}
        {b.status === 'completed' && !!b.rating && (
          <Card style={{ padding: 16, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <Feather name="check-circle" size={18} color={colors.success} />
            <Text weight="semibold" color={colors.textSecondary} style={{ flex: 1 }}>You rated this service</Text>
            <View style={{ flexDirection: 'row', gap: 3 }}>
              {[1, 2, 3, 4, 5].map((n) => (
                <FontAwesome key={n} name={n <= (b.rating ?? 0) ? 'star' : 'star-o'} size={14} color={colors.accent} />
              ))}
            </View>
          </Card>
        )}
        {['confirmed', 'on_the_way'].includes(b.status) && (
          <Button label="Cancel Booking" variant="danger" icon="x-circle" onPress={cancel} />
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surfaceAlt },
  header: { backgroundColor: colors.white },
  map: { height: 150, backgroundColor: colors.primary50, alignItems: 'center', justifyContent: 'center' },
  avatar: { width: 50, height: 50, borderRadius: 25, backgroundColor: colors.primary200, alignItems: 'center', justifyContent: 'center' },
  iconBtn: { width: 42, height: 42, borderRadius: 21, backgroundColor: colors.primary50, alignItems: 'center', justifyContent: 'center' },
  tlDot: { width: 28, height: 28, borderRadius: 14, borderWidth: 2, borderColor: colors.border, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.white },
  tlDotOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  tlDotActive: { backgroundColor: colors.primary, borderColor: colors.primary200 },
  tlLine: { width: 2, flex: 1, minHeight: 18, backgroundColor: colors.border },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, borderTopColor: colors.surface, paddingTop: 12 },
  refundCard: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: colors.successBg, borderRadius: radius.lg, padding: 14 },
  radarWrap: { width: 180, height: 180, alignItems: 'center', justifyContent: 'center' },
  radarRing: { position: 'absolute', borderRadius: 999, backgroundColor: colors.primary },
  radarCore: { width: 60, height: 60, borderRadius: 30, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', ...shadow.card },
  searchTimer: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 28, backgroundColor: colors.primary50, borderRadius: radius.pill, paddingHorizontal: 18, paddingVertical: 10 },
  searchInfo: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginTop: 24, backgroundColor: colors.surface, borderRadius: radius.lg, padding: 14, maxWidth: 340 },
});
