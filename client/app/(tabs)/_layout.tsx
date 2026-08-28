import { Tabs } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useUnreadCount } from '../../src/store/unread';
import { useLang } from '../../src/store/lang';

export default function TabsLayout() {
  const unread = useUnreadCount();
  const { t } = useLang();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        // The persistent app-wide bottom bar (AppTabBar) is rendered globally in
        // the root layout, so the native per-group bar is hidden to avoid two.
        tabBarStyle: { display: 'none' },
      }}
    >
      <Tabs.Screen name="index" options={{ title: t('Home'), tabBarIcon: ({ color, size }) => <Feather name="home" size={size} color={color} /> }} />
      <Tabs.Screen name="bookings" options={{ title: t('Bookings'), tabBarIcon: ({ color, size }) => <Feather name="calendar" size={size} color={color} /> }} />
      <Tabs.Screen name="messages" options={{ title: t('Messages'), tabBarBadge: unread > 0 ? unread : undefined, tabBarIcon: ({ color, size }) => <Feather name="message-circle" size={size} color={color} /> }} />
      <Tabs.Screen name="profile" options={{ title: t('Profile'), tabBarIcon: ({ color, size }) => <Feather name="user" size={size} color={color} /> }} />
    </Tabs>
  );
}
