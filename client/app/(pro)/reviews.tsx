import { useCallback, useState } from 'react';
import { View, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FontAwesome } from '@expo/vector-icons';
import { Text, Card, NavBar } from '../../src/components';
import { colors, radius, shadow } from '../../src/theme/theme';
import { pro, type ProReview } from '../../src/services/api';

function Stars({ n, size = 13 }: { n: number; size?: number }) {
  return (
    <View style={{ flexDirection: 'row', gap: 2 }}>
      {[1, 2, 3, 4, 5].map((i) => (
        <FontAwesome key={i} name={i <= Math.round(n) ? 'star' : 'star-o'} size={size} color={colors.accent} />
      ))}
    </View>
  );
}

export default function ProReviews() {
  const [data, setData] = useState<{ average: number; count: number; items: ProReview[] } | null>(null);
  useFocusEffect(useCallback(() => { pro.reviews().then(setData).catch(() => setData({ average: 0, count: 0, items: [] })); }, []));

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <NavBar title="Reviews" />
      {!data ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: 50 }} />
      ) : (
        <ScrollView contentContainerStyle={{ padding: 16, gap: 14 }} showsVerticalScrollIndicator={false}>
          {/* Summary */}
          <Card style={{ padding: 20, alignItems: 'center', gap: 6 }}>
            <Text weight="extrabold" style={{ fontSize: 40, letterSpacing: -1, color: colors.primary }}>{data.count ? data.average : '—'}</Text>
            <Stars n={data.average} size={18} />
            <Text variant="bodySm" color={colors.textTertiary}>{data.count} {data.count === 1 ? 'review' : 'reviews'}</Text>
          </Card>

          {data.count === 0 ? (
            <View style={styles.empty}>
              <FontAwesome name="star-o" size={26} color={colors.border} />
              <Text color={colors.textDisabled} center style={{ marginTop: 8 }}>No reviews yet. Complete jobs and your customer ratings will appear here.</Text>
            </View>
          ) : (
            data.items.map((r, i) => (
              <Card key={i} style={{ padding: 16, gap: 8 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <View style={styles.avatar}><Text weight="bold" color={colors.primary700} style={{ fontSize: 12 }}>{(r.customer || '?').slice(0, 2).toUpperCase()}</Text></View>
                  <View style={{ flex: 1 }}>
                    <Text weight="bold" style={{ fontSize: 14 }}>{r.customer}</Text>
                    <Text variant="bodySm" color={colors.textTertiary}>{r.service} · {new Date(r.date).toLocaleDateString('en-PK', { day: 'numeric', month: 'short' })}</Text>
                  </View>
                  <Stars n={r.rating} />
                </View>
                {!!r.review && <Text color={colors.textSecondary} style={{ lineHeight: 20, fontSize: 13.5 }}>{r.review}</Text>}
              </Card>
            ))
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surface },
  avatar: { width: 38, height: 38, borderRadius: 19, backgroundColor: colors.primary200, alignItems: 'center', justifyContent: 'center' },
  empty: { backgroundColor: colors.white, borderRadius: radius.lg, padding: 32, alignItems: 'center', ...shadow.soft },
});
