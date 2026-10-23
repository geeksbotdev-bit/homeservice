import { useCallback, useEffect, useRef, useState } from 'react';
import { View, StyleSheet, ScrollView, Pressable, ActivityIndicator, Platform } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { Text, LiveMap } from '../../src/components';
import { colors, radius, shadow } from '../../src/theme/theme';
import { pro } from '../../src/services/api';
import { API_URL } from '../../src/services/client';
import { openNavigation } from '../../src/services/navigate';
import { toastT } from '../../src/i18n';
import type { Booking } from '../../src/data/types';

interface Step {
  type: string; modifier: string | null; road: string;
  distance: number; duration: number; lat: number; lng: number;
}

/**
 * In-app navigation to a job.
 *
 * This is a route view, not a replacement for Google Maps: it shows the road
 * route, the live distance and ETA, and the list of turns, with the current
 * step highlighted as the cleaner moves. Voice guidance and live re-routing
 * belong to the phone's own maps app, which is one tap away.
 */
export default function Navigate() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [b, setB] = useState<Booking | null>(null);
  const [me, setMe] = useState<{ lat: number; lng: number } | null>(null);
  const [steps, setSteps] = useState<Step[]>([]);
  const [eta, setEta] = useState<{ eta: number; distance: number } | null>(null);
  const [denied, setDenied] = useState(false);
  const watcher = useRef<Location.LocationSubscription | null>(null);

  useEffect(() => { if (id) pro.job(String(id)).then(setB).catch(() => {}); }, [id]);

  // Follow the cleaner. A navigation view that does not move is useless, so
  // this watches continuously rather than polling a one-off fix.
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') { setDenied(true); return; }
        watcher.current = await Location.watchPositionAsync(
          { accuracy: Location.Accuracy.High, distanceInterval: 15, timeInterval: 5000 },
          (pos) => {
            if (!alive) return;
            const next = { lat: pos.coords.latitude, lng: pos.coords.longitude };
            setMe(next);
            pro.pushLocation(next.lat, next.lng).catch(() => {});
          },
        );
      } catch { setDenied(true); }
    })();
    return () => { alive = false; watcher.current?.remove(); };
  }, []);

  const dest = b?.custLat != null && b?.custLng != null ? { lat: b.custLat, lng: b.custLng } : null;

  // Directions for the current leg. Refetched as the cleaner moves so the
  // steps stay ahead of them rather than describing a route already driven.
  const loadSteps = useCallback(async () => {
    if (!me || !dest) return;
    try {
      const r = await fetch(`${API_URL}/route?from=${me.lat},${me.lng}&to=${dest.lat},${dest.lng}`);
      const j = await r.json();
      if (Array.isArray(j?.steps)) setSteps(j.steps);
      if (typeof j?.duration === 'number') setEta({ eta: j.duration, distance: j.distance ?? 0 });
    } catch { /* keep the last directions rather than blanking them */ }
  }, [me?.lat, me?.lng, dest?.lat, dest?.lng]);

  useEffect(() => { loadSteps(); }, [loadSteps]);

  const mins = eta ? Math.max(1, Math.round(eta.eta / 60)) : null;
  const km = eta ? (eta.distance / 1000).toFixed(1) : null;
  const next = steps[0];

  if (!b) {
    return (
      <SafeAreaView style={styles.root} edges={['top']}>
        <ActivityIndicator color={colors.primary} style={{ paddingVertical: 50 }} />
      </SafeAreaView>
    );
  }

  if (!dest) {
    return (
      <SafeAreaView style={styles.root} edges={['top']}>
        <Header onBack={() => router.back()} title="Navigate" />
        <View style={styles.empty}>
          <Feather name="map-pin" size={26} color={colors.textDisabled} />
          <Text weight="semibold" style={{ marginTop: 10 }}>No map pin on this job</Text>
          <Text variant="bodySm" color={colors.textTertiary} center style={{ marginTop: 4, paddingHorizontal: 30, lineHeight: 18 }}>
            Use the address below to find the customer.
          </Text>
          <Text variant="bodySm" color={colors.textSecondary} center style={{ marginTop: 12, paddingHorizontal: 24 }}>{b.address}</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <Header onBack={() => router.back()} title="Navigate" />

      <View style={{ height: 300 }}>
        <LiveMap pro={me} cust={dest} height={300} etaText={mins ? `${mins} min` : 'Finding route…'} cleanerName="Customer" />
      </View>

      {/* The next manoeuvre, large enough to read at a glance */}
      <View style={styles.nextCard}>
        <View style={styles.turnIcon}>
          <Feather name={iconFor(next)} size={22} color={colors.white} />
        </View>
        <View style={{ flex: 1 }}>
          <Text weight="extrabold" style={{ fontSize: 16 }} numberOfLines={1}>{phrase(next)}</Text>
          <Text variant="bodySm" color={colors.textTertiary} numberOfLines={1}>
            {next ? `${fmtDist(next.distance)}${next.road ? ` · ${next.road}` : ''}` : b.address}
          </Text>
        </View>
        {mins !== null && (
          <View style={{ alignItems: 'flex-end' }}>
            <Text weight="extrabold" color={colors.primary} style={{ fontSize: 17 }}>{mins} min</Text>
            <Text variant="bodySm" color={colors.textTertiary}>{km} km</Text>
          </View>
        )}
      </View>

      {denied && (
        <View style={styles.warn}>
          <Feather name="alert-circle" size={14} color={colors.error} />
          <Text variant="bodySm" color={colors.error} style={{ flex: 1 }}>
            Location is off, so the route cannot follow you. Turn it on in settings.
          </Text>
        </View>
      )}

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 24, gap: 2 }}>
        <Text variant="caption" color={colors.textTertiary} style={{ letterSpacing: 0.8, marginBottom: 8 }}>DIRECTIONS</Text>
        {steps.length === 0 ? (
          <Text variant="bodySm" color={colors.textTertiary}>Working out the route…</Text>
        ) : (
          steps.map((st, i) => (
            <View key={i} style={[styles.step, i === 0 && styles.stepNow]}>
              <Feather name={iconFor(st)} size={15} color={i === 0 ? colors.primary : colors.textTertiary} />
              <Text style={{ flex: 1, fontSize: 13.5 }} numberOfLines={2}>{phrase(st)}</Text>
              <Text variant="bodySm" color={colors.textDisabled} style={{ fontSize: 11 }}>{fmtDist(st.distance)}</Text>
            </View>
          ))
        )}
      </ScrollView>

      <View style={styles.footer}>
        <Pressable
          style={styles.ghostBtn}
          onPress={() => {
            if (Platform.OS === 'web') { toastT('Open on your phone', 'Turn-by-turn voice guidance needs the mobile app.'); return; }
            openNavigation(dest, b.address);
          }}
        >
          <Feather name="external-link" size={15} color={colors.primary} />
          <Text weight="bold" color={colors.primary} style={{ fontSize: 13 }}>Voice guidance in Maps</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

function Header({ onBack, title }: { onBack: () => void; title: string }) {
  return (
    <View style={styles.header}>
      <Pressable onPress={onBack} hitSlop={10} style={styles.back}>
        <Feather name="chevron-left" size={20} color={colors.textSecondary} />
      </Pressable>
      <Text variant="h2" style={{ fontSize: 16 }}>{title}</Text>
      <View style={{ width: 36 }} />
    </View>
  );
}

/** OSRM manoeuvre -> an icon a driver can read at speed. */
function iconFor(st?: Step): any {
  if (!st) return 'navigation';
  const m = st.modifier ?? '';
  if (st.type === 'arrive') return 'flag';
  if (m.includes('left')) return 'corner-up-left';
  if (m.includes('right')) return 'corner-up-right';
  if (m === 'uturn') return 'rotate-ccw';
  return 'arrow-up';
}

/** OSRM manoeuvre -> a plain instruction. */
function phrase(st?: Step): string {
  if (!st) return 'Head to the address';
  const road = st.road ? ` onto ${st.road}` : '';
  if (st.type === 'arrive') return 'Arrive at the customer';
  if (st.type === 'depart') return st.road ? `Start on ${st.road}` : 'Start driving';
  if (st.type === 'roundabout' || st.type === 'rotary') return `Take the roundabout${road}`;
  const m = st.modifier ?? '';
  if (m === 'uturn') return 'Make a U-turn';
  if (m === 'sharp left' || m === 'sharp right') return `Sharp ${m.split(' ')[1]}${road}`;
  if (m === 'slight left' || m === 'slight right') return `Slight ${m.split(' ')[1]}${road}`;
  if (m === 'left' || m === 'right') return `Turn ${m}${road}`;
  return st.road ? `Continue on ${st.road}` : 'Continue straight';
}

const fmtDist = (m: number) => (m >= 1000 ? `${(m / 1000).toFixed(1)} km` : `${Math.round(m)} m`);

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surface },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12, height: 56, backgroundColor: colors.white },
  back: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
  nextCard: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.white, padding: 14, ...shadow.card },
  turnIcon: { width: 44, height: 44, borderRadius: radius.md, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  step: { flexDirection: 'row', alignItems: 'center', gap: 11, backgroundColor: colors.white, borderRadius: radius.md, paddingHorizontal: 12, paddingVertical: 11, marginBottom: 6 },
  stepNow: { backgroundColor: colors.primary50, borderWidth: 1.5, borderColor: colors.primary },
  warn: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.errorBg, paddingHorizontal: 14, paddingVertical: 10 },
  footer: { paddingHorizontal: 16, paddingVertical: 10, borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: colors.white },
  ghostBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, height: 46, borderRadius: radius.lg, borderWidth: 1.5, borderColor: colors.primary },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
