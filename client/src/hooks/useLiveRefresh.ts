import { useCallback, useEffect, useRef } from 'react';
import { AppState } from 'react-native';
import { useFocusEffect } from 'expo-router';

/**
 * Keep a screen's data current while the user is actually looking at it.
 *
 * Without this a screen only loads when you navigate to it, so a booking that
 * was accepted, a cleaner who set off, or a message that arrived while the
 * screen sat open would not show until you left and came back.
 *
 * It polls only while the screen is focused AND the app is in the foreground —
 * a background timer would burn battery and data for updates nobody is reading.
 * There is no websocket here: the API is plain REST on serverless, where a
 * held-open socket is not something we can rely on.
 */
export function useLiveRefresh(load: () => void | Promise<void>, everyMs = 8000) {
  // Kept in a ref so a caller that rebuilds `load` each render does not restart
  // the timer on every tick.
  const fn = useRef(load);
  fn.current = load;

  const run = useCallback(() => { void fn.current(); }, []);

  useFocusEffect(
    useCallback(() => {
      run();
      let timer: ReturnType<typeof setInterval> | null = setInterval(() => {
        if (AppState.currentState === 'active') run();
      }, everyMs);

      // Coming back from the background should refresh at once, not after a
      // full interval — that gap is what makes an app feel stale.
      const sub = AppState.addEventListener('change', (s) => { if (s === 'active') run(); });

      return () => {
        if (timer) { clearInterval(timer); timer = null; }
        sub.remove();
      };
    }, [run, everyMs]),
  );
}

/** Same idea for a screen that is always mounted (no focus events). */
export function usePoll(load: () => void | Promise<void>, everyMs = 8000) {
  const fn = useRef(load);
  fn.current = load;
  useEffect(() => {
    const t = setInterval(() => { if (AppState.currentState === 'active') void fn.current(); }, everyMs);
    return () => clearInterval(t);
  }, [everyMs]);
}
