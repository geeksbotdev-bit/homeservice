import { useEffect, useRef, useState } from 'react';
import { View, StyleSheet, ScrollView, Pressable, Modal, ActivityIndicator, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather, FontAwesome, MaterialCommunityIcons } from '@expo/vector-icons';
import Svg, { Rect, Line, Path, Circle, Ellipse } from 'react-native-svg';
import { Text, Button, NavBar } from '../../src/components';
import { colors, radius, shadow } from '../../src/theme/theme';
import { bookings as bookingsApi, user as userApi, payments } from '../../src/services/api';
import { formatPKR } from '../../src/utils';
import { useBooking } from '../../src/store/booking';
import type { User } from '../../src/data/types';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function Confirm() {
  const router = useRouter();
  const { draft, selectedAddOns, subtotal, fee, total } = useBooking();
  const [me, setMe] = useState<User | null>(null);
  const [payIdx, setPayIdx] = useState(0);
  const [loading, setLoading] = useState(false);
  const [payUrl, setPayUrl] = useState<string | null>(null); // in-app gateway (web)
  const [err, setErr] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => { userApi.me().then(setMe); }, []);
  useEffect(() => () => { if (pollRef.current) clearInterval(pollRef.current); }, []);

  const service = draft.service;
  if (!service) {
    return (
      <SafeAreaView style={styles.root} edges={['top']}>
        <NavBar title="Confirm Booking" />
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 14 }}>
          <Feather name="calendar" size={40} color={colors.border} />
          <Text center color={colors.textTertiary}>Your booking session was reset.{'\n'}Please pick a service to start again.</Text>
          <Button label="Browse services" fullWidth={false} onPress={() => router.replace('/(tabs)')} style={{ paddingHorizontal: 28 }} />
        </View>
      </SafeAreaView>
    );
  }

  const today = new Date();
  const todayLabel = `${DAYS[today.getDay()]}, ${today.getDate()} ${MONTHS[today.getMonth()]} ${today.getFullYear()}`;
  // Card only for now (wallets disabled until their APIs are wired).
  const cards = me?.paymentMethods?.filter((p) => p.type === 'card') ?? [];
  const pay = cards[payIdx];

  async function confirm() {
    setLoading(true);
    const res: any = await bookingsApi.create({
      // fields the mock/backend record needs to render correctly:
      service: service!.name,
      addOns: selectedAddOns.map((a) => a.name),
      scheduledType: draft.mode,
      // Instant is created as PENDING — it's only broadcast to cleaners AFTER
      // payment. Scheduled goes straight into the open pool (pay after job).
      status: draft.mode === 'now' ? 'pending' : 'confirmed',
      dateLabel: draft.mode === 'later' ? draft.dateLabel : todayLabel,
      timeLabel: draft.mode === 'later' ? draft.timeLabel : 'Now',
      address: draft.address,
      total,
      serviceId: service!.id, quantity: draft.quantity, addOnIds: draft.addOnIds, mode: draft.mode,
    });
    if (draft.mode !== 'now') {
      // Scheduled → posted to the open pool; a cleaner picks it up.
      setLoading(false);
      router.replace('/(tabs)/bookings');
      return;
    }

    // Instant → PAY FIRST, right here. Launch the Bank Alfalah card gateway
    // directly (no separate payment screen). The cleaner search begins only
    // after the gateway confirms the payment.
    setErr(null);
    try {
      const { launchUrl } = await payments.createSession(res.id);
      if (Platform.OS === 'web') {
        // Open the secure card form INSIDE the app (embedded iframe), not a new tab.
        setLoading(false);
        setPayUrl(launchUrl);
        const t = setInterval(async () => {
          const r = await payments.verify(res.id).catch(() => null);
          if (r?.status === 'paid') {
            clearInterval(t);
            setPayUrl(null);
            router.replace({ pathname: '/booking/finding', params: { id: res.id } });
          }
        }, 2500);
        pollRef.current = t;
      } else {
        // Native: the gateway opens in an in-app browser screen (still in-app).
        router.replace({ pathname: '/pay-webview', params: { url: launchUrl, id: res.id } });
      }
    } catch (e: any) {
      setLoading(false);
      setErr(String(e?.message ?? '').includes('401') ? 'Session expired — please sign in again.' : 'Could not start payment. Please try again.');
    }
  }

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <NavBar title="Confirm Booking" />
      <ScrollView contentContainerStyle={{ padding: 14, gap: 10 }} showsVerticalScrollIndicator={false}>
        {/* Service Summary */}
        <Card label="Service Summary">
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, padding: 14 }}>
            <LinearGradient colors={service.gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.svcIcon}>
              <MaterialCommunityIcons name={service.icon as any} size={28} color={colors.white} />
            </LinearGradient>
            <View style={{ flex: 1 }}>
              <Text weight="extrabold" style={{ fontSize: 16, marginBottom: 3 }}>{service.name}</Text>
              {selectedAddOns.map((a) => (
                <View key={a.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                  <View style={styles.miniDot} />
                  <Text variant="bodySm" color={colors.textTertiary}>{a.name}</Text>
                </View>
              ))}
              <View style={styles.chips}>
                <Chip>{draft.quantity} {service.unitNoun}{draft.quantity > 1 ? 's' : ''}</Chip>
                <Chip>{service.duration}</Chip>
                <Chip teal>Supplies incl.</Chip>
              </View>
            </View>
          </View>
        </Card>

        {/* Service Address */}
        <Card label="Service Address">
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, padding: 14 }}>
            <View style={styles.mapThumb}><MapThumb /></View>
            <View style={{ flex: 1 }}>
              <Text weight="bold" style={{ fontSize: 15, marginBottom: 2 }}>{me?.location ?? 'Your location'}</Text>
              <Text variant="bodySm" color={colors.textTertiary} numberOfLines={2} style={{ marginBottom: 8 }}>{draft.address}</Text>
              <Pressable onPress={() => router.push('/location')} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Feather name="map-pin" size={12} color={colors.primary} />
                <Text variant="bodySm" weight="semibold" color={colors.primary}>Change address</Text>
              </Pressable>
            </View>
          </View>
        </Card>

        {/* Booking Time */}
        <Card label="Booking Time">
          <View style={{ padding: 14 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                {draft.mode === 'now' ? (
                  <View style={styles.nowBadge}><FontAwesome name="bolt" size={11} color={colors.white} /><Text weight="extrabold" color={colors.white} style={{ fontSize: 12 }}>NOW</Text></View>
                ) : (
                  <View style={[styles.nowBadge, { backgroundColor: colors.primary }]}><Feather name="calendar" size={11} color={colors.white} /></View>
                )}
                <View>
                  <Text weight="bold" style={{ fontSize: 14 }}>{draft.mode === 'now' ? 'Immediate booking' : draft.timeLabel}</Text>
                  <Text variant="bodySm" color={colors.textTertiary}>{draft.mode === 'now' ? todayLabel : draft.dateLabel}</Text>
                </View>
              </View>
              {draft.mode === 'later' && <Pressable onPress={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)'))}><Text weight="semibold" color={colors.primary} style={{ fontSize: 13 }}>Change</Text></Pressable>}
            </View>
            <View style={styles.eta}>
              <Feather name="clock" size={15} color={colors.warning} />
              <Text variant="bodySm" weight="semibold" color={colors.warningText} style={{ flex: 1, fontSize: 12 }}>
                {draft.mode === 'now'
                  ? <>Your cleaner will arrive <Text weight="bold" color={colors.warning}>within 1 hour</Text> of confirmation</>
                  : <>Posted for <Text weight="bold" color={colors.warning}>{draft.timeLabel}</Text> · a nearby cleaner will accept it soon</>}
              </Text>
            </View>
          </View>
        </Card>

        {/* Price Breakdown */}
        <Card label="Price Breakdown">
          <View style={{ padding: 14 }}>
            <Line2 title={service.name} sub={`×${draft.quantity} ${service.unitNoun} · ${service.duration}`} value={formatPKR(service.basePrice * draft.quantity)} border />
            {selectedAddOns.map((a) => (
              <Line2 key={a.id} title={a.name} sub="Add-on service" value={`+${formatPKR(a.price * draft.quantity)}`} border />
            ))}
            <View style={styles.lineRow}><Text variant="bodySm" color={colors.textTertiary}>Subtotal</Text><Text weight="semibold" style={{ fontSize: 13 }}>{formatPKR(subtotal)}</Text></View>
            <View style={styles.lineRow}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text variant="bodySm" color={colors.textTertiary}>Service fee</Text>
                <View style={styles.pct}><Text style={{ fontSize: 10 }} weight="semibold" color={colors.textTertiary}>5%</Text></View>
              </View>
              <Text weight="semibold" style={{ fontSize: 13 }}>+{formatPKR(fee)}</Text>
            </View>
            <View style={[styles.lineRow, { borderTopWidth: 2, borderTopColor: colors.border, paddingTop: 12, marginTop: 2 }]}>
              <Text weight="extrabold" style={{ fontSize: 16 }}>Total</Text>
              <Text weight="extrabold" color={colors.primary} style={{ fontSize: 22, letterSpacing: -0.5 }}>{formatPKR(total)}</Text>
            </View>
            <View style={styles.payNote}>
              <Feather name="shield" size={13} color={colors.success} style={{ marginTop: 1 }} />
              <Text variant="bodySm" color={colors.textTertiary} style={{ flex: 1, fontSize: 11, lineHeight: 16 }}>Pay now to confirm — your cleaner is found right after payment. Cancel within 30 days for a refund (30% fee), credited within 1 week.</Text>
            </View>
          </View>
        </Card>

        {/* Payment Method */}
        <Card label="Payment Method">
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 }}>
            <View style={styles.payIcon}><Feather name="credit-card" size={18} color={colors.primary} /></View>
            <View style={{ flex: 1 }}>
              <Text weight="bold" style={{ fontSize: 15 }}>{pay?.name ?? 'Debit / Credit Card'}</Text>
              <Text variant="bodySm" color={colors.textTertiary}>{pay?.detail ?? 'Visa / Mastercard · via Bank Alfalah'}</Text>
            </View>
            {cards.length > 1 && (
              <Pressable onPress={() => setPayIdx((i) => (i + 1) % cards.length)} style={styles.changeBtn}>
                <Text weight="bold" color={colors.primary} style={{ fontSize: 13 }}>Change</Text>
              </Pressable>
            )}
          </View>
          <View style={styles.accepted}>
            {['Visa', 'Mastercard', 'Debit Card'].map((m) => <View key={m} style={styles.acceptChip}><Text weight="bold" color={colors.textSecondary} style={{ fontSize: 10 }}>{m}</Text></View>)}
          </View>
        </Card>
      </ScrollView>

      {/* Bottom */}
      <View style={styles.bottom}>
        {err && (
          <View style={styles.errNote}>
            <Feather name="alert-circle" size={14} color={colors.error} />
            <Text variant="bodySm" color={colors.error} style={{ flex: 1, fontSize: 12 }}>{err}</Text>
          </View>
        )}
        <View style={styles.trust}>
          <Trust icon="award" label="Verified cleaner" />
          <View style={styles.miniDot} />
          <Trust icon="check-square" label="Free cancellation" />
          <View style={styles.miniDot} />
          <Trust icon="lock" label="Secure payment" />
        </View>
        <Button
          label="Confirm & Pay"
          icon="lock"
          onPress={confirm} loading={loading} loadingLabel="Opening secure checkout..."
        />
      </View>

      {/* In-app secure card gateway (web) — embedded, no new tab */}
      <Modal visible={!!payUrl} animationType="slide" onRequestClose={() => { if (pollRef.current) clearInterval(pollRef.current); setPayUrl(null); }}>
        <SafeAreaView style={{ flex: 1, backgroundColor: colors.white }} edges={['top', 'bottom']}>
          <View style={styles.payHead}>
            <Pressable onPress={() => { if (pollRef.current) clearInterval(pollRef.current); setPayUrl(null); }} hitSlop={8} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Feather name="chevron-left" size={20} color={colors.textSecondary} />
              <Text weight="semibold" color={colors.textSecondary}>Cancel</Text>
            </Pressable>
            <Text weight="bold" style={{ fontSize: 15 }}>Secure Payment</Text>
            <View style={{ width: 60 }} />
          </View>
          {Platform.OS === 'web' && payUrl ? (
            // @ts-ignore — DOM iframe on web
            <iframe src={payUrl} style={{ border: 0, width: '100%', flex: 1 }} title="secure-payment" />
          ) : (
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}><ActivityIndicator color={colors.primary} /></View>
          )}
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

function Card({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={styles.card}>
      <View style={styles.cardHead}><Text variant="caption" color={colors.textDisabled} style={{ fontSize: 10, letterSpacing: 1.5, textTransform: 'uppercase' }}>{label}</Text></View>
      {children}
    </View>
  );
}
function Chip({ children, teal }: { children: React.ReactNode; teal?: boolean }) {
  return <View style={[styles.chip, teal && { backgroundColor: colors.primary50 }]}><Text weight="semibold" color={teal ? colors.primary : colors.textSecondary} style={{ fontSize: 11 }}>{children}</Text></View>;
}
function Line2({ title, sub, value, border }: { title: string; sub: string; value: string; border?: boolean }) {
  return (
    <View style={[styles.lineRow, border && { borderBottomWidth: 1, borderBottomColor: colors.surfaceAlt }]}>
      <View style={{ flex: 1 }}><Text weight="medium" color={colors.textSecondary} style={{ fontSize: 14 }}>{title}</Text><Text variant="bodySm" color={colors.textDisabled} style={{ fontSize: 11 }}>{sub}</Text></View>
      <Text weight="semibold" color={colors.textSecondary} style={{ fontSize: 14 }}>{value}</Text>
    </View>
  );
}
function Trust({ icon, label }: { icon: any; label: string }) {
  return <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}><Feather name={icon} size={13} color={colors.success} /><Text variant="bodySm" weight="medium" color={colors.textTertiary} style={{ fontSize: 11 }}>{label}</Text></View>;
}
function MapThumb() {
  return (
    <Svg width={76} height={76} viewBox="0 0 76 76">
      <Rect width="76" height="76" fill="#F0ECE3" />
      <Line x1="0" y1="25" x2="76" y2="25" stroke="white" strokeWidth="3.5" />
      <Line x1="0" y1="50" x2="76" y2="50" stroke="white" strokeWidth="3.5" />
      <Line x1="25" y1="0" x2="25" y2="76" stroke="white" strokeWidth="3.5" />
      <Line x1="51" y1="0" x2="51" y2="76" stroke="white" strokeWidth="3.5" />
      <Rect x="28" y="28" width="20" height="19" rx="2" fill="#B3DFE2" />
      <Path d="M38 17 C38 17 31 24 31 29 a7 7 0 0 0 14 0 C45 24 38 17 38 17Z" fill="#0B7C82" />
      <Circle cx="38" cy="29" r="2.5" fill="white" />
    </Svg>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surface },
  card: { backgroundColor: colors.white, borderRadius: radius.xl, overflow: 'hidden', ...shadow.soft },
  cardHead: { paddingHorizontal: 16, paddingTop: 11, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: colors.surfaceAlt },
  svcIcon: { width: 58, height: 58, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  miniDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: colors.primary },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4 },
  chip: { backgroundColor: colors.surface, paddingVertical: 3, paddingHorizontal: 9, borderRadius: 7 },
  mapThumb: { width: 76, height: 76, borderRadius: 12, overflow: 'hidden', ...shadow.soft },
  nowBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: colors.accent, borderRadius: 10, paddingVertical: 5, paddingHorizontal: 12 },
  eta: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: colors.warningBg, borderRadius: 10, padding: 11 },
  lineRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 9 },
  pct: { backgroundColor: colors.surface, borderRadius: 5, paddingHorizontal: 6, paddingVertical: 1 },
  payNote: { flexDirection: 'row', gap: 8, backgroundColor: colors.surface, borderRadius: 9, padding: 10, marginTop: 8 },
  payIcon: { width: 44, height: 44, borderRadius: 12, backgroundColor: colors.primary50, alignItems: 'center', justifyContent: 'center' },
  changeBtn: { backgroundColor: colors.primary50, borderRadius: 9, paddingVertical: 7, paddingHorizontal: 14 },
  accepted: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 16, paddingBottom: 14 },
  acceptChip: { backgroundColor: colors.surfaceAlt, borderWidth: 1, borderColor: colors.border, borderRadius: 6, paddingVertical: 4, paddingHorizontal: 10 },
  bottom: { backgroundColor: colors.white, borderTopWidth: 1, borderTopColor: colors.surface, paddingHorizontal: 20, paddingTop: 12, paddingBottom: 28 },
  errNote: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.errorBg, borderRadius: radius.md, padding: 10, marginBottom: 10 },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center', padding: 40 },
  overlayCard: { backgroundColor: colors.white, borderRadius: radius.xl, padding: 30, alignItems: 'center', width: '100%' },
  payHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.surface },
  trust: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 14, marginBottom: 12 },
});
