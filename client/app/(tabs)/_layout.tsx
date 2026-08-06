import { Tabs } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, fonts } from '../../src/theme/theme';
import { useUnreadCount } from '../../src/store/unread';
import { useLang } from '../../src/store/lang';

export default function TabsLayout() {
  const unread = useUnreadCount();
  const insets = useSafeAreaInsets();
  const { t } = useLang();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textDisabled,
        tabBarLabelStyle: { fontFamily: fonts.semibold, fontSize: 10 },
        tabBarStyle: {
          backgroundColor: colors.white,
          borderTopColor: '#F0F0F0',
          height: 64 + insets.bottom,
          paddingTop: 6,
          paddingBottom: 8 + insets.bottom,
        },
      }}
    >
      <Tabs.Screen name="index" options={{ title: t('Home'), tabBarIcon: ({ color, size }) => <Feather name="home" size={size} color={color} /> }} />
      <Tabs.Screen name="bookings" options={{ title: t('Bookings'), tabBarIcon: ({ color, size }) => <Feather name="calendar" size={size} color={color} /> }} />
      <Tabs.Screen name="messages" options={{ title: t('Messages'), tabBarBadge: unread > 0 ? unread : undefined, tabBarIcon: ({ color, size }) => <Feather name="message-circle" size={size} color={color} /> }} />
      <Tabs.Screen name="profile" options={{ title: t('Profile'), tabBarIcon: ({ color, size }) => <Feather name="user" size={size} color={color} /> }} />
    </Tabs>
  );
}
