import { useEffect } from 'react';
import * as Location from 'expo-location';
import { pro } from '../services/api';

/**
 * While a cleaner has the app open, push their live GPS to the server so the
 * customer's "cleaners nearby" map can plot them at their real position.
 * Pushes once immediately, then follows real movement.
 */
export function useProLocation() {
  useEffect(() => {
    let sub: Location.LocationSubscription | null = null;
    let poll: ReturnType<typeof setInterval> | null = null;
    let alive = true;

    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted' || !alive) return;

        const push = (lat: number, lng: number) => { pro.pushLocation(lat, lng).catch(() => {}); };

        const first = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        if (!alive) return;
        push(first.coords.latitude, first.coords.longitude);

        // Follow movement…
        sub = await Location.watchPositionAsync(
          { accuracy: Location.Accuracy.Balanced, timeInterval: 10000, distanceInterval: 20 },
          (pos) => push(pos.coords.latitude, pos.coords.longitude),
        );

        // …and refresh at least every 60s so the server keeps us "live" even
        // when the cleaner is standing still.
        poll = setInterval(async () => {
          try {
            const p = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
            push(p.coords.latitude, p.coords.longitude);
          } catch { /* ignore */ }
        }, 60000);
      } catch { /* location unavailable — skip */ }
    })();

    return () => { alive = false; sub?.remove(); if (poll) clearInterval(poll); };
  }, []);
}
