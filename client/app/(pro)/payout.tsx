import { useCallback, useState } from 'react';
import { View, StyleSheet, ScrollView, Pressable, ActivityIndicator } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { Text, Button, Card, NavBar } from '../../src/components';
import { colors, radius } from '../../src/theme/theme';
import { user as userApi } from '../../src/services/api';
import type { PaymentMethod } from '../../src/data/types';

const ICONS: Record<string, any> = { bank: 'home', easypaisa: 'smartphone', jazzcash: 'smartphone', card: 'credit-card' };

export default function ProPayout() {
  const router = useRouter();
  const [methods, setMethods] = useState<PaymentMethod[] | null>(null);

  useFocusEffect(useCallback(() => {
    userApi.me().then((me) => setMethods(me.paymentMethods)).catch(() => setMethods([]));
  }, []));

  async function remove(id: string) {
    setMethods((m) => (m ? m.filter((x) => x.id !== id) : m));
    await userApi.deletePayment(id).catch(() => {});
  }

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <NavBar title="Payout method" />
      <ScrollView contentContainerStyle={{ padding: 16, gap: 14 }}>
        <View style={styles.note}>
          <Feather name="info" size={15} color={colors.primary} />
          <Text variant="bodySm" color={colors.textSecondary} style={{ flex: 1 }}>Your earnings are transferred to the account you add here. Add your bank, Easypaisa or JazzCash.</Text>
        </View>

        {methods === null ? (
          <ActivityIndicator color={colors.primary} style={{ paddingVertical: 30 }} />
        ) : methods.length === 0 ? (
          <Card style={{ padding: 24, alignItems: 'center', gap: 10 }}>
            <Feather name="credit-card" size={28} color={colors.border} />
            <Text color={colors.textTertiary} center>No payout account yet. Add where you'd like to receive your earnings.</Text>
          </Card>
        ) : (
          methods.map((m) => (
            <Card key={m.id} style={{ padding: 16, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <View style={styles.icon}><Feather name={ICONS[m.type] ?? 'credit-card'} size={18} color={colors.primary} /></View>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Text weight="bold" style={{ fontSize: 14 }}>{m.name}</Text>
                  {m.isDefault && <View style={styles.badge}><Text weight="bold" color={colors.primary700} style={{ fontSize: 9 }}>DEFAULT</Text></View>}
                </View>
                <Text variant="bodySm" color={colors.textTertiary}>{m.detail}</Text>
              </View>
              <Pressable onPress={() => remove(m.id)} hitSlop={8} style={styles.trash}><Feather name="trash-2" size={16} color={colors.error} /></Pressable>
            </Card>
          ))
        )}

        <Button label="Add payout account" icon="plus" onPress={() => router.push('/payment/new')} style={{ marginTop: 4 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surface },
  note: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, backgroundColor: colors.primary50, borderRadius: radius.lg, padding: 14 },
  icon: { width: 42, height: 42, borderRadius: radius.md, backgroundColor: colors.primary50, alignItems: 'center', justifyContent: 'center' },
  badge: { backgroundColor: colors.primary50, borderRadius: 5, paddingHorizontal: 6, paddingVertical: 1 },
  trash: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.errorBg, alignItems: 'center', justifyContent: 'center' },
});
