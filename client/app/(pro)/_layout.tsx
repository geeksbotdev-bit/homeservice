import { Tabs } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useUnreadCount } from '../../src/store/unread';
import { useProLocation } from '../../src/hooks/useProLocation';

export default function ProLayout() {
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
      <Tabs.Screen name="index" options={{ title: 'Jobs', tabBarIcon: ({ color, size }) => <Feather name="briefcase" size={size} color={color} /> }} />
      <Tabs.Screen name="schedule" options={{ title: 'Schedule', tabBarIcon: ({ color, size }) => <Feather name="calendar" size={size} color={color} /> }} />
      <Tabs.Screen name="messages" options={{ title: 'Messages', tabBarBadge: unread > 0 ? unread : undefined, tabBarIcon: ({ color, size }) => <Feather name="message-circle" size={size} color={color} /> }} />
      <Tabs.Screen name="earnings" options={{ title: 'Earnings', tabBarIcon: ({ color, size }) => <Feather name="dollar-sign" size={size} color={color} /> }} />
      <Tabs.Screen name="profile" options={{ title: 'Profile', tabBarIcon: ({ color, size }) => <Feather name="user" size={size} color={color} /> }} />
      <Tabs.Screen name="edit" options={{ href: null }} />
      <Tabs.Screen name="reviews" options={{ href: null }} />
      <Tabs.Screen name="payout" options={{ href: null }} />
      <Tabs.Screen name="verify" options={{ href: null }} />
    </Tabs>
  );
}
