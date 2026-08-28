import { useRef, useState } from 'react';
import { View, StyleSheet, Pressable, ScrollView, NativeSyntheticEvent, NativeScrollEvent } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Svg, { Circle, Rect, Path, Line, Ellipse } from 'react-native-svg';
import { Text, Button, Logo } from '../../src/components';
import { colors, spacing } from '../../src/theme/theme';

const SLIDES = [
  {
    title: 'Trusted home cleaning,\non demand.',
    subtitle: 'Background-verified, trained professionals — booked in minutes, right from your phone.',
    render: () => <HouseHero />,
  },
  {
    title: 'Verified pros you\ncan trust.',
    subtitle: 'Every cleaner is background-checked, trained, and rated by customers across Pakistan.',
    render: () => <IconHero icon="shield-check" />,
  },
  {
    title: 'Book now, or\nschedule later.',
    subtitle: 'Track your cleaner live on the map and pay securely in PKR after the job is done.',
    render: () => <IconHero icon="map-marker-radius" />,
  },
];

export default function Welcome() {
  const router = useRouter();
  const [active, setActive] = useState(0);
  const [w, setW] = useState(0);
  const scroller = useRef<ScrollView>(null);

  function onScroll(e: NativeSyntheticEvent<NativeScrollEvent>) {
    if (!w) return;
    const idx = Math.round(e.nativeEvent.contentOffset.x / w);
    if (idx !== active) setActive(idx);
  }

  function goTo(i: number) {
    scroller.current?.scrollTo({ x: i * w, animated: true });
    setActive(i);
  }

  const slide = SLIDES[active];

  return (
    <View style={styles.root}>
      {/* Decorative rings */}
      <View style={[styles.ring, { top: -60, right: -80, width: 320, height: 320 }]} />
      <View style={[styles.ring, { top: -30, right: -50, width: 220, height: 220 }]} />

      {/* Swipeable illustration pager */}
      <SafeAreaView style={styles.heroWrap} onLayout={(e) => setW(e.nativeEvent.layout.width)}>
        {w > 0 && (
          <ScrollView
            ref={scroller}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onScroll={onScroll}
            scrollEventThrottle={16}
            style={{ flexGrow: 0 }}
          >
            {SLIDES.map((s, i) => (
              <View key={i} style={[styles.slide, { width: w }]}>
                {s.render()}
              </View>
            ))}
          </ScrollView>
        )}
      </SafeAreaView>

      {/* White content sheet (text follows the active slide) */}
      <View style={styles.sheet}>
        <View style={{ marginBottom: spacing.lg }}>
          <Logo size={40} />
        </View>

        <Text variant="display" center style={{ fontSize: 28, lineHeight: 33, letterSpacing: -0.8, minHeight: 66 }}>
          {slide.title}
        </Text>

        <Text variant="bodyLg" center color={colors.textTertiary} style={{ marginTop: 12, marginBottom: spacing.lg, maxWidth: 300, minHeight: 52 }}>
          {slide.subtitle}
        </Text>

        {/* Working dots — tap or swipe */}
        <View style={styles.dots}>
          {SLIDES.map((_, i) => (
            <Pressable key={i} onPress={() => goTo(i)} hitSlop={8}>
              <View style={[styles.dot, i === active && styles.dotActive]} />
            </Pressable>
          ))}
        </View>

        {active < SLIDES.length - 1 ? (
          <Button label="Next" iconRight="arrow-right" onPress={() => goTo(active + 1)} />
        ) : (
          // No account-type chooser: everyone signs in with their phone number.
          // New accounts are customers; a returning user's role comes from the
          // server, so the app never has to ask "customer or cleaner".
          <Button label="Get Started" iconRight="arrow-right" onPress={() => router.push('/(auth)/phone')} />
        )}

        <Pressable onPress={() => router.push({ pathname: '/(auth)/phone', params: { mode: 'login' } })} style={{ marginTop: 18 }}>
          <Text center color={colors.textDisabled}>
            Already have an account? <Text weight="bold" color={colors.primary}>Log In</Text>
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

function IconHero({ icon }: { icon: any }) {
  return (
    <View style={{ width: 300, height: 300, alignItems: 'center', justifyContent: 'center' }}>
      <View style={styles.iconGlowLg} />
      <View style={styles.iconGlowSm} />
      <View style={styles.iconCircle}>
        <MaterialCommunityIcons name={icon} size={96} color={colors.white} />
      </View>
    </View>
  );
}

function HouseHero() {
  return (
    <Svg width={300} height={300} viewBox="0 0 373 335">
      <Circle cx="186" cy="167" r="142" fill="rgba(255,255,255,0.06)" />
      <Circle cx="186" cy="167" r="108" fill="rgba(255,255,255,0.05)" />
      <Ellipse cx="186" cy="296" rx="90" ry="12" fill="rgba(0,0,0,0.12)" />
      <Rect x="120" y="182" width="132" height="110" rx="5" fill="white" />
      <Path d="M104 198 L186 128 L268 198 Z" fill="white" />
      <Path d="M104 198 L186 128 L268 198 Z" fill="rgba(11,92,100,0.08)" />
      <Rect x="166" y="240" width="40" height="52" rx="7" fill="#0B7C82" />
      <Circle cx="200" cy="268" r="3" fill="rgba(255,255,255,0.5)" />
      <Rect x="130" y="196" width="36" height="30" rx="5" fill="#B3DFE2" />
      <Rect x="206" y="196" width="36" height="30" rx="5" fill="#B3DFE2" />
      <Line x1="148" y1="196" x2="148" y2="226" stroke="white" strokeWidth="1.5" />
      <Line x1="130" y1="211" x2="166" y2="211" stroke="white" strokeWidth="1.5" />
      <Line x1="224" y1="196" x2="224" y2="226" stroke="white" strokeWidth="1.5" />
      <Line x1="206" y1="211" x2="242" y2="211" stroke="white" strokeWidth="1.5" />
      <Rect x="216" y="143" width="16" height="30" rx="3" fill="rgba(255,255,255,0.85)" />
      <Circle cx="224" cy="136" r="8" fill="rgba(255,255,255,0.3)" />
      <Circle cx="231" cy="127" r="6" fill="rgba(255,255,255,0.22)" />
      <Line x1="96" y1="306" x2="146" y2="250" stroke="rgba(255,255,255,0.9)" strokeWidth="5" strokeLinecap="round" />
      <Rect x="262" y="238" width="22" height="34" rx="6" fill="rgba(255,255,255,0.9)" />
      <Rect x="266" y="226" width="10" height="14" rx="3" fill="rgba(255,255,255,0.75)" />
      <Path d="M74 148 L78 161 L91 165 L78 169 L74 182 L70 169 L57 165 L70 161Z" fill="#F39C12" />
      <Path d="M306 158 L309 168 L319 171 L309 174 L306 184 L303 174 L293 171 L303 168Z" fill="#F39C12" />
      <Circle cx="82" cy="220" r="9" fill="none" stroke="rgba(255,255,255,0.32)" strokeWidth="2" />
      <Circle cx="305" cy="248" r="8" fill="none" stroke="rgba(255,255,255,0.28)" strokeWidth="2" />
    </Svg>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.primary },
  ring: { position: 'absolute', borderRadius: 999, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
  heroWrap: { flex: 1, justifyContent: 'center' },
  slide: { alignItems: 'center', justifyContent: 'center' },
  iconGlowLg: { position: 'absolute', width: 240, height: 240, borderRadius: 120, backgroundColor: 'rgba(255,255,255,0.06)' },
  iconGlowSm: { position: 'absolute', width: 180, height: 180, borderRadius: 90, backgroundColor: 'rgba(255,255,255,0.06)' },
  iconCircle: { width: 132, height: 132, borderRadius: 66, backgroundColor: 'rgba(255,255,255,0.14)', alignItems: 'center', justifyContent: 'center' },
  sheet: {
    backgroundColor: colors.white,
    borderTopLeftRadius: 36,
    borderTopRightRadius: 36,
    alignItems: 'center',
    paddingHorizontal: 28,
    paddingTop: 28,
    paddingBottom: 36,
  },
  dots: { flexDirection: 'row', gap: 6, alignItems: 'center', marginBottom: 28 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.border },
  dotActive: { width: 22, backgroundColor: colors.primary },
});
