import { useCallback, useEffect, useMemo, useState } from 'react';
import { View, StyleSheet, ScrollView, Pressable, ActivityIndicator, TextInput, RefreshControl } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather, FontAwesome } from '@expo/vector-icons';
import { Text, ServiceIcon } from '../../src/components';
import { colors, radius, spacing, shadow } from '../../src/theme/theme';
import { services as servicesApi, user as userApi, notifications as notifApi } from '../../src/services/api';
import { formatPKR } from '../../src/utils';
import { useBooking } from '../../src/store/booking';
import type { Service, User } from '../../src/data/types';

export default function Home() {
  const router = useRouter();
  const { startBooking, setMode } = useBooking();
  const [mode, setLocalMode] = useState<'now' | 'later'>('now');
  const [list, setList] = useState<Service[]>([]);
  const [me, setMe] = useState<User | null>(null);
  const [query, setQuery] = useState('');
  const [unread, setUnread] = useState(0);
  const [cat, setCat] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const greeting = useMemo(() => {
    const h = new Date().getHours();
    return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
  }, []);

  const loadServices = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true); else setLoading(true);
    setError(false);
    try {
      setList(await servicesApi.list());
    } catch {
      setError(true);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const cats = useMemo(() => Array.from(new Set(list.map((s) => s.category))), [list]);
  const shown = useMemo(
    () => list.filter((s) => {
      const matchesQuery = `${s.name} ${s.tagline} ${s.category}`.toLowerCase().includes(query.trim().toLowerCase());
      return matchesQuery && (!cat || s.category === cat);
    }),
    [list, query, cat],
  );

  function cycleFilter() {
    const opts: (string | null)[] = [null, ...cats];
    setCat(opts[(opts.indexOf(cat) + 1) % opts.length]);
  }
  function clearFilters() {
    setCat(null);
    setQuery('');
  }
  function seeAll() {
    router.push('/all-services');
  }

  useEffect(() => { loadServices(); }, [loadServices]);
  // Refresh user + unread count whenever Home regains focus (location/profile edits).
  useFocusEffect(useCallback(() => {
    userApi.me().then(setMe).catch(() => {});
    notifApi.list().then((r) => setUnread(r.unread)).catch(() => {});
  }, []));

  function openService(s: Service) {
    startBooking(s, mode);
    setMode(mode);
    router.push(`/service/${s.id}`);
  }

  return (
    <View style={styles.root}>
      {/* Teal header */}
      <SafeAreaView edges={['top']} style={styles.header}>
        <View style={styles.greetRow}>
          <View>
            <Text color="rgba(255,255,255,0.65)" style={{ fontSize: 13 }}>{greeting},</Text>
            <Text weight="extrabold" color={colors.white} style={{ fontSize: 21, letterSpacing: -0.4 }}>
              {me?.name ?? 'Welcome'} 👋
            </Text>
          </View>
          <Pressable style={styles.bell} onPress={() => router.push('/notifications')}>
            <Feather name="bell" size={20} color={colors.white} />
            {unread > 0 && <View style={styles.bellDot} />}
          </Pressable>
        </View>

        <Pressable style={styles.location} onPress={() => router.push('/location')}>
          <Feather name="map-pin" size={15} color={colors.white} />
          <Text weight="semibold" color={colors.white} style={{ flex: 1, fontSize: 13 }}>{me?.location ?? 'Set location'}</Text>
          <Feather name="chevron-down" size={14} color="rgba(255,255,255,0.7)" />
        </Pressable>
      </SafeAreaView>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 20, paddingBottom: 24 }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadServices(true)} tintColor={colors.primary} colors={[colors.primary]} />}
      >
        {/* Search */}
        <View style={styles.search}>
          <Feather name="search" size={17} color={colors.textDisabled} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search services..."
            placeholderTextColor={colors.textDisabled}
            value={query}
            onChangeText={setQuery}
            returnKeyType="search"
          />
          {query.length > 0 && (
            <Pressable onPress={() => setQuery('')} hitSlop={8}>
              <Feather name="x" size={16} color={colors.textDisabled} />
            </Pressable>
          )}
          <Pressable style={[styles.filterBtn, cat && styles.filterBtnOn]} onPress={cycleFilter}>
            <Feather name="sliders" size={14} color={cat ? colors.white : colors.primary} />
          </Pressable>
        </View>

        {cat && (
          <View style={styles.activeFilter}>
            <Text variant="bodySm" weight="semibold" color={colors.primary700}>Category: {cat}</Text>
            <Pressable onPress={() => setCat(null)} hitSlop={8}>
              <Feather name="x" size={14} color={colors.primary700} />
            </Pressable>
          </View>
        )}

        {/* Book Now / Schedule toggle */}
        <View style={styles.toggle}>
          <Pressable onPress={() => setLocalMode('now')} style={[styles.toggleItem, mode === 'now' && styles.toggleActive]}>
            <Feather name="zap" size={14} color={mode === 'now' ? colors.white : colors.textTertiary} />
            <Text weight="bold" color={mode === 'now' ? colors.white : colors.textTertiary} style={{ fontSize: 13 }}>Book Now</Text>
          </Pressable>
          <Pressable onPress={() => setLocalMode('later')} style={[styles.toggleItem, mode === 'later' && styles.toggleActive]}>
            <Feather name="calendar" size={14} color={mode === 'later' ? colors.white : colors.textTertiary} />
            <Text weight="bold" color={mode === 'later' ? colors.white : colors.textTertiary} style={{ fontSize: 13 }}>Schedule Later</Text>
          </Pressable>
        </View>

        {/* Section header */}
        <View style={styles.sectionHead}>
          <Text variant="h2" style={{ fontSize: 17 }}>Our Services</Text>
          <Pressable onPress={seeAll} hitSlop={8}>
            <Text weight="semibold" color={colors.primary} style={{ fontSize: 13 }}>See all</Text>
          </Pressable>
        </View>

        {loading && list.length === 0 ? (
          <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
        ) : error ? (
          <View style={{ alignItems: 'center', paddingVertical: 36, gap: 12 }}>
            <Feather name="wifi-off" size={32} color={colors.textDisabled} />
            <Text color={colors.textTertiary} center>Couldn't load services.{'\n'}Check your connection.</Text>
            <Pressable style={styles.retryBtn} onPress={() => loadServices()}>
              <Feather name="refresh-cw" size={14} color={colors.white} />
              <Text weight="bold" color={colors.white} style={{ fontSize: 13 }}>Retry</Text>
            </Pressable>
          </View>
        ) : shown.length === 0 ? (
          <View style={{ alignItems: 'center', paddingVertical: 40, gap: 10 }}>
            <Feather name="search" size={32} color={colors.border} />
            <Text color={colors.textDisabled} center>
              {query || cat ? `No services match ${query ? `“${query}”` : `“${cat}”`}` : 'No services available yet.'}
            </Text>
            {(query || cat) && (
              <Pressable onPress={clearFilters} hitSlop={8}><Text weight="semibold" color={colors.primary}>Clear filters</Text></Pressable>
            )}
          </View>
        ) : (
          <View style={{ gap: 12 }}>
            {shown.map((s) => (
              <Pressable key={s.id} style={styles.card} onPress={() => openService(s)}>
                <ServiceIcon icon={s.icon as any} gradient={s.gradient} />
                <View style={{ flex: 1, minWidth: 0, justifyContent: 'space-between', minHeight: 92, gap: 6 }}>
                  <View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      <Text weight="bold" style={{ fontSize: 15, flexShrink: 1 }} numberOfLines={1}>{s.name}</Text>
                      <View style={[styles.tag, { backgroundColor: s.categoryBg, flexShrink: 0 }]}>
                        <Text weight="bold" color={s.categoryColor} style={{ fontSize: 10 }}>{s.category}</Text>
                      </View>
                    </View>
                    <Text variant="bodySm" color={colors.textTertiary} style={{ marginBottom: 6 }}>{s.tagline}</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                      <FontAwesome name="star" size={11} color={colors.accent} />
                      <Text variant="bodySm" weight="semibold" color={colors.textSecondary}>{s.rating}</Text>
                      <Text variant="bodySm" color={colors.textDisabled}>({s.reviews})</Text>
                      <Text color={colors.border}> · </Text>
                      <Text variant="bodySm" color={colors.textDisabled}>{s.duration}</Text>
                    </View>
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                    <View>
                      <Text weight="extrabold" color={colors.primary} style={{ fontSize: 18 }}>{formatPKR(s.basePrice)}</Text>
                      <Text style={{ fontSize: 10 }} color={colors.textDisabled}>Supplies included</Text>
                    </View>
                    <View style={styles.plus}>
                      <Feather name="plus" size={18} color={colors.white} />
                    </View>
                  </View>
                </View>
              </Pressable>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surface },
  header: { backgroundColor: colors.primary, paddingHorizontal: 20, paddingBottom: 18 },
  greetRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14, marginTop: 6 },
  bell: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.14)', alignItems: 'center', justifyContent: 'center' },
  bellDot: { position: 'absolute', top: 8, right: 8, width: 9, height: 9, borderRadius: 5, backgroundColor: colors.accent, borderWidth: 2, borderColor: colors.primary },
  location: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: 'rgba(255,255,255,0.14)', borderRadius: radius.lg, padding: 12 },
  search: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: colors.white, borderRadius: radius.lg, height: 50, paddingHorizontal: 16, marginBottom: 14, ...shadow.soft },
  searchInput: { flex: 1, fontFamily: 'PlusJakartaSans_400Regular', fontSize: 14, color: colors.textPrimary },
  filterBtn: { width: 32, height: 32, backgroundColor: colors.primary50, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  filterBtnOn: { backgroundColor: colors.primary },
  activeFilter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: colors.primary50, borderRadius: radius.md, paddingVertical: 8, paddingHorizontal: 12, marginBottom: 14, marginTop: -2 },
  toggle: { backgroundColor: colors.border, borderRadius: radius.lg, padding: 3, flexDirection: 'row', marginBottom: 20 },
  toggleItem: { flex: 1, height: 40, borderRadius: 11, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  toggleActive: { backgroundColor: colors.primary },
  sectionHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  card: { backgroundColor: colors.white, borderRadius: 18, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 14, ...shadow.card },
  tag: { paddingVertical: 2, paddingHorizontal: 8, borderRadius: 6 },
  plus: { width: 38, height: 38, backgroundColor: colors.primary, borderRadius: radius.lg, alignItems: 'center', justifyContent: 'center', ...shadow.button },
  retryBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.primary, borderRadius: radius.md, paddingVertical: 10, paddingHorizontal: 20 },
});

