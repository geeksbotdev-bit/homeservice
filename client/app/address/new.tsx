import { useEffect, useRef, useState } from 'react';
import { View, StyleSheet, ScrollView, TextInput, Pressable, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { Text, Button, NavBar } from '../../src/components';
import { colors, radius } from '../../src/theme/theme';
import { user as userApi } from '../../src/services/api';

const LABELS = ['Home', 'Office', 'Other'];

interface Place { display_name: string; lat: string; lon: string; address?: Record<string, string> }

export default function NewAddress() {
  const router = useRouter();
  const [label, setLabel] = useState('Home');
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Place[]>([]);
  const [searching, setSearching] = useState(false);
  const [line1, setLine1] = useState('');
  const [area, setArea] = useState('');
  const [isDefault, setIsDefault] = useState(false);
  const [saving, setSaving] = useState(false);
  const [locating, setLocating] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const valid = line1.trim().length > 2 && area.trim().length > 2;

  // Debounced place search (OpenStreetMap Nominatim — free, no key, PK only).
  useEffect(() => {
    if (query.trim().length < 3) { setResults([]); return; }
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      setSearching(true);
      try {
        const r = await fetch(
          `https://nominatim.openstreetmap.org/search?format=jsonv2&countrycodes=pk&addressdetails=1&limit=6&q=${encodeURIComponent(query)}`,
          { headers: { 'Accept': 'application/json', 'User-Agent': 'HomeServiceApp/1.0' } },
        );
        const j = await r.json();
        setResults(Array.isArray(j) ? j : []);
      } catch { setResults([]); }
      setSearching(false);
    }, 450);
    return () => { if (timer.current) clearTimeout(timer.current); };
  }, [query]);

  function pick(r: Place) {
    const a = r.address || {};
    const l1 = [a.house_number, a.road || a.neighbourhood || a.suburb].filter(Boolean).join(' ') || r.display_name.split(',')[0];
    const ar = [a.suburb || a.neighbourhood || a.town, a.city || a.state].filter(Boolean).join(', ') || r.display_name.split(',').slice(1, 3).join(',').trim();
    setLine1(l1);
    setArea(ar);
    setQuery(r.display_name.split(',').slice(0, 3).join(', '));
    setResults([]);
  }

  async function useCurrent() {
    if (locating) return;
    setLocating(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        try {
          const geo = await Location.reverseGeocodeAsync({ latitude: pos.coords.latitude, longitude: pos.coords.longitude });
          const g = geo[0];
          if (g) { setLine1([g.name || g.street, g.district].filter(Boolean).join(', ')); setArea([g.subregion || g.district, g.city].filter(Boolean).join(', ')); }
        } catch {
          const r = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&addressdetails=1&lat=${pos.coords.latitude}&lon=${pos.coords.longitude}`, { headers: { 'User-Agent': 'HomeServiceApp/1.0' } });
          const j = await r.json(); const a = j.address || {};
          setLine1([a.house_number, a.road || a.neighbourhood].filter(Boolean).join(' ') || (j.display_name || '').split(',')[0]);
          setArea([a.suburb || a.neighbourhood, a.city || a.state].filter(Boolean).join(', '));
        }
        setQuery('');
      }
    } catch { /* ignore */ }
    setLocating(false);
  }

  async function save() {
    if (!valid) return;
    setSaving(true);
    await userApi.addAddress({ label, line1: line1.trim(), area: area.trim(), isDefault });
    setSaving(false);
    (router.canGoBack() ? router.back() : router.replace('/(tabs)/profile'));
  }

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <NavBar title="Add Address" />
      <ScrollView contentContainerStyle={{ padding: 20, gap: 18 }} keyboardShouldPersistTaps="handled">
        {/* Searchable place field (Yango-style autocomplete) */}
        <Field label="Search your location">
          <View style={styles.searchBox}>
            <Feather name="search" size={17} color={colors.textDisabled} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search area, street, landmark…"
              placeholderTextColor={colors.textDisabled}
              value={query}
              onChangeText={setQuery}
              autoFocus
            />
            {searching ? <ActivityIndicator size="small" color={colors.primary} /> :
              query.length > 0 && <Pressable onPress={() => { setQuery(''); setResults([]); }} hitSlop={8}><Feather name="x" size={16} color={colors.textDisabled} /></Pressable>}
          </View>

          {results.length > 0 && (
            <View style={styles.results}>
              {results.map((r, i) => (
                <Pressable key={i} onPress={() => pick(r)} style={[styles.resultRow, i < results.length - 1 && styles.resultDivider]}>
                  <Feather name="map-pin" size={15} color={colors.primary} style={{ marginTop: 2 }} />
                  <View style={{ flex: 1 }}>
                    <Text weight="semibold" style={{ fontSize: 13.5 }} numberOfLines={1}>{r.display_name.split(',')[0]}</Text>
                    <Text variant="bodySm" color={colors.textTertiary} numberOfLines={1}>{r.display_name.split(',').slice(1, 4).join(', ').trim()}</Text>
                  </View>
                </Pressable>
              ))}
            </View>
          )}

          <Pressable onPress={useCurrent} disabled={locating} style={styles.currentRow}>
            {locating ? <ActivityIndicator size="small" color={colors.primary} /> : <Feather name="navigation" size={15} color={colors.primary} />}
            <Text weight="semibold" color={colors.primary} style={{ fontSize: 13 }}>{locating ? 'Detecting…' : 'Use my current location'}</Text>
          </Pressable>
        </Field>

        <Field label="Label">
          <View style={styles.chips}>
            {LABELS.map((l) => (
              <Pressable key={l} onPress={() => setLabel(l)} style={[styles.chip, label === l && styles.chipOn]}>
                <Text weight="semibold" color={label === l ? colors.white : colors.textSecondary} style={{ fontSize: 13 }}>{l}</Text>
              </Pressable>
            ))}
          </View>
        </Field>

        <Field label="Street address">
          <TextInput style={styles.input} placeholder="House 42, Street 7, Block D" placeholderTextColor={colors.textDisabled} value={line1} onChangeText={setLine1} />
        </Field>

        <Field label="Area / City">
          <TextInput style={styles.input} placeholder="DHA Phase 5, Lahore" placeholderTextColor={colors.textDisabled} value={area} onChangeText={setArea} />
        </Field>

        <Pressable style={styles.checkRow} onPress={() => setIsDefault((v) => !v)}>
          <View style={[styles.checkbox, isDefault && styles.checkboxOn]}>
            {isDefault && <Feather name="check" size={13} color={colors.white} />}
          </View>
          <Text color={colors.textSecondary}>Set as default address</Text>
        </Pressable>

        <Button label="Save Address" icon="map-pin" onPress={save} disabled={!valid} loading={saving} loadingLabel="Saving..." style={{ marginTop: 8 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View>
      <Text variant="bodySm" weight="semibold" color={colors.textSecondary} style={{ marginBottom: 8 }}>{label}</Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.white },
  searchBox: { flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1.5, borderColor: colors.primary, borderRadius: radius.lg, height: 52, paddingHorizontal: 14, backgroundColor: colors.primary50 },
  searchInput: { flex: 1, fontSize: 15, fontFamily: 'PlusJakartaSans_500Medium', color: colors.textPrimary },
  results: { marginTop: 8, borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg, overflow: 'hidden' },
  resultRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, padding: 12 },
  resultDivider: { borderBottomWidth: 1, borderBottomColor: colors.surface },
  currentRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10 },
  chips: { flexDirection: 'row', gap: 10 },
  chip: { paddingVertical: 9, paddingHorizontal: 18, borderRadius: radius.pill, borderWidth: 1.5, borderColor: colors.border },
  chipOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  input: { borderWidth: 1.5, borderColor: colors.border, borderRadius: radius.lg, height: 52, paddingHorizontal: 16, fontSize: 15, fontFamily: 'PlusJakartaSans_500Medium', color: colors.textPrimary },
  checkRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  checkbox: { width: 24, height: 24, borderRadius: 7, borderWidth: 2, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  checkboxOn: { backgroundColor: colors.primary, borderColor: colors.primary },
});
