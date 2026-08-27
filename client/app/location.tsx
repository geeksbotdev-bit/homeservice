import { useEffect, useRef, useState } from 'react';
import { View, StyleSheet, ScrollView, Pressable, TextInput, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { Text, NavBar } from '../src/components';
import { colors, radius } from '../src/theme/theme';
import { user as userApi } from '../src/services/api';
import type { User } from '../src/data/types';

// Popular areas across major Pakistani cities.
const PK_AREAS: { city: string; areas: string[] }[] = [
  { city: 'Lahore', areas: ['DHA Phase 5', 'DHA Phase 6', 'Gulberg III', 'Bahria Town', 'Johar Town', 'Model Town', 'Cantt', 'Wapda Town', 'Faisal Town'] },
  { city: 'Karachi', areas: ['Clifton', 'DHA Phase 6', 'Gulshan-e-Iqbal', 'Bahadurabad', 'PECHS', 'North Nazimabad', 'Malir', 'Korangi'] },
  { city: 'Islamabad', areas: ['F-6', 'F-7', 'F-8', 'F-10', 'F-11', 'G-11', 'G-13', 'E-11', 'Bahria Town'] },
  { city: 'Rawalpindi', areas: ['Bahria Town', 'Saddar', 'Satellite Town', 'Chaklala Scheme 3', 'Gulraiz'] },
  { city: 'Faisalabad', areas: ['Madina Town', 'Peoples Colony', 'Jaranwala Road', 'Civil Lines'] },
  { city: 'Multan', areas: ['Cantt', 'Gulgasht Colony', 'Shah Rukn-e-Alam', 'Bosan Road'] },
  { city: 'Peshawar', areas: ['Hayatabad', 'University Town', 'Cantt'] },
  { city: 'Quetta', areas: ['Cantt', 'Jinnah Town', 'Satellite Town'] },
];

// Flattened "Area, City" options.
const ALL_OPTIONS = PK_AREAS.flatMap((c) => c.areas.map((a) => `${a}, ${c.city}`));

interface Place { display_name: string; lat: string; lon: string; address?: Record<string, string> }

export default function LocationPicker() {
  const router = useRouter();
  const [me, setMe] = useState<User | null>(null);
  const [q, setQ] = useState('');
  const [busy, setBusy] = useState(false);
  const [locating, setLocating] = useState(false);
  const [locErr, setLocErr] = useState<string | null>(null);
  const [results, setResults] = useState<Place[]>([]);
  const [searching, setSearching] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => { userApi.me().then(setMe); }, []);

  // Live place search (OpenStreetMap Nominatim, Pakistan) — debounced dropdown.
  useEffect(() => {
    if (q.trim().length < 3) { setResults([]); setSearching(false); return; }
    if (timer.current) clearTimeout(timer.current);
    setSearching(true);
    timer.current = setTimeout(async () => {
      try {
        const r = await fetch(
          `https://nominatim.openstreetmap.org/search?format=jsonv2&countrycodes=pk&addressdetails=1&limit=7&q=${encodeURIComponent(q)}`,
          { headers: { 'Accept': 'application/json', 'User-Agent': 'HomeServiceApp/1.0' } },
        );
        const j = await r.json();
        setResults(Array.isArray(j) ? j : []);
      } catch { setResults([]); }
      setSearching(false);
    }, 450);
    return () => { if (timer.current) clearTimeout(timer.current); };
  }, [q]);

  function placeLabel(r: Place): string {
    const a = r.address || {};
    const parts = [a.road || a.neighbourhood || a.suburb, a.suburb || a.town, a.city || a.state].filter(Boolean);
    return (parts.length ? parts.join(', ') : r.display_name.split(',').slice(0, 3).join(', ')).trim();
  }

  // Detect the device's current location and reverse-geocode it to an address.
  async function useCurrentLocation() {
    if (locating) return;
    setLocErr(null);
    setLocating(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setLocErr('Location permission denied. Please allow access or pick an area below.');
        setLocating(false);
        return;
      }
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      let label = '';
      try {
        const geo = await Location.reverseGeocodeAsync({ latitude: pos.coords.latitude, longitude: pos.coords.longitude });
        const g = geo[0];
        if (g) label = [g.name || g.street, g.district || g.subregion, g.city].filter(Boolean).join(', ');
      } catch { /* reverse geocode not available (e.g. web) */ }
      if (!label) label = `Current location (${pos.coords.latitude.toFixed(4)}, ${pos.coords.longitude.toFixed(4)})`;
      await userApi.update({ location: label });
      setLocating(false);
      (router.canGoBack() ? router.back() : router.replace('/(tabs)'));
    } catch (e: any) {
      setLocErr(e?.message?.includes('denied') ? 'Location access is blocked in your browser/phone settings.' : 'Could not get your location. Please pick an area below.');
      setLocating(false);
    }
  }

  async function choose(area: string) {
    if (busy) return;
    setBusy(true);
    await userApi.update({ location: area });
    setBusy(false);
    (router.canGoBack() ? router.back() : router.replace('/(tabs)'));
  }

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <NavBar title="Choose Location" />

      {/* Search */}
      <View style={styles.searchWrap}>
        <View style={styles.search}>
          <Feather name="search" size={17} color={colors.textDisabled} />
          <TextInput
            style={styles.input}
            placeholder="Search area, street or landmark…"
            placeholderTextColor={colors.textDisabled}
            value={q}
            onChangeText={setQ}
            autoFocus
          />
          {q.length > 0 && (
            <Pressable onPress={() => setQ('')} hitSlop={8}><Feather name="x" size={16} color={colors.textDisabled} /></Pressable>
          )}
        </View>

        {/* Use current location */}
        <Pressable onPress={useCurrentLocation} disabled={locating} style={styles.current}>
          <View style={styles.currentIcon}>
            {locating ? <ActivityIndicator color={colors.white} size="small" /> : <Feather name="navigation" size={16} color={colors.white} />}
          </View>
          <View style={{ flex: 1 }}>
            <Text weight="bold" color={colors.primary} style={{ fontSize: 14 }}>{locating ? 'Detecting your location…' : 'Use my current location'}</Text>
            <Text variant="bodySm" color={colors.textTertiary}>Fastest — we'll detect where you are</Text>
          </View>
          <Feather name="chevron-right" size={18} color={colors.primary} />
        </Pressable>

        {/* Pin on an interactive map */}
        <Pressable onPress={() => router.push('/map-pick')} style={styles.pinRow}>
          <View style={styles.pinIcon}><Feather name="map" size={16} color={colors.primary} /></View>
          <View style={{ flex: 1 }}>
            <Text weight="bold" style={{ fontSize: 14 }}>Set location on map</Text>
            <Text variant="bodySm" color={colors.textTertiary}>Drag the pin on a real map</Text>
          </View>
          <Feather name="chevron-right" size={18} color={colors.textDisabled} />
        </Pressable>
        {locErr && (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8 }}>
            <Feather name="alert-circle" size={13} color={colors.error} />
            <Text variant="bodySm" color={colors.error} style={{ flex: 1 }}>{locErr}</Text>
          </View>
        )}
      </View>

      {!me ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
      ) : (
        <ScrollView contentContainerStyle={{ padding: 20, paddingTop: 6, gap: 8 }} keyboardShouldPersistTaps="handled">
          {q.trim().length >= 3 ? (
            /* ── Live search results (dropdown) ── */
            <>
              <Text variant="bodySm" weight="semibold" color={colors.textTertiary} style={styles.sectionLbl}>SEARCH RESULTS</Text>
              {searching ? (
                <ActivityIndicator color={colors.primary} style={{ paddingVertical: 24 }} />
              ) : results.length === 0 ? (
                <View style={{ alignItems: 'center', paddingVertical: 30, gap: 8 }}>
                  <Feather name="map-pin" size={28} color={colors.border} />
                  <Text color={colors.textDisabled}>No places match “{q}”</Text>
                </View>
              ) : (
                results.map((r, i) => (
                  <Pressable key={i} onPress={() => choose(placeLabel(r))} style={styles.row}>
                    <View style={styles.icon}><Feather name="map-pin" size={16} color={colors.primary} /></View>
                    <View style={{ flex: 1 }}>
                      <Text weight="semibold" style={{ fontSize: 14 }} numberOfLines={1}>{r.display_name.split(',')[0]}</Text>
                      <Text variant="bodySm" color={colors.textTertiary} numberOfLines={1}>{r.display_name.split(',').slice(1, 4).join(', ').trim()}</Text>
                    </View>
                  </Pressable>
                ))
              )}
            </>
          ) : (
            /* ── Idle: saved addresses + popular quick-picks ── */
            <>
              {me.addresses.length > 0 && (
                <>
                  <Text variant="bodySm" weight="semibold" color={colors.textTertiary} style={styles.sectionLbl}>SAVED ADDRESSES</Text>
                  {me.addresses.map((a) => (
                    <Pressable key={a.id} onPress={() => choose(a.area)} style={[styles.row, me.location === a.area && styles.rowOn]}>
                      <View style={styles.icon}><Feather name="home" size={16} color={colors.primary} /></View>
                      <View style={{ flex: 1 }}>
                        <Text weight="semibold" style={{ fontSize: 14 }}>{a.label} · {a.area}</Text>
                        <Text variant="bodySm" color={colors.textTertiary}>{a.line1}</Text>
                      </View>
                      {me.location === a.area && <Feather name="check-circle" size={20} color={colors.primary} />}
                    </Pressable>
                  ))}
                </>
              )}
              <Text variant="bodySm" weight="semibold" color={colors.textTertiary} style={styles.sectionLbl}>POPULAR AREAS</Text>
              {ALL_OPTIONS.map((opt) => {
                const selected = me.location === opt;
                return (
                  <Pressable key={opt} onPress={() => choose(opt)} style={[styles.row, selected && styles.rowOn]}>
                    <View style={styles.icon}><Feather name="map-pin" size={16} color={colors.primary} /></View>
                    <Text weight="semibold" style={{ flex: 1, fontSize: 14 }}>{opt}</Text>
                    {selected && <Feather name="check-circle" size={20} color={colors.primary} />}
                  </Pressable>
                );
              })}
            </>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.white },
  searchWrap: { paddingHorizontal: 20, paddingTop: 6, paddingBottom: 8 },
  search: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: colors.surface, borderRadius: radius.lg, height: 48, paddingHorizontal: 14 },
  current: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 10, borderWidth: 1.5, borderColor: colors.primary, backgroundColor: colors.primary50, borderRadius: radius.lg, padding: 12 },
  currentIcon: { width: 38, height: 38, borderRadius: 19, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  pinRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 8, borderWidth: 1.5, borderColor: colors.border, borderRadius: radius.lg, padding: 12 },
  pinIcon: { width: 38, height: 38, borderRadius: radius.md, backgroundColor: colors.primary50, alignItems: 'center', justifyContent: 'center' },
  input: { flex: 1, fontFamily: 'PlusJakartaSans_500Medium', fontSize: 14, color: colors.textPrimary },
  sectionLbl: { letterSpacing: 0.5, marginTop: 8, marginBottom: 2 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1.5, borderColor: colors.border, borderRadius: radius.lg, padding: 13 },
  rowOn: { borderColor: colors.primary, backgroundColor: colors.primary50 },
  icon: { width: 38, height: 38, borderRadius: radius.md, backgroundColor: colors.primary50, alignItems: 'center', justifyContent: 'center' },
});
