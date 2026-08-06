import { useCallback, useState } from 'react';
import { View, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { Text, Card, StatusBadge } from '../../src/components';
import { colors, radius, shadow } from '../../src/theme/theme';
import { pro } from '../../src/services/api';
import { formatPKR } from '../../src/utils';
import type { Booking } from '../../src/data/types';

export default function ProSchedule() {
  const [jobs, setJobs] = useState<Booking[] | null>(null);

  useFocusEffect(useCallback(() => {
    pro.jobs().then((d) => setJobs([...d.requests, ...d.active]));
  }, []));

  return (
    <View style={styles.root}>
      <SafeAreaView edges={['top']} style={styles.header}>
        <Text variant="h1" color={colors.white} style={{ fontSize: 22 }}>Schedule</Text>
        <Text color="rgba(255,255,255,0.7)" style={{ marginTop: 2 }}>Your upcoming cleanings</Text>
      </SafeAreaView>

      {!jobs ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
      ) : jobs.length === 0 ? (
        <View style={styles.empty}><Feather name="calendar" size={40} color={colors.border} /><Text color={colors.textDisabled} style={{ marginTop: 12 }}>No scheduled jobs</Text></View>
      ) : (
        <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }} showsVerticalScrollIndicator={false}>
          {jobs.map((b) => (
            <Card key={b.id} style={{ padding: 16 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                <View style={{ flex: 1 }}>
                  <Text weight="bold" style={{ fontSize: 15 }}>{b.service}</Text>
                  <Text variant="bodySm" color={colors.textTertiary} style={{ marginTop: 2 }}>{b.dateLabel}</Text>
                </View>
                <StatusBadge status={b.status} />
              </View>
              <View style={styles.timeRow}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Feather name="clock" size={14} color={colors.primary} />
                  <Text weight="semibold" color={colors.textSecondary} style={{ fontSize: 13 }}>{b.timeLabel}</Text>
                </View>
                <Text weight="extrabold" color={colors.primary}>{formatPKR(b.total)}</Text>
              </View>
            </Card>
          ))}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surface },
  header: { backgroundColor: colors.primary, paddingHorizontal: 20, paddingBottom: 18, paddingTop: 8 },
  timeRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: colors.surface, paddingTop: 12 },
  empty: { alignItems: 'center', paddingVertical: 70 },
});
