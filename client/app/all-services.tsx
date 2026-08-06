import { useEffect, useMemo, useState } from 'react';
import { View, StyleSheet, ScrollView, Pressable, TextInput, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather, FontAwesome } from '@expo/vector-icons';
import { Text, NavBar, ServiceIcon } from '../src/components';
import { colors, radius, shadow } from '../src/theme/theme';
import { services as servicesApi } from '../src/services/api';
import { formatPKR } from '../src/utils';
import type { Service } from '../src/data/types';

export default function AllServices() {
  const router = useRouter();
  const [list, setList] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [cat, setCat] = useState<string | null>(null);

  useEffect(() => { servicesApi.list().then(setList).catch(() => {}).finally(() => setLoading(false)); }, []);

  const cats = useMemo(() => Array.from(new Set(list.map((s) => s.category))), [list]);
  const shown = useMemo(
    () => list.filter((s) => {
      const q = `${s.name} ${s.tagline} ${s.category}`.toLowerCase().includes(query.trim().toLowerCase());
      return q && (!cat || s.category === cat);
    }),
    [list, query, cat],
  );

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <NavBar title="All Services" />

      {/* Search */}
      <View style={{ paddingHorizontal: 16, paddingBottom: 8 }}>
        <View style={styles.search}>
          <Feather name="search" size={17} color={colors.textDisabled} />
          <TextInput style={styles.input} placeholder="Search services…" placeholderTextColor={colors.textDisabled} value={query} onChangeText={setQuery} />
          {query.length > 0 && <Pressable onPress={() => setQuery('')} hitSlop={8}><Feather name="x" size={16} color={colors.textDisabled} /></Pressable>}
        </View>
        {/* Category chips */}
        {cats.length > 0 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingTop: 10 }}>
            <Chip label="All" on={!cat} onPress={() => setCat(null)} />
            {cats.map((c) => <Chip key={c} label={c} on={cat === c} onPress={() => setCat(c)} />)}
          </ScrollView>
        )}
      </View>

      {loading ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
      ) : (
        <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }} showsVerticalScrollIndicator={false}>
          {shown.length === 0 ? (
            <View style={{ alignItems: 'center', paddingVertical: 44, gap: 10 }}>
              <Feather name="search" size={30} color={colors.border} />
              <Text color={colors.textDisabled} center>No services match your search.</Text>
            </View>
          ) : shown.map((s) => (
            <Pressable key={s.id} style={styles.card} onPress={() => router.push(`/service/${s.id}`)}>
              <ServiceIcon icon={s.icon as any} gradient={s.gradient} />
              <View style={{ flex: 1, minWidth: 0, gap: 5 }}>
                <Text weight="bold" style={{ fontSize: 15 }} numberOfLines={1}>{s.name}</Text>
                <Text variant="bodySm" color={colors.textTertiary} numberOfLines={1}>{s.tagline}</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <FontAwesome name="star" size={11} color={colors.accent} />
                  <Text variant="bodySm" color={colors.textTertiary}>{s.rating} ({s.reviews}) · {s.duration}</Text>
                </View>
              </View>
              <View style={{ alignItems: 'flex-end', gap: 2 }}>
                <Text weight="extrabold" color={colors.primary} style={{ fontSize: 15 }}>{formatPKR(s.basePrice)}</Text>
                <Feather name="chevron-right" size={18} color={colors.textDisabled} />
              </View>
            </Pressable>
          ))}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

function Chip({ label, on, onPress }: { label: string; on: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={[styles.chip, on && styles.chipOn]}>
      <Text weight="semibold" color={on ? colors.white : colors.textSecondary} style={{ fontSize: 12 }}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.white },
  search: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: colors.surface, borderRadius: radius.lg, height: 48, paddingHorizontal: 14 },
  input: { flex: 1, fontFamily: 'PlusJakartaSans_500Medium', fontSize: 14, color: colors.textPrimary },
  chip: { paddingVertical: 7, paddingHorizontal: 14, borderRadius: radius.pill, borderWidth: 1.5, borderColor: colors.border },
  chipOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  card: { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: colors.white, borderRadius: radius.xl, padding: 14, borderWidth: 1, borderColor: colors.border, ...shadow.soft },
});
