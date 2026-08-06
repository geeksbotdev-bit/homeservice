import { Platform, Alert } from 'react-native';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { buildInvoice, type InvoiceData } from './invoice';
import { formatPKR } from './utils';

const METHOD_LABEL: Record<string, string> = {
  bank: 'Bank Transfer', easypaisa: 'Easypaisa', jazzcash: 'JazzCash', card: 'Card',
};
export function methodLabel(m?: string) { return METHOD_LABEL[m ?? 'bank'] ?? 'Bank Transfer'; }

/** Themed HTML receipt (used for native PDF printing). */
export function invoiceHtml(d: InvoiceData): string {
  const rows = d.items.map((r) => `<tr><td>${r.label}</td><td style="text-align:right">${formatPKR(r.amount)}</td></tr>`).join('');
  return `<html><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>
    *{font-family:-apple-system,system-ui,sans-serif;box-sizing:border-box}body{margin:0;padding:32px;color:#111827}
    .head{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:3px solid #0B7C82;padding-bottom:20px}
    .mark{width:40px;height:40px;background:#F39C12;border-radius:10px;color:#fff;font-weight:800;display:flex;align-items:center;justify-content:center;font-size:16px}
    .paid{background:#D1FAE5;color:#065F46;font-weight:700;padding:6px 14px;border-radius:20px;font-size:13px;display:inline-block}
    .muted{color:#6B7280;font-size:12px}table{width:100%;border-collapse:collapse;margin-top:24px;font-size:14px}
    td{padding:10px 0;border-bottom:1px solid #F3F4F6}.total td{border-top:2px solid #0B7C82;font-weight:800;font-size:18px;color:#0B7C82;padding-top:14px}
    .grid{display:flex;gap:40px;margin-top:24px}.grid h3{font-size:11px;color:#9CA3AF;letter-spacing:1px;text-transform:uppercase;margin:0 0 6px}
    .foot{margin-top:40px;padding-top:20px;border-top:1px solid #E5E7EB;color:#9CA3AF;font-size:11px;text-align:center}</style></head><body>
    <div class="head"><div><div style="display:flex;align-items:center;gap:10px"><div class="mark">HS</div><h1 style="margin:0;font-size:22px">HomeService</h1></div>
    <div class="muted" style="margin-top:8px">Pakistan · PKR · homeservice.pk</div></div>
    <div style="text-align:right"><div class="paid">✓ PAID</div><div class="muted" style="margin-top:8px">Receipt ${d.invoiceNo}</div><div class="muted">${d.date}</div></div></div>
    <div class="grid"><div><h3>Billed To</h3><div>${d.billedName}</div><div class="muted">${d.billedPhone}</div><div class="muted">${d.billedAddress}</div></div>
    <div><h3>Cleaner</h3><div>${d.cleanerName}</div><div class="muted">★ ${d.cleanerRating} · ${d.cleanerJobs} jobs</div></div></div>
    <table>${rows}<tr class="total"><td>Total Paid</td><td style="text-align:right">${formatPKR(d.total)}</td></tr></table>
    <div class="grid"><div><h3>Payment Method</h3><div>${d.methodLabel}</div></div><div><h3>Transaction ID</h3><div>${d.txnId}</div></div></div>
    <div class="foot">Thank you for choosing HomeService. This is a computer-generated receipt.</div></body></html>`;
}

/** Download/share the receipt as a real PDF (web: jsPDF download, native: print+share). */
export async function downloadReceipt(d: InvoiceData) {
  try {
    if (Platform.OS === 'web') {
      buildInvoice(d).save(`Receipt-${d.invoiceNo}.pdf`);
    } else {
      const { uri } = await Print.printToFileAsync({ html: invoiceHtml(d) });
      if (await Sharing.isAvailableAsync()) await Sharing.shareAsync(uri, { mimeType: 'application/pdf', dialogTitle: `Receipt ${d.invoiceNo}`, UTI: 'com.adobe.pdf' });
      else Alert.alert('Receipt saved', uri);
    }
  } catch (e) {
    Alert.alert('Could not generate receipt', String(e));
  }
}
