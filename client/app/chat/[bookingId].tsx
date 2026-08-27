import { useCallback, useRef, useState } from 'react';
import { View, StyleSheet, ScrollView, TextInput, Pressable, KeyboardAvoidingView, Platform, Linking } from 'react-native';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { Text } from '../../src/components';
import { colors, radius } from '../../src/theme/theme';
import { chat, type ChatMeta } from '../../src/services/api';
import { refreshUnread } from '../../src/store/unread';
import type { ChatMessage } from '../../src/data/types';

const QUICK = ['On my way!', "I've arrived", 'Running late', 'Thank you!'];

export default function Chat() {
  const router = useRouter();
  const { bookingId } = useLocalSearchParams<{ bookingId: string }>();
  const [meta, setMeta] = useState<ChatMeta | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [text, setText] = useState('');
  const scroller = useRef<ScrollView>(null);
  const lastCount = useRef(0);

  // Fetch the latest thread and reconcile. Marks the other party's messages
  // read whenever something new arrives, then nudges the inbox badge.
  const loadMessages = useCallback(async () => {
    if (!bookingId) return;
    try {
      const list = await chat.messages(bookingId);
      setMessages(list);
      const hasUnreadIncoming = list.some((m) => !m.fromMe && !m.read);
      if (hasUnreadIncoming) chat.markRead(bookingId).then(refreshUnread).catch(() => {});
      // Auto-scroll only when the count grew (a new message came in / was sent).
      if (list.length !== lastCount.current) {
        lastCount.current = list.length;
        setTimeout(() => scroller.current?.scrollToEnd({ animated: true }), 50);
      }
    } catch { /* transient network / 401 handled globally */ }
  }, [bookingId]);

  // Poll every 2.5s while the screen is focused → messages arrive without refresh.
  useFocusEffect(useCallback(() => {
    if (!bookingId) return;
    chat.meta(bookingId).then(setMeta).catch(() => {});
    loadMessages();
    const t = setInterval(loadMessages, 2500);
    return () => clearInterval(t);
  }, [bookingId, loadMessages]));

  async function send(body?: string) {
    const value = (body ?? text).trim();
    if (!value || !bookingId) return;
    setText('');
    // Optimistic bubble so it feels instant; the next sync reconciles it.
    const temp: ChatMessage = { id: 'temp-' + value + messages.length, bookingId, fromMe: true, text: value, time: 'now', read: false };
    setMessages((m) => [...m, temp]);
    setTimeout(() => scroller.current?.scrollToEnd({ animated: true }), 50);
    try {
      await chat.send(bookingId, value);
    } finally {
      loadMessages(); // pull the server-persisted message (real id/time)
    }
  }

  const otherName = meta?.name ?? 'Cleaner';
  const otherInitials = meta?.initials ?? otherName.slice(0, 2).toUpperCase();

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)/messages'))} style={styles.circle}>
          <Feather name="chevron-left" size={20} color={colors.textSecondary} />
        </Pressable>
        <View style={styles.avatar}>
          <Text weight="bold" color={colors.primary700} style={{ fontSize: 14 }}>{otherInitials}</Text>
          <View style={styles.online} />
        </View>
        <View style={{ flex: 1 }}>
          <Text weight="bold" style={{ fontSize: 15 }}>{otherName}</Text>
          <Text variant="bodySm" color={colors.success}>Online{meta?.service ? ` · ${meta.service}` : ''}</Text>
        </View>
        <Pressable style={[styles.circle, { backgroundColor: colors.primary }]} onPress={() => meta?.phone && Linking.openURL(`tel:${meta.phone}`)}>
          <Feather name="phone" size={17} color={colors.white} />
        </Pressable>
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={8}>
        <ScrollView
          ref={scroller}
          style={{ flex: 1 }}
          contentContainerStyle={{ padding: 16, gap: 10, flexGrow: 1 }}
          onContentSizeChange={() => scroller.current?.scrollToEnd({ animated: false })}
        >
          <Text center variant="bodySm" color={colors.textDisabled} style={{ marginBottom: 6 }}>Today</Text>
          {messages.map((m) => (
            <View key={m.id} style={[styles.bubbleRow, { justifyContent: m.fromMe ? 'flex-end' : 'flex-start' }]}>
              <View style={[styles.bubble, m.fromMe ? styles.mine : styles.theirs]}>
                <Text style={{ fontSize: 14 }} color={m.fromMe ? colors.white : colors.textPrimary}>{m.text}</Text>
                <Text style={{ fontSize: 10, marginTop: 4, alignSelf: 'flex-end' }} color={m.fromMe ? 'rgba(255,255,255,0.7)' : colors.textDisabled}>{m.time}</Text>
              </View>
            </View>
          ))}
        </ScrollView>

        {/* Quick replies */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.quickScroll} contentContainerStyle={styles.quickRow}>
          {QUICK.map((q) => (
            <Pressable key={q} onPress={() => send(q)} style={styles.quick}>
              <Text variant="bodySm" weight="semibold" color={colors.primary}>{q}</Text>
            </Pressable>
          ))}
        </ScrollView>

        {/* Composer */}
        <View style={styles.composer}>
          <TextInput
            style={styles.input}
            placeholder="Type a message…"
            placeholderTextColor={colors.textDisabled}
            value={text}
            onChangeText={setText}
            onSubmitEditing={() => send()}
            returnKeyType="send"
            multiline
          />
          <Pressable onPress={() => send()} style={[styles.sendBtn, !text.trim() && { backgroundColor: colors.border }]}>
            <Feather name="send" size={18} color={colors.white} />
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surface },
  header: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingVertical: 10, backgroundColor: colors.white, borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  circle: { width: 38, height: 38, borderRadius: 19, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
  avatar: { width: 42, height: 42, borderRadius: 21, backgroundColor: colors.primary200, alignItems: 'center', justifyContent: 'center' },
  online: { position: 'absolute', bottom: 0, right: 0, width: 12, height: 12, borderRadius: 6, backgroundColor: colors.success, borderWidth: 2, borderColor: colors.white },
  bubbleRow: { flexDirection: 'row' },
  bubble: { maxWidth: '78%', borderRadius: 18, paddingHorizontal: 14, paddingVertical: 10 },
  mine: { backgroundColor: colors.primary, borderBottomRightRadius: 4 },
  theirs: { backgroundColor: colors.white, borderBottomLeftRadius: 4 },
  quickScroll: { flexGrow: 0, flexShrink: 0 },
  quickRow: { paddingHorizontal: 16, paddingBottom: 8, gap: 8, alignItems: 'center' },
  quick: { backgroundColor: colors.primary50, borderRadius: radius.pill, paddingHorizontal: 14, height: 34, justifyContent: 'center', alignSelf: 'center' },
  composer: { flexDirection: 'row', alignItems: 'flex-end', gap: 10, paddingHorizontal: 16, paddingTop: 8, paddingBottom: 20, backgroundColor: colors.white, borderTopWidth: 1, borderTopColor: colors.surface },
  input: { flex: 1, maxHeight: 100, minHeight: 46, backgroundColor: colors.surface, borderRadius: radius.xl, paddingHorizontal: 16, paddingTop: 12, paddingBottom: 12, fontSize: 14, fontFamily: 'PlusJakartaSans_400Regular', color: colors.textPrimary },
  sendBtn: { width: 46, height: 46, borderRadius: 23, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
});
