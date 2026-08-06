import { useState } from 'react';
import { View, StyleSheet, ScrollView, Platform, Alert } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { buildInvoice, InvoiceData } from '../../src/invoice';
import { Text, Button, Card } from '../../src/components';
import { colors, radius, shadow } from '../../src/theme/theme';
import { useBooking } from '../../src/store/booking';
import { bookings as bookingsApi } from '../../src/services/api';
import { CLEANERS, USER } from '../../src/data/mock';
import { formatPKR } from '../../src/utils';

const METHOD_FALLBACK: Record<string, string> = {
  bank: 'Bank Transfer', easypaisa: 'Easypaisa', jazzcash: 'JazzCash', card: 'Card',
};

export default function Invoice() {
  const router = useRouter();
  const { id, cleaner, method, methodName, methodDetail, invoiceNo, txnId } = useLocalSearchParams<{
    id: string; cleaner?: string; method?: string; methodName?: string; methodDetail?: string; invoiceNo?: string; txnId?: string;
  }>();
  const { selectedAddOns, subtotal, fee, total, draft } = useBooking();
  const service = draft.service;
  const [sharing, setSharing] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // The exact account the customer paid from.
  const payLabel = methodName
    ? `${methodName}${methodDetail ? ` · ${methodDetail}` : ''}`
    : METHOD_FALLBACK[method ?? 'bank'] ?? 'Bank Transfer';

  const matched = draft.matchedCleaner ?? CLEANERS.find((c) => c.id === cleaner) ?? CLEANERS[0];
  const inv = invoiceNo ?? `INV-${id}`;
  const dateStr = draft.dateLabel ?? 'Today';

  function invoiceHtml(): string {
    const rows = [
      { label: `${service?.name ?? 'Service'} × ${draft.quantity}`, amount: (service?.basePrice ?? 0) * draft.quantity },
      ...selectedAddOns.map((a) => ({ label: `${a.name} (add-on)`, amount: a.price * draft.quantity })),
    ];
    const lineRows = rows
      .map((r) => `<tr><td>${r.label}</td><td style="text-align:right">${formatPKR(r.amount)}</td></tr>`)
      .join('');
    return `
      <html><head><meta name="viewport" content="width=device-width, initial-scale=1"><style>
        * { font-family: -apple-system, system-ui, sans-serif; box-sizing: border-box; }
        body { margin: 0; padding: 32px; color: #111827; }
        .head { display:flex; justify-content:space-between; align-items:flex-start; border-bottom:3px solid #0B7C82; padding-bottom:20px; }
        .brand { display:flex; align-items:center; gap:10px; }
        .mark { width:40px; height:40px; background:#F39C12; border-radius:10px; color:#fff; font-weight:800; display:flex; align-items:center; justify-content:center; font-size:16px; }
        h1 { font-size:22px; margin:0; letter-spacing:-0.5px; }
        .muted { color:#6B7280; font-size:12px; }
        .paid { background:#D1FAE5; color:#065F46; font-weight:700; padding:6px 14px; border-radius:20px; font-size:13px; display:inline-block; }
        table { width:100%; border-collapse:collapse; margin-top:24px; font-size:14px; }
        td { padding:10px 0; border-bottom:1px solid #F3F4F6; }
        .total td { border-top:2px solid #0B7C82; border-bottom:none; font-weight:800; font-size:18px; color:#0B7C82; padding-top:14px; }
        .grid { display:flex; gap:40px; margin-top:24px; }
        .grid h3 { font-size:11px; color:#9CA3AF; letter-spacing:1px; text-transform:uppercase; margin:0 0 6px; }
        .foot { margin-top:40px; padding-top:20px; border-top:1px solid #E5E7EB; color:#9CA3AF; font-size:11px; text-align:center; }
      </style></head><body>
        <div class="head">
          <div>
            <div class="brand"><div class="mark">HS</div><h1>HomeService</h1></div>
            <div class="muted" style="margin-top:8px">Pakistan · PKR · homeservice.pk</div>
          </div>
          <div style="text-align:right">
            <div class="paid">✓ PAID</div>
            <div class="muted" style="margin-top:8px">Invoice ${inv}</div>
            <div class="muted">${dateStr}</div>
          </div>
        </div>
        <div class="grid">
          <div><h3>Billed To</h3><div>${USER.name}</div><div class="muted">${USER.phone}</div><div class="muted">${draft.address}</div></div>
          <div><h3>Cleaner</h3><div>${matched.name}</div><div class="muted">★ ${matched.rating} · ${matched.jobs} jobs</div></div>
        </div>
        <table>
          ${lineRows}
          <tr><td class="muted">Subtotal</td><td style="text-align:right" class="muted">${formatPKR(subtotal)}</td></tr>
          <tr><td class="muted">HomeService fee (5%)</td><td style="text-align:right" class="muted">${formatPKR(fee)}</td></tr>
          <tr class="total"><td>Total Paid</td><td style="text-align:right">${formatPKR(total)}</td></tr>
        </table>
        <div class="grid">
          <div><h3>Payment Method</h3><div>${payLabel}</div></div>
          <div><h3>Transaction ID</h3><div>${txnId ?? '—'}</div></div>
        </div>
        <div class="foot">Thank you for choosing HomeService. This is a computer-generated invoice.</div>
      </body></html>`;
  }

  function invoiceData(): InvoiceData {
    return {
      invoiceNo: inv,
      date: dateStr,
      billedName: USER.name,
      billedPhone: USER.phone,
      billedAddress: draft.address,
      cleanerName: matched.name,
      cleanerRating: matched.rating,
      cleanerJobs: matched.jobs,
      items: [
        { label: `${service?.name ?? 'Service'} x ${draft.quantity}`, amount: (service?.basePrice ?? 0) * draft.quantity },
        ...selectedAddOns.map((a) => ({ label: `${a.name} (add-on)`, amount: a.price * draft.quantity })),
      ],
      subtotal,
      fee,
      total,
      methodLabel: payLabel,
      txnId: txnId ?? '—',
    };
  }

  async function downloadInvoice() {
    setSharing(true);
    try {
      if (Platform.OS === 'web') {
        // Real vector PDF, downloaded straight to the browser's Downloads folder.
        buildInvoice(invoiceData()).save(`Invoice-${inv}.pdf`);
      } else {
        // Native: generate a real PDF then open the save/share sheet.
        const { uri } = await Print.printToFileAsync({ html: invoiceHtml() });
        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(uri, { mimeType: 'application/pdf', dialogTitle: `Invoice ${inv}`, UTI: 'com.adobe.pdf' });
        } else {
          Alert.alert('Invoice saved', uri);
        }
      }
    } catch (e) {
      Alert.alert('Could not generate invoice', String(e));
    } finally {
      setSharing(false);
    }
  }

  async function confirmBooking() {
    setConfirming(true);
    try {
      await bookingsApi.create({
        id: id ?? 'HS-2025-00125',
        service: service?.name,
        addOns: selectedAddOns.map((a) => a.name),
        status: 'confirmed',
        scheduledType: draft.mode,
        dateLabel: draft.dateLabel ?? 'Today',
        timeLabel: draft.timeLabel ?? 'Now',
        address: draft.address,
        total,
        cleaner: matched,
      });
    } catch (e: any) {
      setConfirming(false);
      // A 401 (expired session) already clears the token + redirects to Welcome
      // via the global unauthorized handler — nothing else to do here.
      if (String(e?.message ?? '').includes('401')) return;
      setError('Could not confirm your booking. Please try again.');
      return;
    }
    setConfirming(false);
    // Instant → live tracking. Scheduled → back to Bookings (nothing to track yet).
    if (draft.mode === 'later') router.replace('/(tabs)/bookings');
    else router.replace(`/booking/${id ?? 'HS-2025-00125'}`);
  }

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }} showsVerticalScrollIndicator={false}>
        {/* Success header */}
        <View style={styles.successHead}>
          <View style={styles.checkCircle}><Feather name="check" size={38} color={colors.white} /></View>
          <Text variant="h1" center style={{ marginTop: 16 }}>Payment Successful</Text>
          <Text center color={colors.textTertiary} style={{ marginTop: 4 }}>{formatPKR(total)} paid · {payLabel}</Text>
        </View>

        {/* Invoice card */}
        <Card style={{ padding: 20 }}>
          <View style={styles.invHead}>
            <View>
              <Text variant="caption" color={colors.textDisabled} style={{ letterSpacing: 1 }}>INVOICE</Text>
              <Text weight="extrabold" style={{ fontSize: 16 }}>{inv}</Text>
            </View>
            <View style={styles.paidBadge}>
              <Feather name="check-circle" size={13} color={colors.successText} />
              <Text weight="bold" color={colors.successText} style={{ fontSize: 12 }}>PAID</Text>
            </View>
          </View>

          <View style={styles.metaGrid}>
            <View style={{ flex: 1 }}>
              <Text variant="caption" color={colors.textDisabled}>BILLED TO</Text>
              <Text weight="semibold" style={{ marginTop: 2 }}>{USER.name}</Text>
              <Text variant="bodySm" color={colors.textTertiary}>{USER.phone}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text variant="caption" color={colors.textDisabled}>CLEANER</Text>
              <Text weight="semibold" style={{ marginTop: 2 }}>{matched.name}</Text>
              <Text variant="bodySm" color={colors.textTertiary}>★ {matched.rating} · {matched.jobs} jobs</Text>
            </View>
          </View>

          <View style={styles.divider} />

          {/* Line items */}
          <LineItem label={`${service?.name ?? 'Service'} × ${draft.quantity}`} value={formatPKR((service?.basePrice ?? 0) * draft.quantity)} />
          {selectedAddOns.map((a) => (
            <LineItem key={a.id} label={`${a.name}`} sub="add-on" value={formatPKR(a.price * draft.quantity)} />
          ))}
          <LineItem label="Subtotal" value={formatPKR(subtotal)} muted />
          <LineItem label="HomeService fee (5%)" value={formatPKR(fee)} muted />

          <View style={styles.totalRow}>
            <Text weight="extrabold" style={{ fontSize: 16 }}>Total Paid</Text>
            <Text weight="extrabold" color={colors.primary} style={{ fontSize: 22 }}>{formatPKR(total)}</Text>
          </View>
        </Card>

        {/* Download */}
        <Button label="Download / Share Invoice" variant="secondary" icon="download" onPress={downloadInvoice} loading={sharing} loadingLabel="Preparing…" style={{ borderColor: colors.primary }} />
      </ScrollView>

      <View style={styles.footer}>
        {error && (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <Feather name="alert-circle" size={14} color={colors.error} />
            <Text variant="bodySm" color={colors.error} style={{ flex: 1 }}>{error}</Text>
          </View>
        )}
        <Button label={draft.mode === 'later' ? 'Confirm Booking' : 'Confirm & Track Booking'} icon="check-circle" onPress={confirmBooking} loading={confirming} loadingLabel="Confirming…" />
      </View>
    </SafeAreaView>
  );
}

function LineItem({ label, sub, value, muted }: { label: string; sub?: string; value: string; muted?: boolean }) {
  return (
    <View style={styles.lineItem}>
      <View style={{ flex: 1 }}>
        <Text color={muted ? colors.textTertiary : colors.textSecondary} weight={muted ? 'regular' : 'medium'}>{label}</Text>
        {sub && <Text variant="bodySm" color={colors.textDisabled}>{sub}</Text>}
      </View>
      <Text weight="semibold" color={muted ? colors.textTertiary : colors.textSecondary}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surface },
  successHead: { alignItems: 'center', paddingVertical: 20 },
  checkCircle: { width: 80, height: 80, borderRadius: 40, backgroundColor: colors.success, alignItems: 'center', justifyContent: 'center', ...shadow.card },
  invHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  paidBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: colors.successBg, paddingVertical: 5, paddingHorizontal: 12, borderRadius: radius.pill },
  metaGrid: { flexDirection: 'row', gap: 16, marginTop: 16 },
  divider: { height: 1, backgroundColor: colors.surface, marginVertical: 14 },
  lineItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#F9FAFB' },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 2, borderTopColor: colors.border, marginTop: 8, paddingTop: 14 },
  footer: { padding: 16, paddingTop: 12, backgroundColor: colors.white, borderTopWidth: 1, borderTopColor: '#F0F0F0', ...shadow.card },
});
