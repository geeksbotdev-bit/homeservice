import { useEffect, useRef, useState } from 'react';
import { Animated, StyleSheet, Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { Text } from './Text';
import { colors, radius, shadow } from '../theme/theme';
import { subscribeToast, type ToastMsg } from '../store/toast';
import { isPro } from '../services/client';

/** Top in-app toast — slides in when a new message (or any showToast) fires. */
export function Toaster() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [toast, setToast] = useState<ToastMsg | null>(null);
  const y = useRef(new Animated.Value(-140)).current;
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return subscribeToast((t) => {
      setToast(t);
      Animated.spring(y, { toValue: 0, useNativeDriver: true, bounciness: 6, speed: 12 }).start();
      if (hideTimer.current) clearTimeout(hideTimer.current);
      hideTimer.current = setTimeout(dismiss, 4000);
    });
  }, []);

  function dismiss() {
    Animated.timing(y, { toValue: -140, duration: 220, useNativeDriver: true }).start(() => setToast(null));
  }

  function open() {
    if (hideTimer.current) clearTimeout(hideTimer.current);
    const target = isPro() ? '/(pro)/messages' : '/(tabs)/messages';
    dismiss();
    router.push(target as any);
  }

  if (!toast) return null;

  return (
    <Animated.View pointerEvents="box-none" style={[styles.wrap, { paddingTop: insets.top + 8, transform: [{ translateY: y }] }]}>
      <Pressable onPress={open} style={styles.card}>
        <View style={styles.icon}><Feather name="message-circle" size={18} color={colors.white} /></View>
        <View style={{ flex: 1 }}>
          <Text weight="bold" style={{ fontSize: 14 }} numberOfLines={1}>{toast.title}</Text>
          <Text variant="bodySm" color={colors.textTertiary} numberOfLines={1}>{toast.body}</Text>
        </View>
        <Pressable onPress={dismiss} hitSlop={8}><Feather name="x" size={16} color={colors.textDisabled} /></Pressable>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', top: 0, left: 0, right: 0, alignItems: 'center', paddingHorizontal: 12, zIndex: 1000 },
  card: {
    flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.white,
    borderRadius: radius.lg, paddingVertical: 12, paddingHorizontal: 14, width: '100%', maxWidth: 440,
    borderWidth: 1, borderColor: colors.border, ...shadow.card,
  },
  icon: { width: 38, height: 38, borderRadius: 19, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
});

export default Toaster;
