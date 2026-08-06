import { useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather, FontAwesome, MaterialCommunityIcons } from '@expo/vector-icons';
import Svg, { Rect, Line, Path, Circle, Ellipse } from 'react-native-svg';
import { Text, Button, NavBar } from '../../src/components';
import { colors, radius, shadow } from '../../src/theme/theme';
import { bookings as bookingsApi, user as userApi } from '../../src/services/api';
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

  useEffect(() => { userApi.me().then(setMe); }, []);

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
  const pay = me?.paymentMethods?.[payIdx];

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
    setLoading(false);
    if (draft.mode === 'now') {
      // Instant → PAY FIRST, then the cleaner search begins.
      router.replace({ pathname: '/booking/payment', params: { id: res.id } });
    } else {
      // Scheduled → posted to the open pool; a cleaner picks it up.
      router.replace('/(tabs)/bookings');
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
                <Text variant="bodySm" color={colors.textTertiary}>HomeService fee</Text>
                <View style={styles.pct}><Text style={{ fontSize: 10 }} weight="semibold" color={colors.textTertiary}>5%</Text></View>
              </View>
              <Text weight="semibold" style={{ fontSize: 13 }}>+{formatPKR(fee)}</Text>
            </View>
            <View style={[styles.lineRow, { borderTopWidth: 2, borderTopColor: colors.border, paddingTop: 12, marginTop: 2 }]}>
              <Text weight="extrabold" style={{ fontSize: 16 }}>Total</Text>
              <Text weight="extrabold" color={colors.primary} style={{ fontSize: 22, letterSpacing: -0.5 }}>{formatPKR(total)}</Text>
            </View>
            <View style={styles.payNote}>
              <Feather name="info" size={13} color={colors.textDisabled} style={{ marginTop: 1 }} />
              <Text variant="bodySm" color={colors.textTertiary} style={{ flex: 1, fontSize: 11, lineHeight: 16 }}>Payment collected after service completion. No charges until your home is cleaned.</Text>
            </View>
          </View>
        </Card>

        {/* Payment Method */}
        <Card label="Payment Method">
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 }}>
            <View style={styles.payIcon}><Feather name="credit-card" size={18} color={colors.primary} /></View>
            <View style={{ flex: 1 }}>
              <Text weight="bold" style={{ fontSize: 15 }}>{pay?.name ?? 'Bank Transfer'}</Text>
              <Text variant="bodySm" color={colors.textTertiary}>{pay?.detail ?? '—'}</Text>
            </View>
            {(me?.paymentMethods.length ?? 0) > 1 && (
              <Pressable onPress={() => setPayIdx((i) => (i + 1) % me!.paymentMethods.length)} style={styles.changeBtn}>
                <Text weight="bold" color={colors.primary} style={{ fontSize: 13 }}>Change</Text>
              </Pressable>
            )}
          </View>
          <View style={styles.accepted}>
            {['Easypaisa', 'JazzCash', 'HBL'].map((m) => <View key={m} style={styles.acceptChip}><Text weight="bold" color={colors.textSecondary} style={{ fontSize: 10 }}>{m}</Text></View>)}
            <View style={styles.acceptChip}><Text weight="semibold" color={colors.textDisabled} style={{ fontSize: 10 }}>+3 more</Text></View>
          </View>
        </Card>
      </ScrollView>

      {/* Bottom */}
      <View style={styles.bottom}>
        <View style={styles.trust}>
          <Trust icon="award" label="Verified cleaner" />
          <View style={styles.miniDot} />
          <Trust icon="check-square" label="Free cancellation" />
          <View style={styles.miniDot} />
          <Trust icon="lock" label="Secure payment" />
        </View>
        <Button
          label={draft.mode === 'now' ? 'Confirm & Find Cleaner' : 'Confirm & Post Booking'}
          icon={draft.mode === 'now' ? 'search' : 'check-circle'}
          onPress={confirm} loading={loading} loadingLabel={draft.mode === 'now' ? 'Finding your cleaner...' : 'Posting your booking...'}
        />
      </View>
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
  trust: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 14, marginBottom: 12 },
});
