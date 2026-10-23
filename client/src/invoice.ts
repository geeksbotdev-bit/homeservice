import { jsPDF } from 'jspdf';
import { formatPKR } from './utils';
import { BUSINESS, legalLine } from './business';
import { LOGO_PNG } from './logoData';

export interface InvoiceData {
  invoiceNo: string;
  date: string;
  billedName: string;
  billedPhone: string;
  billedAddress: string;
  cleanerName: string;
  cleanerRating: number;
  cleanerJobs: number;
  items: { label: string; amount: number }[];
  subtotal: number;
  fee: number;
  total: number;
  methodLabel: string;
  txnId: string;
}

// Design-system colours as RGB tuples
const TEAL: [number, number, number] = [11, 124, 130];
const ORANGE: [number, number, number] = [243, 156, 18];
const INK: [number, number, number] = [17, 24, 39];
const GRAY: [number, number, number] = [107, 114, 128];
const LIGHT: [number, number, number] = [229, 231, 235];
const GREEN_BG: [number, number, number] = [209, 250, 229];
const GREEN_TX: [number, number, number] = [6, 95, 70];

/** Build a themed A4 invoice as a jsPDF document (vector, crisp at any zoom). */
export function buildInvoice(d: InvoiceData): jsPDF {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const W = doc.internal.pageSize.getWidth();
  const M = 18;
  const right = W - M;

  // ── Header ──
  // An invoice has to identify the entity being paid, so the brand mark is
  // followed by the registered name, NTN and address.
  // The real logo. If it ever fails to decode, fall back to the wordmark
  // alone rather than letting the whole receipt throw.
  let logoW = 0;
  try {
    doc.addImage(LOGO_PNG, 'PNG', M, 14, 20, 16, undefined, 'FAST');
    logoW = 24;
  } catch { logoW = 0; }

  doc.setTextColor(...INK);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(19);
  doc.text(BUSINESS.brand, M + logoW, 26);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...GRAY);
  const entity = [
    `${BUSINESS.legalName}  ·  Proprietor: ${BUSINESS.proprietor}`,
    `NTN ${BUSINESS.ntn}  (${BUSINESS.taxOffice})`,
    BUSINESS.address,
    `${BUSINESS.phone}  ·  ${BUSINESS.email}`,
  ];
  entity.forEach((line, i) => doc.text(line, M, 34 + i * 4));

  // PAID badge (top-right)
  doc.setFillColor(...GREEN_BG);
  doc.roundedRect(right - 26, 16, 26, 8, 4, 4, 'F');
  doc.setTextColor(...GREEN_TX);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('PAID', right - 13, 21.5, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...GRAY);
  doc.text(`Invoice ${d.invoiceNo}`, right, 29, { align: 'right' });
  doc.text(d.date, right, 34, { align: 'right' });
  doc.text(`Currency: ${BUSINESS.currency}`, right, 39, { align: 'right' });

  // Teal divider
  doc.setDrawColor(...TEAL);
  doc.setLineWidth(0.8);
  doc.line(M, 52, right, 52);

  // ── Billed To / Cleaner ──
  const colB = W / 2;
  label(doc, 'BILLED TO', M, 52);
  label(doc, 'CLEANER', colB, 52);

  doc.setTextColor(...INK);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(12);
  doc.text(d.billedName, M, 59);
  doc.text(d.cleanerName, colB, 59);

  doc.setFontSize(9);
  doc.setTextColor(...GRAY);
  doc.text(d.billedPhone, M, 64.5);
  doc.text(splitAddress(d.billedAddress), M, 69.5);
  doc.text(`* ${d.cleanerRating}  ·  ${d.cleanerJobs} jobs`, colB, 64.5);

  // ── Line items table ──
  let y = 86;
  doc.setFontSize(11);
  const line = (lbl: string, amount: string, opts?: { muted?: boolean; bold?: boolean }) => {
    doc.setFont('helvetica', opts?.bold ? 'bold' : 'normal');
    doc.setTextColor(...(opts?.muted ? GRAY : INK));
    doc.text(lbl, M, y);
    doc.text(amount, right, y, { align: 'right' });
    doc.setDrawColor(...LIGHT);
    doc.setLineWidth(0.2);
    doc.line(M, y + 3, right, y + 3);
    y += 10;
  };

  // An add-on is priced into the service total, so it carries no figure of its
  // own — a dash says that, where "PKR 0" would read as though it were free.
  d.items.forEach((it) => line(it.label, it.amount > 0 ? formatPKR(it.amount) : '—'));
  line('Subtotal', formatPKR(d.subtotal), { muted: true });
  line(`${BUSINESS.brand} service fee`, formatPKR(d.fee), { muted: true });

  // Total (teal rule above)
  y += 1;
  doc.setDrawColor(...TEAL);
  doc.setLineWidth(0.8);
  doc.line(M, y - 4, right, y - 4);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.setTextColor(...INK);
  doc.text('Total Paid', M, y + 3);
  doc.setTextColor(...TEAL);
  doc.text(formatPKR(d.total), right, y + 3, { align: 'right' });

  // ── Payment method / txn ──
  y += 20;
  label(doc, 'PAYMENT METHOD', M, y);
  label(doc, 'TRANSACTION ID', colB, y);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  doc.setTextColor(...INK);
  doc.text(d.methodLabel, M, y + 6);
  doc.text(d.txnId, colB, y + 6);

  // ── Footer ──
  doc.setDrawColor(...LIGHT);
  doc.setLineWidth(0.2);
  doc.line(M, 275, right, 275);
  doc.setFontSize(9);
  doc.setTextColor(...GRAY);
  doc.text('Thank you for choosing WithUrooj. This is a computer-generated invoice and needs no signature.', W / 2, 278, { align: 'center' });
  doc.text(`${legalLine()}  ·  ${BUSINESS.website}`, W / 2, 283, { align: 'center' });

  return doc;
}

function label(doc: jsPDF, text: string, x: number, y: number) {
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(156, 163, 175);
  doc.text(text, x, y);
}

function splitAddress(addr: string): string {
  return addr.length > 42 ? addr.slice(0, 42) : addr;
}
