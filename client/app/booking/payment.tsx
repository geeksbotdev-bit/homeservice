import { useCallback, useState } from 'react';
import { View, StyleSheet, ScrollView, Pressable, Modal, ActivityIndicator, Platform } from 'react-native';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { Text, Button, NavBar, Card } from '../../src/components';
import { colors, radius, shadow } from '../../src/theme/theme';
import { useBooking } from '../../src/store/booking';
import { payments, user as userApi } from '../../src/services/api';
import { formatPKR } from '../../src/utils';
import type { PaymentMethod } from '../../src/data/types';

const ICONS: Record<string, any> = { bank: 'home', easypaisa: 'smartphone', jazzcash: 'smartphone', card: 'credit-card' };

export default function Payment() {
  const router = useRouter();
  const { id, failed } = useLocalSearchParams<{ id: string; failed?: string }>();
  const { total, subtotal, fee, draft, selectedAddOns } = useBooking();
  const service = draft.service;
  const [methods, setMethods] = useState<PaymentMethod[] | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [err, setErr] = useState<string | null>(failed ? 'Payment was cancelled or failed. Please try again.' : null);

  // Load the user's OWN saved payment methods (money is charged from these).
  useFocusEffect(useCallback(() => {
    userApi.me().then((me) => {
      setMethods(me.paymentMethods);
      setSelectedId((cur) => cur ?? (me.paymentMethods.find((p) => p.isDefault) ?? me.paymentMethods[0])?.id ?? null);
    }).catch(() => setMethods([]));
  }, []));

  const selected = methods?.find((m) => m.id === selectedId) ?? null;

  const bookingId = id ?? 'HS-2025-00125';

  // Real card payment via Bank Alfalah (MPGS) Hosted Checkout.
  async function payWithCard() {
    setErr(null);
    setProcessing(true);
    try {
      const { launchUrl } = await payments.createSession(bookingId);
      if (Platform.OS === 'web') {
        // Redirect the browser to the secure gateway; it returns to the app.
        window.location.assign(launchUrl);
        return; // navigating away
      }
      // Native: open the gateway in an in-app browser screen.
      router.replace({ pathname: '/pay-webview', params: { url: launchUrl, id: bookingId } });
    } catch (e: any) {
      setProcessing(false);
      setErr(String(e?.message ?? '').includes('401') ? 'Session expired — please sign in again.' : 'Could not start payment. Please try again.');
    }
  }

  // Pay from a saved wallet / bank (marks paid directly, then starts the search).
  async function payFromSaved() {
    if (!selected) return;
    setProcessing(true);
    try {
      await payments.pay(bookingId, selected.type, total);
      router.replace({ pathname: '/booking/finding', params: { id: bookingId } });
    } catch {
      setProcessing(false);
      setErr('Payment failed. Please try again.');
    }
  }

  // Pay using whatever method the customer selected: card → Bank Alfalah
  // gateway; bank / Easypaisa / JazzCash → that saved account.
  function payWithSelected() {
    if (!selected) return payWithCard();
    if (selected.type === 'card') return payWithCard();
    return payFromSaved();
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

        {/* Saved payment methods */}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 4, marginHorizontal: 4 }}>
          <Text variant="caption" color={colors.textDisabled} style={{ letterSpacing: 1 }}>PAY FROM YOUR ACCOUNT</Text>
          <Pressable onPress={() => router.push('/payment/new')} hitSlop={8} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <Feather name="plus" size={13} color={colors.primary} />
            <Text weight="semibold" color={colors.primary} style={{ fontSize: 12 }}>Add</Text>
          </Pressable>
        </View>

        {methods === null ? (
          <ActivityIndicator color={colors.primary} style={{ paddingVertical: 20 }} />
        ) : methods.length === 0 ? (
          <Card style={{ padding: 20, alignItems: 'center', gap: 10 }}>
            <Feather name="credit-card" size={28} color={colors.border} />
            <Text color={colors.textTertiary} center>No payment method saved. Add the account you'll pay from.</Text>
            <Button label="Add Payment Method" icon="plus" fullWidth={false} onPress={() => router.push('/payment/new')} style={{ paddingHorizontal: 24 }} />
          </Card>
        ) : (
          <View style={{ gap: 10 }}>
            {methods.map((m) => {
              const active = selectedId === m.id;
              return (
                <Pressable key={m.id} onPress={() => setSelectedId(m.id)} style={[styles.method, active && styles.methodActive]}>
                  <View style={[styles.methodIcon, active && { backgroundColor: colors.primary }]}>
                    <Feather name={ICONS[m.type] ?? 'credit-card'} size={18} color={active ? colors.white : colors.primary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <Text weight="bold" style={{ fontSize: 14 }}>{m.name}</Text>
                      {m.isDefault && <View style={styles.defBadge}><Text style={{ fontSize: 9 }} weight="bold" color={colors.primary700}>DEFAULT</Text></View>}
                    </View>
                    <Text variant="bodySm" color={colors.textTertiary}>{m.detail}</Text>
                  </View>
                  <View style={[styles.radio, active && styles.radioActive]}>{active && <View style={styles.radioDot} />}</View>
                </Pressable>
              );
            })}
          </View>
        )}

        {err && (
          <View style={[styles.chargeNote, { backgroundColor: colors.errorBg }]}>
            <Feather name="alert-circle" size={14} color={colors.error} />
            <Text variant="bodySm" color={colors.error} style={{ flex: 1, fontSize: 12 }}>{err}</Text>
          </View>
        )}
        {selected && selected.type === 'card' && (
          <View style={styles.chargeNote}>
            <Feather name="shield" size={14} color={colors.success} />
            <Text variant="bodySm" color={colors.textSecondary} style={{ flex: 1, fontSize: 12 }}>
              You'll enter your card securely on <Text weight="bold">Bank Alfalah</Text> checkout.
            </Text>
          </View>
        )}
        {selected && selected.type !== 'card' && (
          <View style={styles.chargeNote}>
            <Feather name="alert-circle" size={14} color={colors.warning} />
            <Text variant="bodySm" color={colors.warningText} style={{ flex: 1, fontSize: 12 }}>
              {formatPKR(total)} will be paid from <Text weight="bold">{selected.name} · {selected.detail}</Text>.
            </Text>
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

      {/* Sticky pay button — uses the customer's selected method */}
      <View style={styles.footer}>
        <Button
          label={selected ? `Pay ${formatPKR(total)} · ${selected.type === 'card' ? 'Card' : selected.name}` : `Pay ${formatPKR(total)} with Card`}
          icon="lock"
          onPress={payWithSelected}
        />
      </View>

      {/* Processing overlay */}
      <Modal visible={processing} transparent animationType="fade">
        <View style={styles.overlay}>
          <View style={styles.processingCard}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text weight="bold" style={{ marginTop: 16, fontSize: 16 }}>{!selected || selected.type === 'card' ? 'Opening secure checkout…' : 'Processing payment…'}</Text>
            <Text variant="bodySm" color={colors.textTertiary} center style={{ marginTop: 4 }}>{!selected || selected.type === 'card' ? 'Bank Alfalah' : selected.name}</Text>
          </View>
        </View>
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
