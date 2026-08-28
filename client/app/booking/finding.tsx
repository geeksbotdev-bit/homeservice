import { useEffect, useRef, useState } from 'react';
import { View, StyleSheet, Animated, Easing, Pressable } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { Text, Button, Logo } from '../../src/components';
import { colors, shadow } from '../../src/theme/theme';
import { dispatch, bookings as bookingsApi } from '../../src/services/api';
import { useBooking } from '../../src/store/booking';
import { NearbyMap, type NearbyPin } from '../../src/components/NearbyMap';
import type { Cleaner, Booking } from '../../src/data/types';

// Karachi city centre — fallback only if we can't read GPS or the booking pin.
const DEFAULT_LOC = { lat: 24.8607, lng: 67.0011 };

// Deterministic bearing (radians) for a cleaner so their dot doesn't jump
// between polls — derived from the cleaner id.
function bearing(id: string) {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return ((h % 360) * Math.PI) / 180;
}

// Place a cleaner `km` away from the user at a given bearing.
function offset(lat: number, lng: number, km: number, ang: number) {
  const dLat = (km / 111) * Math.cos(ang);
  const dLng = (km / (111 * Math.cos((lat * Math.PI) / 180))) * Math.sin(ang);
  return { lat: lat + dLat, lng: lng + dLng };
}

const STATUSES = [
  'Sending your request to cleaners nearby…',
  'Waiting for a cleaner to accept…',
  'Notifying available cleaners…',
];

export default function Finding() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { reset, setMatchedCleaner } = useBooking();
  const [candidates, setCandidates] = useState<Cleaner[]>([]);
  const [booking, setBooking] = useState<Booking | null>(null);
  const [statusIdx, setStatusIdx] = useState(0);
  const [progress, setProgress] = useState(12);

  const spin = useRef(new Animated.Value(0)).current;
  const barW = useRef(new Animated.Value(12)).current;

  // Customer's live location (map centre) + a drift tick so cleaner dots move.
  const [userLoc, setUserLoc] = useState(DEFAULT_LOC);
  const [tick, setTick] = useState(0);
  const locRef = useRef(userLoc);
  useEffect(() => { locRef.current = userLoc; }, [userLoc]);

  // The cleaner the request was actually dispatched to (from the live booking).
  const assigned = booking?.cleaner ?? null;
  const matched = !!booking?.accepted;

  // 1) Lock the map onto the customer's real position — booking pin first,
  //    then live GPS, then a city-centre fallback.
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
          if (alive) setUserLoc({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        }
      } catch { /* keep fallback */ }
    })();
    return () => { alive = false; };
  }, []);

  useEffect(() => {
    if (booking?.custLat != null && booking?.custLng != null) {
      setUserLoc({ lat: booking.custLat, lng: booking.custLng });
    }
  }, [booking?.custLat, booking?.custLng]);

  useEffect(() => {
    Animated.loop(Animated.timing(spin, { toValue: 1, duration: 1000, easing: Easing.linear, useNativeDriver: true })).start();

    // 2) Live nearby cleaners straight from the API (with our live position so
    //    the server returns real distances + coordinates) — refreshed every 3s.
    const loadNearby = () => {
      dispatch.nearby(locRef.current.lat, locRef.current.lng).then((raw) => {
        const list = raw.filter((c) => c.name && c.name.trim() && c.name !== 'New Cleaner');
        setCandidates(list.slice(0, 6));
      }).catch(() => {});
    };
    loadNearby();

    // The request is broadcast to all cleaners. Poll the real booking and
    // proceed only when the FIRST cleaner accepts — never auto-match.
    // Guard: if the booking isn't paid yet (still pending), don't search —
    // send the customer back to pay first.
    const poll = () => {
      if (!id) return;
      bookingsApi.get(id).then((bk) => {
        const paid = bk.payment?.status === 'paid';
        if (bk.status === 'pending' || !paid) {
          router.replace({ pathname: '/booking/payment', params: { id } });
          return;
        }
        setBooking(bk);
      }).catch(() => {});
    };
    poll();
    const pollT = setInterval(poll, 2000);
    const nearT = setInterval(loadNearby, 3000);
    const drift = setInterval(() => setTick((t) => t + 1), 2400);  // makes dots glide
    const prog = setInterval(() => setProgress((p) => (p >= 90 ? p : p + 2)), 300);
    const st = setInterval(() => setStatusIdx((s) => (s + 1) % STATUSES.length), 1600);
    return () => { clearInterval(pollT); clearInterval(nearT); clearInterval(drift); clearInterval(prog); clearInterval(st); };
  }, [id]);

  // On accept: snap progress to full and persist the matched cleaner.
  useEffect(() => {
    if (matched) { setProgress(100); if (assigned) setMatchedCleaner(assigned); }
  }, [matched]);

  useEffect(() => {
    Animated.timing(barW, { toValue: progress, duration: 300, useNativeDriver: false }).start();
  }, [progress]);

  const rotate = spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
  const matchedCleaner = assigned;

  // Show the assigned cleaner first in the "nearby" strip.
  const nearbyList = (() => {
    if (!assigned) return candidates.slice(0, 3);
    const rest = candidates.filter((c) => c.id !== assigned.id);
    return [assigned, ...rest].slice(0, 3);
  })();

  // Live map pins from the API. Cleaners that reported a real GPS fix are
  // plotted EXACTLY where they are; the rest sit near you by their distance
  // (nudged each tick so they feel alive, like idling drivers).
  const pins: NearbyPin[] = candidates.map((c) => {
    const isMatched = matched && assigned?.id === c.id;
    // Real position from the API (live GPS or the cleaner's stored location).
    if (c.lat != null && c.lng != null) {
      return { id: c.id, lat: c.lat, lng: c.lng, initials: c.initials, matched: isMatched };
    }
    // Fallback only if the server had no coordinates.
    const ang = bearing(c.id) + tick * 0.05;
    const { lat, lng } = offset(userLoc.lat, userLoc.lng, Math.max(0.4, c.distanceKm ?? 1), ang);
    return { id: c.id, lat, lng, initials: c.initials, matched: isMatched };
  });

  // Payment already happened before the search — a match goes straight to tracking.
  function goToTracking() {
    if (matchedCleaner) setMatchedCleaner(matchedCleaner);
    router.replace(`/booking/${id ?? 'HS-2025-00125'}`);
  }

  return (
    <View style={styles.root}>
      {/* ── Map area (real, live) ── */}
      <View style={styles.mapArea}>
        <NearbyMap latitude={userLoc.lat} longitude={userLoc.lng} cleaners={pins} />

        {/* "N cleaners nearby" chip */}
        <View style={styles.countChip} pointerEvents="none">
          <View style={styles.countDot} />
          <Text weight="bold" color={colors.primary700} style={{ fontSize: 12 }}>
            {candidates.length > 0 ? `${candidates.length} cleaner${candidates.length > 1 ? 's' : ''} nearby` : 'Looking around you…'}
          </Text>
        </View>

        {/* Transparent nav */}
        <SafeAreaView edges={['top']} style={styles.nav}>
          <Pressable onPress={() => { reset(); router.replace('/(tabs)'); }} style={styles.navBtn}><Feather name="chevron-left" size={18} color={colors.textSecondary} /></Pressable>
          <View style={styles.navPill}><Logo size={20} /></View>
          <View style={{ width: 36 }} />
        </SafeAreaView>
      </View>

      {/* ── Bottom sheet ── */}
      <View style={styles.sheet}>
        <View style={styles.handle} />

        {matched && matchedCleaner ? (
          <>
            <View style={{ alignItems: 'center', marginBottom: 8 }}>
              <View style={styles.matchAvatar}><Text weight="extrabold" color={colors.white} style={{ fontSize: 22 }}>{matchedCleaner.initials}</Text></View>
              <Text variant="h2" style={{ fontSize: 19, marginTop: 12 }}>Cleaner matched!</Text>
              <Text weight="bold" style={{ fontSize: 16, marginTop: 8 }}>{matchedCleaner.name}</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 4 }}>
                <Feather name="star" size={12} color={colors.accent} />
                <Text weight="semibold" color={colors.textSecondary}>{matchedCleaner.rating}</Text>
                <Text color={colors.textDisabled}>· {matchedCleaner.jobs} jobs · {matchedCleaner.distanceKm} km away</Text>
              </View>
              {matchedCleaner.bio && <Text variant="bodySm" center color={colors.textTertiary} style={{ marginTop: 10 }}>{matchedCleaner.bio}</Text>}
            </View>
            <Button label="Track your cleaner" iconRight="arrow-right" onPress={goToTracking} style={{ marginTop: 6 }} />
            <Text center variant="bodySm" color={colors.textDisabled} style={{ marginTop: 10 }}>
              Payment complete · Your cleaner is on the way
            </Text>
          </>
        ) : (
          <>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 14 }}>
              <Animated.View style={[styles.spinner, { transform: [{ rotate }] }]} />
              <View>
                <Text variant="caption" color={colors.textDisabled} style={{ fontSize: 12, letterSpacing: 0.5 }}>LIVE DISPATCH</Text>
                <Text weight="extrabold" style={{ fontSize: 16 }}>Sending to nearby cleaners…</Text>
              </View>
            </View>

            <View style={styles.statusBox}>
              <View style={styles.statusDot} />
              <Text weight="semibold" color={colors.textSecondary} style={{ flex: 1, fontSize: 14 }}>{STATUSES[statusIdx]}</Text>
            </View>

            <View style={{ marginBottom: 18 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 7 }}>
                <Text variant="bodySm" weight="semibold" color={colors.textTertiary}>Matching progress</Text>
                <Text variant="bodySm" weight="bold" color={colors.primary}>{progress}%</Text>
              </View>
              <View style={styles.track}>
                <Animated.View style={[styles.fill, { width: barW.interpolate({ inputRange: [0, 100], outputRange: ['0%', '100%'] }) }]} />
              </View>
            </View>

            <Text variant="caption" color={colors.textDisabled} style={{ fontSize: 12, letterSpacing: 0.5, marginBottom: 10 }}>CLEANERS NEARBY</Text>
            <View style={{ flexDirection: 'row', gap: 10, marginBottom: 18 }}>
              {nearbyList.map((c) => {
                const isAssigned = assigned?.id === c.id;
                const found = isAssigned && matched;
                const tag = found ? 'MATCHED' : 'Notified';
                return (
                  <View key={c.id} style={styles.candidate}>
                    <View style={[styles.candAvatar, found && { backgroundColor: colors.success }]}>
                      <Text weight="extrabold" color={found ? colors.white : colors.primary700} style={{ fontSize: 14 }}>{c.initials}</Text>
                    </View>
                    <Text weight="bold" style={{ fontSize: 12 }}>{c.name.split(' ')[0]}</Text>
                    <Text variant="bodySm" color={colors.textDisabled} style={{ fontSize: 11 }}>{c.distanceKm} km</Text>
                    <View style={[styles.candTag, found ? { backgroundColor: colors.successBg } : isAssigned ? { backgroundColor: colors.primary50 } : { backgroundColor: colors.surface }]}>
                      <Text weight="bold" color={found ? colors.successText : isAssigned ? colors.primary : colors.textTertiary} style={{ fontSize: 10 }}>{tag}</Text>
                    </View>
                  </View>
                );
              })}
            </View>

            <Pressable onPress={() => { reset(); router.replace('/(tabs)'); }} style={{ alignSelf: 'center', paddingVertical: 4 }}>
              <Text weight="semibold" color={colors.error}>Cancel booking</Text>
            </Pressable>
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#EDE8DF' },
  mapArea: { flex: 1, position: 'relative', overflow: 'hidden' },
  countChip: { position: 'absolute', bottom: 40, alignSelf: 'center', flexDirection: 'row', alignItems: 'center', gap: 7, backgroundColor: colors.white, borderRadius: 22, paddingHorizontal: 14, height: 38, ...shadow.card },
  countDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.success },
  nav: { position: 'absolute', top: 0, left: 0, right: 0, height: 60 },
  navBtn: { position: 'absolute', top: 8, left: 16, width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.9)', alignItems: 'center', justifyContent: 'center', ...shadow.soft },
  navPill: { position: 'absolute', top: 8, alignSelf: 'center', backgroundColor: 'rgba(255,255,255,0.9)', borderRadius: 20, paddingHorizontal: 12, height: 36, justifyContent: 'center', ...shadow.soft },
  sheet: { backgroundColor: colors.white, borderTopLeftRadius: 30, borderTopRightRadius: 30, paddingHorizontal: 24, paddingTop: 14, paddingBottom: 28, marginTop: -24, ...shadow.card },
  handle: { width: 40, height: 4, borderRadius: 2, backgroundColor: colors.border, alignSelf: 'center', marginBottom: 16 },
  spinner: { width: 46, height: 46, borderRadius: 23, borderWidth: 3, borderColor: colors.primary50, borderTopColor: colors.primary },
  statusBox: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: colors.surfaceAlt, borderRadius: 14, padding: 14, marginBottom: 16 },
  statusDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.primary },
  track: { height: 8, backgroundColor: colors.surface, borderRadius: 4, overflow: 'hidden' },
  fill: { height: '100%', backgroundColor: colors.primary, borderRadius: 4 },
  candidate: { flex: 1, backgroundColor: colors.surfaceAlt, borderRadius: 14, paddingVertical: 12, alignItems: 'center', gap: 5 },
  candAvatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.primary200, alignItems: 'center', justifyContent: 'center' },
  candTag: { borderRadius: 6, paddingVertical: 2, paddingHorizontal: 8 },
  matchAvatar: { width: 64, height: 64, borderRadius: 32, backgroundColor: colors.success, alignItems: 'center', justifyContent: 'center', ...shadow.card },
});
