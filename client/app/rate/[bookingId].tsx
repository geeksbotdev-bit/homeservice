import { useEffect, useState } from 'react';
import { View, StyleSheet, TextInput, Pressable, ScrollView } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather, FontAwesome } from '@expo/vector-icons';
import { Text, Button, Stars } from '../../src/components';
import { colors, radius } from '../../src/theme/theme';
import { bookings as bookingsApi } from '../../src/services/api';
import type { Booking } from '../../src/data/types';

const TAGS = ['Punctual', 'Thorough', 'Friendly', 'Professional', 'Great value', 'Well equipped'];
const LABELS = ['', 'Poor', 'Fair', 'Good', 'Very good', 'Excellent'];

export default function Rate() {
  const router = useRouter();
  const { bookingId, stars } = useLocalSearchParams<{ bookingId: string; stars?: string }>();
  const [b, setB] = useState<Booking | null>(null);
  const [rating, setRating] = useState(Number(stars) || 0);
  const [tags, setTags] = useState<string[]>([]);
  const [review, setReview] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => { if (bookingId) bookingsApi.get(bookingId).then(setB); }, [bookingId]);

  function toggleTag(t: string) {
    setTags((prev) => (prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]));
  }

  async function submit() {
    if (!rating || !bookingId) return;
    setLoading(true);
    const note = [tags.join(', '), review].filter(Boolean).join(' · ');
    await bookingsApi.rate(bookingId, rating, note);
    setLoading(false);
    (router.canGoBack() ? router.back() : router.replace('/(tabs)/bookings'));
  }

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      <View style={styles.handle} />
      <Pressable onPress={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)/bookings'))} style={styles.close}>
        <Feather name="x" size={20} color={colors.textTertiary} />
      </Pressable>

      <ScrollView contentContainerStyle={{ padding: 24, paddingTop: 8 }} showsVerticalScrollIndicator={false}>
        <View style={styles.avatar}>
          {b?.cleaner
            ? <Text weight="extrabold" color={colors.primary700} style={{ fontSize: 24 }}>{b.cleaner.initials}</Text>
            : <Feather name="user" size={28} color={colors.primary700} />}
        </View>
        <Text variant="display" center style={{ fontSize: 22, marginTop: 16 }}>Rate your experience</Text>
        <Text variant="bodyLg" center color={colors.textTertiary} style={{ fontSize: 14, marginTop: 6 }}>
          How was your {b?.service ?? 'cleaning'}{b?.cleaner ? ` with ${b.cleaner.name}` : ''}?
        </Text>

        {/* Stars */}
        <View style={{ alignItems: 'center', marginTop: 28, marginBottom: 8 }}>
          <Stars value={rating} size={40} gap={10} onChange={setRating} />
          <Text weight="bold" color={colors.accent600} style={{ fontSize: 16, marginTop: 12, height: 22 }}>{LABELS[rating]}</Text>
        </View>

        {/* Tags */}
        <Text variant="h3" style={{ fontSize: 14, marginTop: 16, marginBottom: 12 }}>What stood out?</Text>
        <View style={styles.tagWrap}>
          {TAGS.map((t) => {
            const on = tags.includes(t);
            return (
              <Pressable key={t} onPress={() => toggleTag(t)} style={[styles.tag, on && styles.tagOn]}>
                {on && <Feather name="check" size={12} color={colors.white} />}
                <Text variant="bodySm" weight="semibold" color={on ? colors.white : colors.textSecondary}>{t}</Text>
              </Pressable>
            );
          })}
        </View>

        {/* Review */}
        <Text variant="h3" style={{ fontSize: 14, marginTop: 20, marginBottom: 10 }}>Add a review (optional)</Text>
        <TextInput
          style={styles.input}
          placeholder="Share details of your experience…"
          placeholderTextColor={colors.textDisabled}
          value={review}
          onChangeText={setReview}
          multiline
          textAlignVertical="top"
        />

        <Button label="Submit Rating" icon="send" onPress={submit} disabled={!rating} loading={loading} loadingLabel="Submitting..." style={{ marginTop: 24 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.white },
  handle: { width: 40, height: 5, borderRadius: 3, backgroundColor: colors.border, alignSelf: 'center', marginTop: 10 },
  close: { position: 'absolute', top: 18, right: 18, width: 36, height: 36, borderRadius: 18, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center', zIndex: 1 },
  avatar: { width: 72, height: 72, borderRadius: 36, backgroundColor: colors.primary200, alignItems: 'center', justifyContent: 'center', alignSelf: 'center', marginTop: 16 },
  tagWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  tag: { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1.5, borderColor: colors.border, borderRadius: radius.pill, paddingVertical: 9, paddingHorizontal: 14 },
  tagOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  input: { minHeight: 100, backgroundColor: colors.surfaceAlt, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, padding: 14, fontSize: 14, fontFamily: 'PlusJakartaSans_400Regular', color: colors.textPrimary },
});
