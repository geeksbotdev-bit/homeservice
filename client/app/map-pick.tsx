import { useEffect, useState } from 'react';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { Text, Button, NavBar, OsmMap } from '../src/components';
import { colors, radius, shadow } from '../src/theme/theme';
import { user as userApi } from '../src/services/api';

// Default centre: Lahore.
const DEFAULT = { lat: 31.5204, lng: 74.3587 };

export default function MapPick() {
  const router = useRouter();
  const [center, setCenter] = useState(DEFAULT);
  const [picked, setPicked] = useState(DEFAULT);
  const [address, setAddress] = useState('Move the pin to your location');
  const [resolving, setResolving] = useState(false);
  const [locating, setLocating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [mapKey, setMapKey] = useState(0); // bump to recenter the map

  // Reverse-geocode a coordinate → a human address (expo-location, else Nominatim).
  async function resolve(lat: number, lng: number) {
    setResolving(true);
    let label = '';
    try {
      const geo = await Location.reverseGeocodeAsync({ latitude: lat, longitude: lng });
      const g = geo[0];
      if (g) label = [g.name || g.street, g.district || g.subregion, g.city].filter(Boolean).join(', ');
    } catch { /* not supported on web */ }
    if (!label) {
      try {
        const r = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18`);
        const j = await r.json();
        label = j?.display_name?.split(',').slice(0, 4).join(', ') ?? '';
      } catch { /* offline */ }
    }
    setAddress(label || `Pinned location (${lat.toFixed(4)}, ${lng.toFixed(4)})`);
    setResolving(false);
  }

  useEffect(() => { resolve(DEFAULT.lat, DEFAULT.lng); }, []);

  function onPick(lat: number, lng: number) {
    setPicked({ lat, lng });
    resolve(lat, lng);
  }

  async function useCurrent() {
    if (locating) return;
    setLocating(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        const c = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setCenter(c); setPicked(c); setMapKey((k) => k + 1);
        resolve(c.lat, c.lng);
      }
    } catch { /* ignore */ }
    setLocating(false);
  }

  async function confirm() {
    setSaving(true);
    await userApi.update({ location: address }).catch(() => {});
    setSaving(false);
    (router.canGoBack() ? router.back() : router.replace('/(tabs)'));
  }

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <NavBar title="Pin your location" />

      <View style={{ flex: 1 }}>
        <OsmMap key={mapKey} latitude={center.lat} longitude={center.lng} zoom={15} interactive onPick={onPick} />

        {/* Use current location (floating) */}
        <View style={styles.floatBtn}>
          <Button label={locating ? 'Locating…' : 'Use current location'} icon="navigation" fullWidth={false} loading={locating} onPress={useCurrent} style={{ paddingHorizontal: 18, height: 44 }} />
        </View>
      </View>

      {/* Address + confirm */}
      <View style={styles.sheet}>
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10 }}>
          <Feather name="map-pin" size={18} color={colors.primary} style={{ marginTop: 2 }} />
          <View style={{ flex: 1 }}>
            <Text variant="caption" color={colors.textDisabled} style={{ letterSpacing: 1, fontSize: 9 }}>SELECTED LOCATION</Text>
            {resolving ? <ActivityIndicator color={colors.primary} size="small" style={{ alignSelf: 'flex-start', marginTop: 4 }} />
              : <Text weight="semibold" style={{ fontSize: 14, marginTop: 2 }}>{address}</Text>}
          </View>
        </View>
        <Button label="Confirm location" icon="check" onPress={confirm} loading={saving} loadingLabel="Saving…" style={{ marginTop: 14 }} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.white },
  floatBtn: { position: 'absolute', top: 14, alignSelf: 'center' },
  sheet: { padding: 20, paddingBottom: 28, backgroundColor: colors.white, borderTopLeftRadius: 24, borderTopRightRadius: 24, ...shadow.card },
});
