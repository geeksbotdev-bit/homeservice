import { useCallback, useState } from 'react';
import { View, StyleSheet, ScrollView, Pressable, ActivityIndicator } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { Text } from '../../src/components';
import { colors, radius, shadow } from '../../src/theme/theme';
import { chat } from '../../src/services/api';
import { refreshUnread } from '../../src/store/unread';
import type { Conversation } from '../../src/data/types';

export default function Messages() {
  const router = useRouter();
  const [list, setList] = useState<Conversation[] | null>(null);

  useFocusEffect(useCallback(() => {
    chat.conversations().then(setList);
    refreshUnread();
  }, []));

  return (
    <View style={styles.root}>
      <SafeAreaView edges={['top']} style={styles.header}>
        <Text variant="h1" color={colors.white} style={{ fontSize: 22 }}>Messages</Text>
        <Text color="rgba(255,255,255,0.7)" style={{ marginTop: 2 }}>Chat with your assigned cleaners</Text>
      </SafeAreaView>

      {list === null ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
      ) : list.length === 0 ? (
        <View style={{ alignItems: 'center', paddingTop: 70, paddingHorizontal: 32, gap: 10 }}>
          <Feather name="message-circle" size={32} color={colors.border} />
          <Text weight="bold" style={{ fontSize: 16 }}>No messages yet</Text>
          <Text color={colors.textTertiary} center>Once a cleaner is assigned to your booking, your chat will appear here.</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ padding: 16, gap: 10 }}>
          {[...list]
            .sort((a, b) => (b.unread - a.unread) || (Number(b.lastMessage !== 'Say hello') - Number(a.lastMessage !== 'Say hello')))
            .map((c) => (
            <Pressable key={c.bookingId} style={styles.row} onPress={() => router.push(`/chat/${c.bookingId}`)}>
              <View style={styles.avatar}>
                <Text weight="bold" color={colors.primary700} style={{ fontSize: 15 }}>{c.initials}</Text>
                {c.online && <View style={styles.online} />}
              </View>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 2 }}>
                  <Text weight="bold" style={{ fontSize: 15 }}>{c.name}</Text>
                  <Text variant="bodySm" color={colors.textDisabled}>{c.lastTime}</Text>
                </View>
                <Text variant="caption" color={colors.primary} style={{ marginBottom: 3, letterSpacing: 0.3 }}>{c.serviceName}</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Text variant="bodySm" color={colors.textTertiary} style={{ flex: 1 }} numberOfLines={1}>{c.lastMessage}</Text>
                  {c.unread > 0 && (
                    <View style={styles.badge}><Text weight="bold" color={colors.white} style={{ fontSize: 10 }}>{c.unread}</Text></View>
                  )}
                </View>
              </View>
            </Pressable>
          ))}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surface },
  header: { backgroundColor: colors.primary, paddingHorizontal: 20, paddingBottom: 18, paddingTop: 6 },
  row: { flexDirection: 'row', gap: 12, backgroundColor: colors.white, borderRadius: radius.xl, padding: 14, alignItems: 'center', ...shadow.soft },
  avatar: { width: 50, height: 50, borderRadius: 25, backgroundColor: colors.primary200, alignItems: 'center', justifyContent: 'center' },
  online: { position: 'absolute', bottom: 1, right: 1, width: 13, height: 13, borderRadius: 7, backgroundColor: colors.success, borderWidth: 2, borderColor: colors.white },
  badge: { minWidth: 20, height: 20, paddingHorizontal: 6, borderRadius: 10, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
});
