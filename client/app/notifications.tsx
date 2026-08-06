import { useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView, Pressable, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { Text, NavBar } from '../src/components';
import { colors, radius, shadow } from '../src/theme/theme';
import { notifications as notifApi } from '../src/services/api';
import type { AppNotification } from '../src/data/types';

export default function Notifications() {
  const [items, setItems] = useState<AppNotification[] | null>(null);

  useEffect(() => { notifApi.list().then((r) => setItems(r.items)); }, []);

  async function markAll() {
    setItems((prev) => prev?.map((n) => ({ ...n, read: true })) ?? prev);
    await notifApi.readAll();
  }

  const hasUnread = (items ?? []).some((n) => !n.read);

  return (
    <View style={styles.root}>
      <SafeAreaView edges={['top']} style={styles.headerWrap}>
        <NavBar
          title="Notifications"
          bordered={false}
          rightIcon={hasUnread ? 'check-circle' : undefined}
          onRight={hasUnread ? markAll : undefined}
        />
      </SafeAreaView>

      {items === null ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
      ) : items.length === 0 ? (
        <View style={styles.empty}>
          <Feather name="bell-off" size={40} color={colors.border} />
          <Text color={colors.textDisabled} style={{ marginTop: 12 }}>No notifications yet</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ padding: 16, gap: 10 }} showsVerticalScrollIndicator={false}>
          {hasUnread && (
            <Pressable onPress={markAll} style={{ alignSelf: 'flex-end', paddingVertical: 4 }}>
              <Text weight="semibold" color={colors.primary} style={{ fontSize: 13 }}>Mark all as read</Text>
            </Pressable>
          )}
          {items.map((n) => (
            <View key={n.id} style={[styles.row, !n.read && styles.unread]}>
              <View style={[styles.icon, !n.read && { backgroundColor: colors.primary50 }]}>
                <Feather name={n.icon as any} size={18} color={colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Text weight="bold" style={{ flex: 1, fontSize: 14 }}>{n.title}</Text>
                  {!n.read && <View style={styles.dot} />}
                </View>
                <Text variant="bodySm" color={colors.textTertiary} style={{ marginTop: 2, lineHeight: 18 }}>{n.body}</Text>
                <Text variant="bodySm" color={colors.textDisabled} style={{ marginTop: 6, fontSize: 11 }}>{n.time}</Text>
              </View>
            </View>
          ))}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surface },
  headerWrap: { backgroundColor: colors.white },
  row: { flexDirection: 'row', gap: 12, backgroundColor: colors.white, borderRadius: radius.xl, padding: 14, ...shadow.soft },
  unread: { backgroundColor: '#F0FAFA' },
  icon: { width: 42, height: 42, borderRadius: 21, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
  dot: { width: 9, height: 9, borderRadius: 5, backgroundColor: colors.primary },
  empty: { alignItems: 'center', paddingVertical: 80 },
});
