import * as Location from 'expo-location';

/**
 * Turn the device's GPS fix into a human address.
 *
 * Reverse geocoding goes through expo-location first (native, no network key)
 * and falls back to OpenStreetMap, which is what web has to use. Either way the
 * result is a short "Area, City" label — the shape the rest of the app stores.
 */

export interface Fix {
  label: string;
  lat: number;
  lng: number;
}

/** Why a detect attempt produced nothing, so callers can word their own UI. */
export type GeoFailure = 'denied' | 'unavailable';

export class GeoError extends Error {
  constructor(public reason: GeoFailure, message: string) {
    super(message);
    this.name = 'GeoError';
  }
}

async function reverseGeocode(lat: number, lng: number): Promise<string> {
  try {
    const [g] = await Location.reverseGeocodeAsync({ latitude: lat, longitude: lng });
    if (g) {
      const label = [g.name || g.street, g.district || g.subregion, g.city].filter(Boolean).join(', ');
      if (label) return label;
    }
  } catch { /* not implemented on web — fall through */ }

  try {
    const r = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=jsonv2&addressdetails=1&lat=${lat}&lon=${lng}`,
      { headers: { 'User-Agent': 'WithUroojApp/1.0' } },
    );
    const j = await r.json();
    const a = j.address || {};
    return [a.suburb || a.neighbourhood || a.road, a.city || a.town || a.state].filter(Boolean).join(', ')
      || String(j.display_name || '').split(',').slice(0, 3).join(', ').trim();
  } catch { /* offline */ }

  return '';
}

/**
 * Ask for permission (if not already granted) and resolve the current place.
 * Throws a GeoError the caller can branch on rather than returning null, so a
 * refusal is never mistaken for "nowhere".
 */
export async function detectCurrentLocation(): Promise<Fix> {
  let status: string;
  try {
    ({ status } = await Location.requestForegroundPermissionsAsync());
  } catch {
    throw new GeoError('unavailable', 'Location services are not available on this device.');
  }
  if (status !== 'granted') {
    throw new GeoError('denied', 'Location permission was not granted.');
  }

  let pos;
  try {
    pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
  } catch (e: any) {
    const denied = String(e?.message ?? '').toLowerCase().includes('denied');
    throw new GeoError(denied ? 'denied' : 'unavailable', e?.message || 'Could not read your location.');
  }

  const { latitude: lat, longitude: lng } = pos.coords;
  const label = (await reverseGeocode(lat, lng)) || 'Current location';
  return { label, lat, lng };
}

/** True when permission is already granted, so we can skip an unprompted ask. */
export async function hasLocationPermission(): Promise<boolean> {
  try {
    const { status } = await Location.getForegroundPermissionsAsync();
    return status === 'granted';
  } catch { return false; }
}
