import { Linking, Platform } from 'react-native';
import { alertT } from '../i18n';

/**
 * Hand a destination to the phone's own navigation app.
 *
 * Turn-by-turn belongs to Google/Apple Maps — they have the voice guidance,
 * live traffic and re-routing that a Leaflet view cannot provide. The in-app
 * map stays for "where is my cleaner right now"; this is for actually driving.
 */
export async function openNavigation(dest: { lat: number; lng: number }, label?: string) {
  const { lat, lng } = dest;
  const name = encodeURIComponent(label || 'Destination');

  // Native scheme first (launches straight into guidance), then the web URL,
  // which works everywhere including the browser build.
  const candidates = Platform.select({
    android: [`google.navigation:q=${lat},${lng}&mode=d`, `geo:${lat},${lng}?q=${lat},${lng}(${name})`],
    ios: [`comgooglemaps://?daddr=${lat},${lng}&directionsmode=driving`, `maps://?daddr=${lat},${lng}&dirflg=d`],
    default: [] as string[],
  }) ?? [];

  const web = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=driving`;

  for (const url of candidates) {
    try {
      if (await Linking.canOpenURL(url)) { await Linking.openURL(url); return; }
    } catch { /* try the next one */ }
  }
  try {
    await Linking.openURL(web);
  } catch {
    alertT('Could not open maps', 'No navigation app is available on this device.');
  }
}
