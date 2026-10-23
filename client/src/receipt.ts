import { Platform } from 'react-native';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import type { InvoiceData } from './invoice';
import { formatPKR } from './utils';
import { BUSINESS, legalLine } from './business';
import { tr, alertT } from './i18n';
import { getLang } from './store/lang';

const METHOD_LABEL: Record<string, string> = {
  bank: 'Bank Transfer', easypaisa: 'Easypaisa', jazzcash: 'JazzCash', card: 'Card',
};
export function methodLabel(m?: string) { return METHOD_LABEL[m ?? 'bank'] ?? 'Bank Transfer'; }

/**
 * The printable receipt.
 *
 * This is the document a customer may file for tax or show to their employer,
 * so it names the registered entity being paid, its NTN and address — not just
 * the brand — alongside the usual line items.
 */
export function invoiceHtml(d: InvoiceData): string {
  // An add-on carries no separate price, so its row shows the name only —
  // printing "PKR 0" next to it would read as though it were free.
  const rows = d.items
    .map((r) => `<tr><td>${r.label}</td><td class="amt">${r.amount > 0 ? formatPKR(r.amount) : '\u2014'}</td></tr>`)
    .join('');
  const rtl = getLang() === 'ur';
  return `<html dir="${rtl ? 'rtl' : 'ltr'}"><head><meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<style>
  *{font-family:-apple-system,system-ui,"Segoe UI",Roboto,Arial,sans-serif;box-sizing:border-box}
  body{margin:0;padding:34px 32px;color:#111827;font-size:13px}
  .head{display:flex;justify-content:space-between;align-items:flex-start;gap:24px;
        border-bottom:3px solid #0B7C82;padding-bottom:18px}
  .logo{height:54px;width:auto;display:block}
  .brand{font-size:20px;font-weight:800;margin:8px 0 2px}
  .entity{color:#4B5563;font-size:11.5px;line-height:1.65}
  .entity b{color:#111827}
  .right{text-align:${rtl ? 'left' : 'right'};flex:none}
  .paid{background:#D1FAE5;color:#065F46;font-weight:700;padding:6px 14px;border-radius:20px;
        font-size:12px;display:inline-block;letter-spacing:.3px}
  .inv{font-size:11.5px;color:#6B7280;margin-top:10px;line-height:1.7}
  .inv b{color:#111827}
  .grid{display:flex;gap:36px;margin-top:22px}
  .grid > div{flex:1}
  h3{font-size:10px;color:#9CA3AF;letter-spacing:1.1px;text-transform:uppercase;margin:0 0 6px;font-weight:700}
  .muted{color:#6B7280;font-size:11.5px;line-height:1.6}
  table{width:100%;border-collapse:collapse;margin-top:26px;font-size:13px}
  th{text-align:${rtl ? 'right' : 'left'};font-size:10px;color:#9CA3AF;letter-spacing:1.1px;
     text-transform:uppercase;padding-bottom:8px;border-bottom:1.5px solid #E5E7EB}
  th.amt,td.amt{text-align:${rtl ? 'left' : 'right'}}
  td{padding:10px 0;border-bottom:1px solid #F3F4F6}
  tr.sub td{color:#6B7280;border-bottom:none;padding:6px 0}
  tr.total td{border-top:2px solid #0B7C82;border-bottom:none;font-weight:800;font-size:17px;
              color:#0B7C82;padding-top:13px}
  .foot{margin-top:34px;padding-top:16px;border-top:1px solid #E5E7EB;color:#9CA3AF;
        font-size:10.5px;text-align:center;line-height:1.75}
</style></head><body>

  <div class="head">
    <div>
      <img class="logo" src="${BUSINESS.logoUrl}" alt="${BUSINESS.brand}"/>
      <div class="brand">${BUSINESS.brand}</div>
      <div class="entity">
        <b>${BUSINESS.legalName}</b> \u00b7 ${tr('Proprietor')}: ${BUSINESS.proprietor}<br/>
        ${tr('NTN')}: ${BUSINESS.ntn} (${BUSINESS.taxOffice})<br/>
        ${BUSINESS.address}<br/>
        ${BUSINESS.phone} \u00b7 ${BUSINESS.email}
      </div>
    </div>
    <div class="right">
      <div class="paid">\u2713 ${tr('PAID')}</div>
      <div class="inv">
        <b>${tr('Invoice')} ${d.invoiceNo}</b><br/>
        ${tr('Date')}: ${d.date}<br/>
        ${tr('Currency')}: ${BUSINESS.currency}
      </div>
    </div>
  </div>

  <div class="grid">
    <div>
      <h3>${tr('Billed To')}</h3>
      <div>${d.billedName}</div>
      <div class="muted">${d.billedPhone}</div>
      <div class="muted">${d.billedAddress}</div>
    </div>
    <div>
      <h3>${tr('Service provided by')}</h3>
      <div>${d.cleanerName}</div>
      <div class="muted">\u2605 ${d.cleanerRating} \u00b7 ${d.cleanerJobs} ${tr('jobs')}</div>
    </div>
  </div>

  <table>
    <tr><th>${tr('Description')}</th><th class="amt">${tr('Amount')}</th></tr>
    ${rows}
    <tr class="sub"><td>${tr('Subtotal')}</td><td class="amt">${formatPKR(d.subtotal)}</td></tr>
    <tr class="sub"><td>${tr('Service fee')}</td><td class="amt">${formatPKR(d.fee)}</td></tr>
    <tr class="total"><td>${tr('Total Paid')}</td><td class="amt">${formatPKR(d.total)}</td></tr>
  </table>

  <div class="grid">
    <div><h3>${tr('Payment Method')}</h3><div>${d.methodLabel}</div></div>
    <div><h3>${tr('Transaction ID')}</h3><div>${d.txnId}</div></div>
  </div>

  <div class="foot">
    ${tr('Thank you for choosing WithUrooj. This is a computer-generated receipt and needs no signature.')}<br/>
    ${legalLine()} \u00b7 ${BUSINESS.website}
  </div>
</body></html>`;
}

/** Download/share the receipt as a real PDF (web: jsPDF download, native: print+share). */
export async function downloadReceipt(d: InvoiceData) {
  try {
    if (Platform.OS === 'web') {
      // jsPDF is a browser/DOM library — import it ONLY on web, lazily, so it
      // never loads (and crashes) on native.
      const { buildInvoice } = await import('./invoice');
      buildInvoice(d).save(`Receipt-${d.invoiceNo}.pdf`);
    } else {
      const { uri } = await Print.printToFileAsync({ html: invoiceHtml(d) });
      if (await Sharing.isAvailableAsync()) await Sharing.shareAsync(uri, { mimeType: 'application/pdf', dialogTitle: `Receipt ${d.invoiceNo}`, UTI: 'com.adobe.pdf' });
      else alertT('Receipt saved', uri);
    }
  } catch (e) {
    alertT('Could not generate receipt', String(e));
  }
}
