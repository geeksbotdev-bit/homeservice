import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import type { Service, AddOn, Cleaner } from '../data/types';
import { FEE_PCT } from '../services/api';

const DRAFT_KEY = 'hs_booking_draft';
// Persist the in-progress booking so a web refresh / deep-link doesn't blank
// the flow (native has no full reload, so this is effectively web-only).
function loadDraft(): Draft | null {
  try {
    if (typeof localStorage === 'undefined') return null;
    const raw = localStorage.getItem(DRAFT_KEY);
    return raw ? (JSON.parse(raw) as Draft) : null;
  } catch { return null; }
}
function saveDraft(d: Draft) {
  try { if (typeof localStorage !== 'undefined') localStorage.setItem(DRAFT_KEY, JSON.stringify(d)); } catch {}
}

interface Draft {
  service?: Service;
  quantity: number;
  addOnIds: string[];
  mode: 'now' | 'later';
  dateLabel?: string;
  timeLabel?: string;
  address: string;
  preferredCleaner?: Cleaner;   // set when re-booking a past cleaner
  matchedCleaner?: Cleaner;     // the real cleaner matched by dispatch / chosen
}

interface BookingCtx {
  draft: Draft;
  startBooking: (service: Service, mode: 'now' | 'later', preferredCleaner?: Cleaner) => void;
  setQuantity: (n: number) => void;
  toggleAddOn: (id: string) => void;
  setSchedule: (dateLabel: string, timeLabel: string) => void;
  setMode: (mode: 'now' | 'later') => void;
  setMatchedCleaner: (c: Cleaner) => void;
  selectedAddOns: AddOn[];
  subtotal: number;
  fee: number;
  total: number;
  reset: () => void;
}

const initial: Draft = { quantity: 1, addOnIds: [], mode: 'now', address: 'House 42, Street 7, Block D, DHA Phase 5, Lahore' };

const Ctx = createContext<BookingCtx | null>(null);

export function BookingProvider({ children }: { children: React.ReactNode }) {
  const [draft, setDraft] = useState<Draft>(() => loadDraft() ?? initial);
  useEffect(() => { saveDraft(draft); }, [draft]);

  const value = useMemo<BookingCtx>(() => {
    const service = draft.service;
    const selectedAddOns = service ? service.addOns.filter((a) => draft.addOnIds.includes(a.id)) : [];
    const extras = selectedAddOns.reduce((s, a) => s + a.price, 0);
    const subtotal = service ? (service.basePrice + extras) * draft.quantity : 0;
    const fee = Math.round(subtotal * FEE_PCT);
    const total = subtotal + fee;

    return {
      draft,
      startBooking: (service, mode, preferredCleaner) =>
        setDraft({ ...initial, service, mode, preferredCleaner, addOnIds: service.addOns.filter((a) => a.id === 'window' || a.id === 'fridge' || a.id === 'windows').slice(0, 1).map((a) => a.id) }),
      setQuantity: (n) => setDraft((d) => ({ ...d, quantity: Math.max(1, Math.min(5, n)) })),
      toggleAddOn: (id) =>
        setDraft((d) => ({ ...d, addOnIds: d.addOnIds.includes(id) ? d.addOnIds.filter((x) => x !== id) : [...d.addOnIds, id] })),
      setSchedule: (dateLabel, timeLabel) => setDraft((d) => ({ ...d, dateLabel, timeLabel })),
      setMode: (mode) => setDraft((d) => ({ ...d, mode })),
      setMatchedCleaner: (c) => setDraft((d) => ({ ...d, matchedCleaner: c })),
      selectedAddOns,
      subtotal,
      fee,
      total,
      reset: () => setDraft(initial),
    };
  }, [draft]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useBooking() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useBooking must be used within BookingProvider');
  return ctx;
}
