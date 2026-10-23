import { Tabs } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useUnreadCount } from '../../src/store/unread';
import { useProLocation } from '../../src/hooks/useProLocation';
import { useLang } from '../../src/store/lang';

export default function ProLayout() {
  const { t } = useLang();
  const unread = useUnreadCount();
  useProLocation();  // broadcast the cleaner's live location while online
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        // Hidden — the global AppTabBar (root layout) renders the bottom bar.
        tabBarStyle: { display: 'none' },
      }}
    >
      <Tabs.Screen name="index" options={{ title: t('Jobs'), tabBarIcon: ({ color, size }) => <Feather name="briefcase" size={size} color={color} /> }} />
      <Tabs.Screen name="schedule" options={{ title: t('Schedule'), tabBarIcon: ({ color, size }) => <Feather name="calendar" size={size} color={color} /> }} />
      <Tabs.Screen name="messages" options={{ title: t('Messages'), tabBarBadge: unread > 0 ? unread : undefined, tabBarIcon: ({ color, size }) => <Feather name="message-circle" size={size} color={color} /> }} />
      <Tabs.Screen name="earnings" options={{ title: t('Earnings'), tabBarIcon: ({ color, size }) => <Feather name="dollar-sign" size={size} color={color} /> }} />
      <Tabs.Screen name="profile" options={{ title: t('Profile'), tabBarIcon: ({ color, size }) => <Feather name="user" size={size} color={color} /> }} />
      <Tabs.Screen name="edit" options={{ href: null }} />
      <Tabs.Screen name="reviews" options={{ href: null }} />
      <Tabs.Screen name="payout" options={{ href: null }} />
      <Tabs.Screen name="verify" options={{ href: null }} />
      <Tabs.Screen name="services" options={{ href: null }} />
    </Tabs>
  );
}
