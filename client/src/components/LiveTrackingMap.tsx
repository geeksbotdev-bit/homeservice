import { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, Easing } from 'react-native';
import Svg, { Rect, Circle, Polyline } from 'react-native-svg';
import { Feather } from '@expo/vector-icons';
import { Text } from './Text';
import { colors, radius, shadow } from '../theme/theme';

const W = 393, H = 240;
// Route the cleaner drives from (top-left) to the client's home (centre-right).
const ROUTE: [number, number][] = [[46, 34], [46, 132], [210, 132], [210, 196]];
const HOME = ROUTE[ROUTE.length - 1];

// Cumulative fraction of the total route length at each vertex → lets us map a
// single 0..1 progress value to a point that follows the polyline exactly.
const SEGS = ROUTE.slice(1).map((p, i) => Math.hypot(p[0] - ROUTE[i][0], p[1] - ROUTE[i][1]));
const TOTAL = SEGS.reduce((s, l) => s + l, 0);
const FRACTIONS = ROUTE.map((_, i) => (i === 0 ? 0 : SEGS.slice(0, i).reduce((s, l) => s + l, 0) / TOTAL));
const XS_PCT = ROUTE.map(([x]) => `${(x / W) * 100}%`);
const YS_PX = ROUTE.map(([, y]) => y);

const HOME_LEFT = `${(HOME[0] / W) * 100}%` as `${number}%`;

interface Props {
  progress: number;          // 0..1 how far the cleaner has travelled
  etaText: string;           // "8 min", "Arrived", …
  atHome: boolean;           // cleaner reached / working / done
  cleanerName: string;
  cleanerInitials: string;
  rating: number;
}

/** Animated live-tracking map — marker glides along the route (Yango-style). */
export function LiveTrackingMap({ progress, etaText, atHome, cleanerName, cleanerInitials, rating }: Props) {
  // Eased progress so the marker glides between updates instead of jumping.
  const t = useRef(new Animated.Value(atHome ? 1 : progress)).current;
  const pulse = useRef(new Animated.Value(0)).current;
  const homePulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(t, {
      toValue: atHome ? 1 : Math.max(0, Math.min(1, progress)),
      duration: 900,
      easing: Easing.inOut(Easing.ease),
      useNativeDriver: false,
    }).start();
  }, [progress, atHome]);

  useEffect(() => {
    Animated.loop(Animated.timing(pulse, { toValue: 1, duration: 1600, easing: Easing.out(Easing.ease), useNativeDriver: true })).start();
    Animated.loop(Animated.timing(homePulse, { toValue: 1, duration: 1800, easing: Easing.out(Easing.ease), useNativeDriver: true })).start();
  }, []);

  const left = t.interpolate({ inputRange: FRACTIONS, outputRange: XS_PCT });
  const top = t.interpolate({ inputRange: FRACTIONS, outputRange: YS_PX });

  const ringScale = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.6, 2.4] });
  const ringOpacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.45, 0] });
  const homeScale = homePulse.interpolate({ inputRange: [0, 1], outputRange: [0.5, 2.2] });
  const homeOpacity = homePulse.interpolate({ inputRange: [0, 1], outputRange: [0.4, 0] });

  return (
    <View style={styles.wrap}>
      <Svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid slice">
        <Rect width={W} height={H} fill="#EDE8DF" />
        {/* green + water blocks */}
        <Rect x="60" y="0" width="120" height="70" rx="3" fill="#C8DEB4" opacity="0.6" />
        <Rect x="270" y="150" width="123" height="90" rx="3" fill="#C8DEB4" opacity="0.5" />
        <Rect x="0" y="150" width="55" height="90" rx="3" fill="#B3DFE2" opacity="0.5" />
        {/* streets */}
        {[40, 90, 132, 180, 210].map((y) => <Rect key={`h${y}`} x="0" y={y} width={W} height="6" fill="#fff" />)}
        {[46, 130, 210, 300].map((x) => <Rect key={`v${x}`} x={x} y="0" width="6" height={H} fill="#fff" />)}
        {/* route casing + dashed line */}
        <Polyline points={ROUTE.map((p) => p.join(',')).join(' ')} fill="none" stroke="rgba(243,156,18,0.25)" strokeWidth="9" strokeLinecap="round" strokeLinejoin="round" />
        <Polyline points={ROUTE.map((p) => p.join(',')).join(' ')} fill="none" stroke={colors.accent} strokeWidth="4" strokeDasharray="10,7" strokeLinecap="round" strokeLinejoin="round" />
      </Svg>

      {/* Destination pin (pulsing) */}
      <View style={[styles.point, { left: HOME_LEFT, top: HOME[1] }]} pointerEvents="none">
        <Animated.View style={[styles.homeRing, { opacity: homeOpacity, transform: [{ scale: homeScale }] }]} />
        <View style={styles.homeDot}><Feather name="home" size={11} color={colors.white} /></View>
      </View>

      {/* Cleaner marker — glides along the route */}
      <Animated.View style={[styles.point, { left, top }]} pointerEvents="none">
        <Animated.View style={[styles.liveRing, { opacity: ringOpacity, transform: [{ scale: ringScale }] }]} />
        <View style={styles.markerPill}>
          <View style={styles.avatar}><Text weight="bold" color={colors.primary700} style={{ fontSize: 10 }}>{cleanerInitials}</Text></View>
          <Text weight="bold" style={{ fontSize: 11 }}>{cleanerName.split(' ')[0]}</Text>
        </View>
        <View style={styles.markerCore}>
          <Feather name={atHome ? 'check' : 'navigation'} size={15} color={colors.white} />
        </View>
      </Animated.View>

      {/* ETA overlay */}
      <View style={styles.eta}>
        <Text variant="caption" color={colors.textDisabled} style={{ letterSpacing: 1, fontSize: 9 }}>{atHome ? 'STATUS' : 'ESTIMATED ARRIVAL'}</Text>
        <Text weight="extrabold" style={{ fontSize: 20, letterSpacing: -0.5 }}>{etaText}</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <Feather name="star" size={11} color={colors.accent} />
          <Text variant="bodySm" color={colors.textTertiary}>{cleanerName} · {rating}</Text>
        </View>
      </View>

      {/* Live pill */}
      <View style={styles.live}>
        <View style={styles.liveDot} />
        <Text weight="bold" color={colors.white} style={{ fontSize: 10, letterSpacing: 0.5 }}>LIVE</Text>
      </View>
    </View>
  );
}

const CORE = 34;
const styles = StyleSheet.create({
  wrap: { height: H, backgroundColor: '#EDE8DF', position: 'relative', overflow: 'hidden' },
  // A zero-size anchor at the map point; children are centered on it.
  point: { position: 'absolute', width: 0, height: 0, alignItems: 'center', justifyContent: 'center' },
  liveRing: { position: 'absolute', width: 40, height: 40, borderRadius: 20, backgroundColor: colors.accent },
  markerCore: { width: CORE, height: CORE, borderRadius: CORE / 2, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: colors.white, ...shadow.card },
  markerPill: { position: 'absolute', bottom: 24, flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: colors.white, borderRadius: 20, paddingVertical: 3, paddingHorizontal: 7, ...shadow.soft },
  avatar: { width: 18, height: 18, borderRadius: 9, backgroundColor: colors.primary200, alignItems: 'center', justifyContent: 'center' },
  homeRing: { position: 'absolute', width: 34, height: 34, borderRadius: 17, backgroundColor: colors.primary },
  homeDot: { width: 26, height: 26, borderRadius: 13, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: colors.white, ...shadow.card },
  eta: { position: 'absolute', top: 14, left: 14, backgroundColor: colors.white, borderRadius: radius.lg, padding: 12, minWidth: 130, ...shadow.card },
  live: { position: 'absolute', top: 14, right: 14, flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: colors.error, borderRadius: 20, paddingVertical: 5, paddingHorizontal: 10 },
  liveDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#fff' },
});

export default LiveTrackingMap;
