import { View, StyleSheet, Pressable } from 'react-native';
import { usePathname, useSegments, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { Text } from './Text';
import { colors, fonts } from '../theme/theme';
import { isPro } from '../services/client';
import { useUnreadCount } from '../store/unread';

interface Item { key: string; label: string; icon: any; path: string; active: (p: string) => boolean; badge?: number }

/**
 * A single persistent bottom tab bar shown on EVERY screen (details included).
 * It's role-aware — customers see Home/Bookings/Messages/Profile, cleaners see
 * Jobs/Schedule/Messages/Earnings/Profile — and it highlights the right tab even
 * on nested screens (a booking detail lights up "Bookings", a chat "Messages").
 */
export function AppTabBar() {
  const pathname = usePathname();
  const segments = useSegments();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const unread = useUnreadCount();

  const group = segments[0] as string | undefined;
  // Hide only where a tab bar makes no sense: the auth flow and the very first
  // redirect. Everywhere else (details, tracking, chat, modals) it stays.
  if (!group || group === '(auth)') return null;

  const p = pathname || '/';
  const pro = isPro();

  const customer: Item[] = [
    { key: 'home', label: 'Home', icon: 'home', path: '/(tabs)', active: (x) => !isB(x) && !isM(x) && !isP(x) },
    { key: 'bookings', label: 'Bookings', icon: 'calendar', path: '/(tabs)/bookings', active: isB },
    { key: 'messages', label: 'Messages', icon: 'message-circle', path: '/(tabs)/messages', active: isM, badge: unread },
    { key: 'profile', label: 'Profile', icon: 'user', path: '/(tabs)/profile', active: isP },
  ];
  const professional: Item[] = [
    { key: 'jobs', label: 'Jobs', icon: 'briefcase', path: '/(pro)', active: (x) => !isSch(x) && !isM(x) && !isEarn(x) && !isP(x) },
    { key: 'schedule', label: 'Schedule', icon: 'calendar', path: '/(pro)/schedule', active: isSch },
    { key: 'messages', label: 'Messages', icon: 'message-circle', path: '/(pro)/messages', active: isM, badge: unread },
    { key: 'earnings', label: 'Earnings', icon: 'dollar-sign', path: '/(pro)/earnings', active: isEarn },
    { key: 'profile', label: 'Profile', icon: 'user', path: '/(pro)/profile', active: isP },
  ];
  const items = pro ? professional : customer;

  return (
    <View style={[styles.bar, { height: 62 + insets.bottom, paddingBottom: insets.bottom }]}>
      {items.map((it) => {
        const on = it.active(p);
        return (
          <Pressable key={it.key} style={styles.tab} onPress={() => router.navigate(it.path as any)} hitSlop={6}>
            <View>
              <Feather name={it.icon} size={22} color={on ? colors.primary : colors.textDisabled} />
              {!!it.badge && it.badge > 0 && (
                <View style={styles.badge}><Text weight="bold" color={colors.white} style={{ fontSize: 9 }}>{it.badge > 9 ? '9+' : it.badge}</Text></View>
              )}
            </View>
            <Text style={{ fontFamily: fonts.semibold, fontSize: 10, marginTop: 3 }} color={on ? colors.primary : colors.textDisabled}>{it.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

// Active-tab matchers (shared by both role sets).
const isB = (p: string) => p.startsWith('/bookings') || p.startsWith('/booking');
const isM = (p: string) => p.startsWith('/messages') || p.startsWith('/chat');
const isP = (p: string) => p.startsWith('/profile') || p.startsWith('/(pro)/profile');
const isSch = (p: string) => p.startsWith('/schedule');
const isEarn = (p: string) => p.startsWith('/earnings') || p.startsWith('/payout');

const styles = StyleSheet.create({
  bar: { flexDirection: 'row', backgroundColor: colors.white, borderTopWidth: 1, borderTopColor: '#F0F0F0', paddingTop: 6 },
  tab: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 0 },
  badge: { position: 'absolute', top: -5, right: -9, minWidth: 16, height: 16, borderRadius: 8, backgroundColor: colors.error, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 3 },
});

export default AppTabBar;
