import { useEffect, useRef, useState } from 'react';
import { View, StyleSheet, ScrollView, Pressable, Modal, ActivityIndicator, Platform } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { Text, Button, NavBar, Card } from '../../src/components';
import { colors, radius, shadow } from '../../src/theme/theme';
import { useBooking } from '../../src/store/booking';
import { payments } from '../../src/services/api';
import { formatPKR } from '../../src/utils';

export default function Payment() {
  const router = useRouter();
  const { id, failed } = useLocalSearchParams<{ id: string; failed?: string }>();
  const { total, subtotal, fee, draft, selectedAddOns } = useBooking();
  const service = draft.service;
  const [processing, setProcessing] = useState(false);
  const [payUrl, setPayUrl] = useState<string | null>(null); // in-app gateway (web)
  const [err, setErr] = useState<string | null>(failed ? 'Payment was cancelled or failed. Please try again.' : null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  useEffect(() => () => { if (pollRef.current) clearInterval(pollRef.current); }, []);

  const bookingId = id ?? 'HS-2025-00125';

  // Real card payment via Bank Alfalah (MPGS) — embedded IN-APP (no new tab).
  async function payWithCard() {
    setErr(null);
    setProcessing(true);
    try {
      const { launchUrl } = await payments.createSession(bookingId);
      if (Platform.OS === 'web') {
        // Show the secure card form inside the app (embedded iframe), then poll
        // the booking — the moment the gateway confirms payment, we continue.
        setProcessing(false);
        setPayUrl(launchUrl);
        const t = setInterval(async () => {
          const r = await payments.verify(bookingId).catch(() => null);
          if (r?.status === 'paid') {
            clearInterval(t);
            setPayUrl(null);
            router.replace({ pathname: '/booking/finding', params: { id: bookingId } });
          }
        }, 2500);
        pollRef.current = t;
        return;
      }
      // Native: open the gateway in an in-app browser screen.
      router.replace({ pathname: '/pay-webview', params: { url: launchUrl, id: bookingId } });
    } catch (e: any) {
      setProcessing(false);
      setErr(String(e?.message ?? '').includes('401') ? 'Session expired — please sign in again.' : 'Could not start payment. Please try again.');
    }
  }

  return (
    <SafeAreaView style={styles.root} edges={['bottom']}>
      <NavBar title="Payment" bordered />

      <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }} showsVerticalScrollIndicator={false}>
        {/* Pay-first banner — cleaner is searched AFTER payment */}
        <View style={styles.matchedBanner}>
          <View style={styles.avatar}><Feather name="search" size={20} color={colors.white} /></View>
          <View style={{ flex: 1 }}>
            <Text weight="bold" color={colors.white} style={{ fontSize: 15 }}>Pay to start your booking</Text>
            <Text color="rgba(255,255,255,0.85)" variant="bodySm">We'll find you a nearby cleaner right after payment</Text>
          </View>
          <Feather name="arrow-right" size={20} color={colors.white} />
        </View>

        {/* Amount due */}
        <Card style={{ padding: 20, alignItems: 'center' }}>
          <Text variant="caption" color={colors.textDisabled} style={{ letterSpacing: 1 }}>AMOUNT DUE</Text>
          <Text weight="extrabold" color={colors.primary} style={{ fontSize: 36, letterSpacing: -1, marginTop: 4 }}>{formatPKR(total)}</Text>
          {service && <Text variant="bodySm" color={colors.textTertiary} style={{ marginTop: 4 }}>{service.name}{selectedAddOns.length ? ` + ${selectedAddOns.length} add-on` : ''} · {draft.quantity} {service.unitNoun}{draft.quantity > 1 ? 's' : ''}</Text>}
        </Card>

        {/* Card-only payment via the secure gateway */}
        <View style={styles.cardInfo}>
          <View style={styles.methodIcon}><Feather name="credit-card" size={18} color={colors.primary} /></View>
          <View style={{ flex: 1 }}>
            <Text weight="bold" style={{ fontSize: 14 }}>Debit / Credit Card</Text>
            <Text variant="bodySm" color={colors.textTertiary}>Visa / Mastercard · via Bank Alfalah</Text>
          </View>
          <Feather name="shield" size={18} color={colors.success} />
        </View>

        {err && (
          <View style={[styles.chargeNote, { backgroundColor: colors.errorBg }]}>
            <Feather name="alert-circle" size={14} color={colors.error} />
            <Text variant="bodySm" color={colors.error} style={{ flex: 1, fontSize: 12 }}>{err}</Text>
          </View>
        )}

        {/* Price breakdown */}
        <Card style={{ padding: 16 }}>
          <Row label="Subtotal" value={formatPKR(subtotal)} />
          <Row label="HomeService fee (5%)" value={formatPKR(fee)} />
          <View style={styles.totalRow}>
            <Text weight="extrabold" style={{ fontSize: 16 }}>Total</Text>
            <Text weight="extrabold" color={colors.primary} style={{ fontSize: 18 }}>{formatPKR(total)}</Text>
          </View>
        </Card>

        <View style={styles.secure}>
          <Feather name="lock" size={14} color={colors.success} />
          <Text variant="bodySm" color={colors.textTertiary} style={{ flex: 1 }}>Card payments are processed securely by Bank Alfalah. An invoice is generated after payment.</Text>
        </View>
      </ScrollView>

      {/* Sticky pay button — always through the Bank Alfalah card gateway.
          The cleaner search only begins after the gateway confirms payment. */}
      <View style={styles.footer}>
        <Button label={`Pay ${formatPKR(total)} with Card`} icon="lock" onPress={payWithCard} loading={processing} />
      </View>

      {/* Processing overlay */}
      <Modal visible={processing} transparent animationType="fade">
        <View style={styles.overlay}>
          <View style={styles.processingCard}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text weight="bold" style={{ marginTop: 16, fontSize: 16 }}>Opening secure checkout…</Text>
            <Text variant="bodySm" color={colors.textTertiary} center style={{ marginTop: 4 }}>Bank Alfalah</Text>
          </View>
        </View>
      </Modal>

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

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.priceRow}>
      <Text color={colors.textTertiary}>{label}</Text>
      <Text weight="semibold" color={colors.textSecondary}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surface },
  matchedBanner: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.success, borderRadius: radius.xl, padding: 14 },
  avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.25)', alignItems: 'center', justifyContent: 'center' },
  method: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.white, borderRadius: radius.lg, padding: 14, borderWidth: 1.5, borderColor: colors.border },
  methodActive: { borderColor: colors.primary, backgroundColor: '#F0FAFA' },
  methodIcon: { width: 40, height: 40, borderRadius: radius.md, backgroundColor: colors.primary50, alignItems: 'center', justifyContent: 'center' },
  cardInfo: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.white, borderRadius: radius.lg, padding: 14, borderWidth: 1.5, borderColor: colors.border },
  payHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.surface },
  defBadge: { backgroundColor: colors.primary50, borderRadius: 5, paddingHorizontal: 6, paddingVertical: 1 },
  radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  radioActive: { borderColor: colors.primary },
  radioDot: { width: 11, height: 11, borderRadius: 6, backgroundColor: colors.primary },
  chargeNote: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.warningBg, borderRadius: radius.lg, padding: 12 },
  priceRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 2, borderTopColor: colors.border, marginTop: 6, paddingTop: 12 },
  secure: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 4, marginBottom: 8 },
  footer: { padding: 16, paddingTop: 12, backgroundColor: colors.white, borderTopWidth: 1, borderTopColor: '#F0F0F0', ...shadow.card },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center', padding: 40 },
  processingCard: { backgroundColor: colors.white, borderRadius: radius.xl, padding: 32, alignItems: 'center', width: '100%' },
});
