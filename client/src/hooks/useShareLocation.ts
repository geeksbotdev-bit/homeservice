import { useEffect, useState } from 'react';
import * as Location from 'expo-location';
import { bookings as bookingsApi } from '../services/api';

/**
 * While `active`, asks for location permission once, then every few seconds
 * reads the device GPS and pushes it to the booking (server stores it as the
 * customer's or cleaner's point by role). Returns the last known coordinate.
 */
export function useShareLocation(bookingId?: string, active = true, intervalMs = 6000) {
  const [mine, setMine] = useState<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    if (!bookingId || !active) return;
    let stopped = false;
    let timer: ReturnType<typeof setTimeout> | null = null;

    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted' || stopped) return;
        const tick = async () => {
          try {
            const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
            if (stopped) return;
            const p = { lat: pos.coords.latitude, lng: pos.coords.longitude };
            setMine(p);
            bookingsApi.shareLocation(bookingId, p.lat, p.lng).catch(() => {});
          } catch { /* ignore a single failed fix */ }
          if (!stopped) timer = setTimeout(tick, intervalMs);
        };
        tick();
      } catch { /* permission/location unavailable */ }
    })();

    return () => { stopped = true; if (timer) clearTimeout(timer); };
  }, [bookingId, active, intervalMs]);

  return mine;
}
