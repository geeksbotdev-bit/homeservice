import { useEffect, useRef, useState } from 'react';
import { View, StyleSheet, Animated, Easing, Pressable } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import Svg, { Rect, Line } from 'react-native-svg';
import { Text, Button, Logo } from '../../src/components';
import { colors, radius, shadow } from '../../src/theme/theme';
import { dispatch, bookings as bookingsApi } from '../../src/services/api';
import { useBooking } from '../../src/store/booking';
import type { Cleaner, Booking } from '../../src/data/types';

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

  const pulse = useRef(new Animated.Value(0)).current;
  const spin = useRef(new Animated.Value(0)).current;
  const barW = useRef(new Animated.Value(12)).current;

  // The cleaner the request was actually dispatched to (from the live booking).
  const assigned = booking?.cleaner ?? null;
  const matched = !!booking?.accepted;

  useEffect(() => {
    Animated.loop(Animated.timing(pulse, { toValue: 1, duration: 2200, easing: Easing.out(Easing.ease), useNativeDriver: true })).start();
    Animated.loop(Animated.timing(spin, { toValue: 1, duration: 1000, easing: Easing.linear, useNativeDriver: true })).start();

    dispatch.nearby().then((raw) => {
      const list = raw.filter((c) => c.name && c.name.trim() && c.name !== 'New Cleaner');
      setCandidates(list.slice(0, 3));
    }).catch(() => {});

    // The request is broadcast to all cleaners. Poll the real booking and
    // proceed only when the FIRST cleaner accepts — never auto-match.
    // Guard: if the booking isn't paid yet (still pending), don't search —
    // send the customer back to pay first.
    const poll = () => {
      if (!id) return;
      bookingsApi.get(id).then((bk) => {
        if (bk.status === 'pending') { router.replace({ pathname: '/booking/payment', params: { id } }); return; }
        setBooking(bk);
      }).catch(() => {});
    };
    poll();
    const pollT = setInterval(poll, 2000);
    const prog = setInterval(() => setProgress((p) => (p >= 90 ? p : p + 2)), 300);
    const st = setInterval(() => setStatusIdx((s) => (s + 1) % STATUSES.length), 1600);
    return () => { clearInterval(pollT); clearInterval(prog); clearInterval(st); };
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
    if (!assigned) return candidates;
    const rest = candidates.filter((c) => c.id !== assigned.id);
    return [assigned, ...rest].slice(0, 3);
  })();

  // Payment already happened before the search — a match goes straight to tracking.
  function goToTracking() {
    if (matchedCleaner) setMatchedCleaner(matchedCleaner);
    router.replace(`/booking/${id ?? 'HS-2025-00125'}`);
  }

  return (
    <View style={styles.root}>
      {/* ── Map area ── */}
      <View style={styles.mapArea}>
        <Svg width="100%" height="100%" viewBox="0 0 393 440" preserveAspectRatio="xMidYMid slice">
          <Rect width="393" height="440" fill="#EDE8DF" />
          <Rect x="67" y="0" width="123" height="112" rx="3" fill="#C8DEB4" opacity="0.6" />
          <Rect x="270" y="344" width="123" height="96" rx="3" fill="#C8DEB4" opacity="0.5" />
          <Rect x="0" y="178" width="61" height="100" rx="3" fill="#B3DFE2" opacity="0.5" />
          {[56, 112, 172, 234, 284, 338, 396].map((y) => <Rect key={y} x="0" y={y} width="393" height="6" fill="#fff" />)}
          {[61, 190, 264, 328].map((x) => <Rect key={x} x={x} y="0" width="6" height="440" fill="#fff" />)}
        </Svg>

        {/* Radar */}
        <View style={styles.radar} pointerEvents="none">
          {[0, 1, 2].map((i) => {
            const scale = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.4, 6] });
            const opacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.5, 0] });
            return <Animated.View key={i} style={[styles.ring, { transform: [{ scale }], opacity }]} />;
          })}
          <View style={styles.radarCore}><View style={styles.radarDot} /></View>
        </View>

        {/* Cleaner pins */}
        {nearbyList.map((c, i) => {
          const pos = [{ top: 70, left: 50 }, { top: 48, left: 250 }, { top: 170, left: 300 }][i];
          const isMatched = matched && assigned?.id === c.id;
          return (
            <View key={c.id} style={[styles.pin, pos]} pointerEvents="none">
              <View style={[styles.pinAvatar, isMatched && { backgroundColor: colors.success }]}>
                <Text weight="extrabold" color={isMatched ? colors.white : colors.primary700} style={{ fontSize: 12 }}>{c.initials}</Text>
              </View>
              <View style={styles.pinLabel}><Text weight="bold" color={colors.primary} style={{ fontSize: 10 }}>{c.distanceKm} km</Text></View>
            </View>
          );
        })}

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
              <Text variant="h2" style={{ fontSize: 19, marginTop: 12 }}>Cleaner matched! 🎉</Text>
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
  radar: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center', marginBottom: 60 },
  ring: { position: 'absolute', width: 40, height: 40, borderRadius: 20, borderWidth: 2, borderColor: colors.primary },
  radarCore: { width: 22, height: 22, borderRadius: 11, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', ...shadow.button },
  radarDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.white },
  pin: { position: 'absolute', alignItems: 'center', gap: 3 },
  pinAvatar: { width: 38, height: 38, borderRadius: 19, backgroundColor: colors.primary200, borderWidth: 3, borderColor: colors.white, alignItems: 'center', justifyContent: 'center', ...shadow.card },
  pinLabel: { backgroundColor: colors.white, borderRadius: 7, paddingVertical: 2, paddingHorizontal: 7, ...shadow.soft },
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
