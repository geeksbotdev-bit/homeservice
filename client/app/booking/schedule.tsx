import { useEffect, useMemo, useState } from 'react';
import { View, StyleSheet, ScrollView, Pressable, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { Text, Button } from '../../src/components';
import { colors, radius } from '../../src/theme/theme';
import { formatPKR } from '../../src/utils';
import { useBooking } from '../../src/store/booking';
import { bookings as bookingsApi } from '../../src/services/api';

type Slot = { time: string; available: boolean };

const TIME_SLOTS = ['8:00 AM', '9:00 AM', '10:00 AM', '11:00 AM', '12:00 PM', '1:00 PM', '2:00 PM', '3:00 PM', '4:00 PM', '5:00 PM', '6:00 PM'];
const WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
const DAYNAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const MAX_MONTHS_AHEAD = 3;

const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const sameDay = (a: Date, b: Date) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
const monthIndex = (d: Date) => d.getFullYear() * 12 + d.getMonth();

export default function Schedule() {
  const router = useRouter();
  const { draft, selectedAddOns, total, setSchedule } = useBooking();

  const today = useMemo(() => startOfDay(new Date()), []);
  const [viewMonth, setViewMonth] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1));
  const [selected, setSelected] = useState<Date | null>(today);
  const [slotIdx, setSlotIdx] = useState<number | null>(null);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);

  const dateLabelFor = (d: Date) => `${DAYNAMES[d.getDay()]}, ${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;

  // Build the calendar grid for the viewed month (leading blanks + days).
  const cells = useMemo(() => {
    const y = viewMonth.getFullYear(), m = viewMonth.getMonth();
    const startPad = new Date(y, m, 1).getDay();
    const daysInMonth = new Date(y, m + 1, 0).getDate();
    const out: (Date | null)[] = [];
    for (let i = 0; i < startPad; i++) out.push(null);
    for (let d = 1; d <= daysInMonth; d++) out.push(new Date(y, m, d));
    while (out.length % 7 !== 0) out.push(null);
    return out;
  }, [viewMonth]);

  const minMonth = monthIndex(today);
  const canPrev = monthIndex(viewMonth) > minMonth;
  const canNext = monthIndex(viewMonth) < minMonth + MAX_MONTHS_AHEAD;

  function fetchSlots(d: Date) {
    setSlotIdx(null);
    setSlots([]);
    setSlotsLoading(true);
    bookingsApi.availability(dateLabelFor(d))
      .then((r) => setSlots(r.slots))
      .catch(() => setSlots(TIME_SLOTS.map((time) => ({ time, available: true }))))
      .finally(() => setSlotsLoading(false));
  }

  // Load slots for the initially-selected day (today) on mount.
  useEffect(() => { if (selected) fetchSlots(selected); }, []);

  function pickDay(d: Date) {
    setSelected(d);
    fetchSlots(d);
  }

  const availCount = slots.filter((s) => s.available).length;
  const ready = selected !== null && slotIdx !== null;

  function confirm() {
    if (!selected || slotIdx === null) return;
    setSchedule(dateLabelFor(selected), slots[slotIdx].time);
    router.push('/booking/confirm');
  }

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      {/* Nav */}
      <View style={styles.nav}>
        <Pressable onPress={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)'))} style={styles.circle}><Feather name="chevron-left" size={20} color={colors.textSecondary} /></Pressable>
        <Text variant="h2" style={{ fontSize: 16 }}>Schedule a Booking</Text>
        <Pressable onPress={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)'))} style={styles.circle}><Feather name="x" size={18} color={colors.textSecondary} /></Pressable>
      </View>

      {/* Service reminder strip */}
      {draft.service && (
        <View style={styles.strip}>
          <LinearGradient colors={draft.service.gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.stripIcon}>
            <MaterialCommunityIcons name={draft.service.icon as any} size={18} color={colors.white} />
          </LinearGradient>
          <Text style={{ flex: 1 }} numberOfLines={1}>
            <Text weight="bold" style={{ fontSize: 13 }}>{draft.service.name}</Text>
            {selectedAddOns[0] && <Text color={colors.textDisabled} style={{ fontSize: 13 }}>  · {selectedAddOns[0].name}</Text>}
          </Text>
          <Text weight="extrabold" color={colors.primary} style={{ fontSize: 15 }}>{formatPKR(total)}</Text>
        </View>
      )}

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Month nav */}
        <View style={styles.monthNav}>
          <Pressable disabled={!canPrev} onPress={() => setViewMonth((m) => new Date(m.getFullYear(), m.getMonth() - 1, 1))} style={[styles.circleSm, !canPrev && { opacity: 0.35 }]}>
            <Feather name="chevron-left" size={16} color={colors.textSecondary} />
          </Pressable>
          <Text variant="h2" style={{ fontSize: 17 }}>{MONTHS[viewMonth.getMonth()]} {viewMonth.getFullYear()}</Text>
          <Pressable disabled={!canNext} onPress={() => setViewMonth((m) => new Date(m.getFullYear(), m.getMonth() + 1, 1))} style={[styles.circleSm, !canNext && { opacity: 0.35 }]}>
            <Feather name="chevron-right" size={16} color={colors.textSecondary} />
          </Pressable>
        </View>

        {/* Weekday header */}
        <View style={styles.weekRow}>
          {WEEKDAYS.map((w) => (
            <View key={w} style={styles.cell}><Text variant="bodySm" weight="semibold" color={colors.textDisabled} style={{ fontSize: 11 }}>{w}</Text></View>
          ))}
        </View>

        {/* Calendar grid */}
        <View style={styles.calGrid}>
          {cells.map((d, i) => {
            if (!d) return <View key={`e${i}`} style={styles.cell} />;
            const past = d < today;
            const isToday = sameDay(d, today);
            const on = selected !== null && sameDay(d, selected);
            return (
              <View key={d.toISOString()} style={styles.cell}>
                <Pressable disabled={past} onPress={() => pickDay(d)} style={[styles.dayCircle, on && styles.dayOn, isToday && !on && styles.dayToday]}>
                  <Text weight={on || isToday ? 'bold' : 'medium'} color={on ? colors.white : past ? colors.textDisabled : isToday ? colors.primary : colors.textPrimary} style={{ fontSize: 14, opacity: past ? 0.4 : 1 }}>
                    {d.getDate()}
                  </Text>
                </Pressable>
              </View>
            );
          })}
        </View>

        <View style={styles.thickDivider} />

        {/* Times */}
        <View style={{ padding: 16, paddingTop: 18 }}>
          <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 4 }}>
            <Text variant="h2" style={{ fontSize: 16 }}>Available Times</Text>
            {selected && !slotsLoading && <Text variant="bodySm" weight="semibold" color={colors.textTertiary}>{availCount} slots open</Text>}
          </View>
          <Text variant="bodySm" color={colors.textTertiary} style={{ marginBottom: 16 }}>
            {selected ? dateLabelFor(selected) : 'Pick a date above'}
          </Text>

          {slotsLoading ? (
            <ActivityIndicator color={colors.primary} style={{ paddingVertical: 28 }} />
          ) : availCount === 0 ? (
            <View style={{ paddingVertical: 28, alignItems: 'center' }}>
              <Feather name="calendar" size={28} color={colors.border} />
              <Text color={colors.textDisabled} style={{ marginTop: 8 }}>No slots left on this day — try another date.</Text>
            </View>
          ) : (
            <View style={styles.grid}>
              {slots.map((slot, s) => {
                const avail = slot.available;
                const sel = slotIdx === s && avail;
                return (
                  <Pressable key={slot.time} disabled={!avail} onPress={() => setSlotIdx(s)} style={[styles.slot, sel ? styles.slotSel : avail ? styles.slotAvail : styles.slotOff]}>
                    {sel && <Feather name="check" size={12} color={colors.white} />}
                    <Text weight={sel ? 'bold' : 'semibold'} color={sel ? colors.white : avail ? colors.textPrimary : colors.textDisabled} style={{ fontSize: 13 }}>{slot.time}</Text>
                  </Pressable>
                );
              })}
            </View>
          )}

          {/* Legend */}
          <View style={styles.legend}>
            <Legend swatch={<View style={[styles.lg, { backgroundColor: colors.white, borderWidth: 1.5, borderColor: colors.border }]} />} label="Available" />
            <Legend swatch={<View style={[styles.lg, { backgroundColor: colors.primary }]} />} label="Selected" />
            <Legend swatch={<View style={[styles.lg, { backgroundColor: colors.surfaceAlt, borderWidth: 1.5, borderColor: colors.surface }]} />} label="Unavailable" />
          </View>

          {/* Duration note */}
          {draft.service && (
            <View style={styles.note}>
              <Feather name="clock" size={15} color={colors.warning} />
              <Text variant="bodySm" color={colors.warningText} style={{ flex: 1, fontSize: 12, lineHeight: 18 }}>
                {draft.service.name} takes <Text weight="bold">{draft.service.duration}</Text>. Please ensure someone is home for the full duration.
              </Text>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Footer */}
      <View style={styles.footer}>
        <View style={{ height: 18, marginBottom: 8 }}>
          {ready ? (
            <Text center variant="bodySm" weight="semibold" color={colors.primary}>
              ✓ {DAYNAMES[selected!.getDay()]}, {selected!.getDate()} {MONTHS[selected!.getMonth()]} · {slots[slotIdx!]?.time}
            </Text>
          ) : (
            <Text center variant="bodySm" color={colors.textDisabled}>Tap a time slot above to continue</Text>
          )}
        </View>
        <Button label={ready ? 'Confirm Schedule' : 'Select a time to continue'} icon="calendar" onPress={confirm} disabled={!ready} />
      </View>
    </SafeAreaView>
  );
}

function Legend({ swatch, label }: { swatch: React.ReactNode; label: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
      {swatch}
      <Text variant="bodySm" color={colors.textTertiary} style={{ fontSize: 11 }}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.white },
  nav: { height: 56, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  circle: { width: 38, height: 38, borderRadius: 19, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
  circleSm: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
  strip: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: colors.surfaceAlt, borderBottomWidth: 1, borderBottomColor: '#F0F0F0', paddingVertical: 11, paddingHorizontal: 16 },
  stripIcon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  monthNav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 16, paddingBottom: 10 },
  weekRow: { flexDirection: 'row', paddingHorizontal: 12, marginBottom: 4 },
  calGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 12, paddingBottom: 8 },
  cell: { width: `${100 / 7}%`, alignItems: 'center', justifyContent: 'center', paddingVertical: 3 },
  dayCircle: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  dayOn: { backgroundColor: colors.primary },
  dayToday: { borderWidth: 2, borderColor: colors.primary, backgroundColor: colors.primary50 },
  thickDivider: { height: 8, backgroundColor: colors.surface },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  slot: { width: '31.5%', height: 48, borderRadius: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5 },
  slotAvail: { backgroundColor: colors.white, borderWidth: 1.5, borderColor: colors.border },
  slotSel: { backgroundColor: colors.primary },
  slotOff: { backgroundColor: colors.surfaceAlt, borderWidth: 1.5, borderColor: colors.surface },
  legend: { flexDirection: 'row', gap: 16, marginTop: 16 },
  lg: { width: 14, height: 14, borderRadius: 4 },
  note: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: colors.warningBg, borderRadius: radius.lg, padding: 12, marginTop: 18 },
  footer: { padding: 20, paddingTop: 12, paddingBottom: 28, borderTopWidth: 1, borderTopColor: colors.surface },
});
