import { useEffect, useState } from 'react';
import { Platform, View, StyleSheet } from 'react-native';
import { Stack, router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as SplashScreen from 'expo-splash-screen';
import {
  useFonts,
  PlusJakartaSans_300Light,
  PlusJakartaSans_400Regular,
  PlusJakartaSans_500Medium,
  PlusJakartaSans_600SemiBold,
  PlusJakartaSans_700Bold,
  PlusJakartaSans_800ExtraBold,
} from '@expo-google-fonts/plus-jakarta-sans';
import { BookingProvider } from '../src/store/booking';
import { LanguageProvider } from '../src/store/lang';
import { Toaster } from '../src/components';
import { AppTabBar } from '../src/components/AppTabBar';
import { ErrorBoundary } from '../src/components/ErrorBoundary';
import { setUnauthorizedHandler, restoreSession } from '../src/services/client';
import '../src/services/firebase'; // initializes Firebase at app startup

SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  const [loaded] = useFonts({
    PlusJakartaSans_300Light,
    PlusJakartaSans_400Regular,
    PlusJakartaSans_500Medium,
    PlusJakartaSans_600SemiBold,
    PlusJakartaSans_700Bold,
    PlusJakartaSans_800ExtraBold,
  });

  // Restore the persisted session (token + role) BEFORE routing, so a signed-in
  // user isn't briefly bounced to Welcome on native (where restore is async).
  const [sessionReady, setSessionReady] = useState(false);
  useEffect(() => { restoreSession().finally(() => setSessionReady(true)); }, []);

  const ready = loaded && sessionReady;
  useEffect(() => {
    if (ready) SplashScreen.hideAsync().catch(() => {});
  }, [ready]);

  // A 401 (expired/stale session) sends the user back to sign-in.
  useEffect(() => {
    setUnauthorizedHandler(() => router.replace('/(auth)/welcome'));
    return () => setUnauthorizedHandler(null);
  }, []);

  // Web: set the browser-tab title + a branded favicon (until the real logo).
  useEffect(() => {
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      document.title = 'uroojwithus';
      const svg = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'><rect width='64' height='64' rx='14' fill='#0B7C82'/><circle cx='50' cy='15' r='6' fill='#F39C12'/><text x='32' y='44' font-family='Arial,Helvetica,sans-serif' font-size='30' font-weight='800' fill='#ffffff' text-anchor='middle'>uw</text></svg>`;
      const href = 'data:image/svg+xml,' + encodeURIComponent(svg);
      document.querySelectorAll("link[rel~='icon']").forEach((l) => l.parentNode?.removeChild(l));
      const link = document.createElement('link');
      link.rel = 'icon';
      link.type = 'image/svg+xml';
      link.href = href;
      document.head.appendChild(link);
    }
  }, []);

  // Web: make the app fill the viewport and never scroll horizontally.
  useEffect(() => {
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      const style = document.createElement('style');
      style.textContent = `
        html, body, #root { margin: 0; height: 100%; width: 100%; overflow-x: hidden; }
        body { overflow-y: hidden; }
        * { box-sizing: border-box; -webkit-tap-highlight-color: transparent; }
        input, textarea, select, [contenteditable], div[tabindex] {
          outline: none !important;
          box-shadow: none;
        }
        input:focus, textarea:focus, select:focus, [contenteditable]:focus, *:focus, *:focus-visible {
          outline: none !important;
        }
      `;
      document.head.appendChild(style);
    }
  }, []);

  if (!ready) return null;

  return (
    <GestureHandlerRootView style={styles.outer}>
      <SafeAreaProvider>
        <LanguageProvider>
        <BookingProvider>
          <StatusBar style="dark" />
          {/* On web, constrain to a phone-width column so the mobile design
              renders correctly instead of stretching across the browser. */}
          <View style={styles.frame}>
            <ErrorBoundary>
            <View style={{ flex: 1 }}>
            <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#fff' } }}>
              <Stack.Screen name="index" />
              <Stack.Screen name="(auth)" />
              <Stack.Screen name="(tabs)" />
              <Stack.Screen name="(pro)" />
              <Stack.Screen name="notifications" />
              <Stack.Screen name="location" options={{ presentation: 'modal' }} />
              <Stack.Screen name="service/[id]" />
              <Stack.Screen name="booking/schedule" />
              <Stack.Screen name="booking/confirm" />
              <Stack.Screen name="booking/finding" options={{ gestureEnabled: false }} />
              <Stack.Screen name="booking/payment" options={{ gestureEnabled: false }} />
              <Stack.Screen name="booking/[id]" />
              <Stack.Screen name="chat/[bookingId]" />
              <Stack.Screen name="pro-job/[id]" />
              <Stack.Screen name="rate/[bookingId]" options={{ presentation: 'modal' }} />
              <Stack.Screen name="address/new" options={{ presentation: 'modal' }} />
              <Stack.Screen name="payment/new" options={{ presentation: 'modal' }} />
              <Stack.Screen name="profile/edit" options={{ presentation: 'modal' }} />
              <Stack.Screen name="language" options={{ presentation: 'modal' }} />
              <Stack.Screen name="pay-webview" options={{ gestureEnabled: false }} />
              <Stack.Screen name="all-services" />
            </Stack>
            </View>
            <AppTabBar />
            </ErrorBoundary>
            <Toaster />
          </View>
        </BookingProvider>
        </LanguageProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const isWeb = Platform.OS === 'web';

const styles = StyleSheet.create({
  outer: {
    flex: 1,
    ...(isWeb ? { backgroundColor: '#D1D5DB', alignItems: 'center' as const } : null),
  },
  frame: isWeb
    ? {
        flex: 1,
        // Fixed phone width so descendant %/flex widths resolve correctly on web.
        width: 390,
        maxWidth: '100%',
        alignSelf: 'center' as const,
        overflow: 'hidden' as const,
        backgroundColor: '#fff',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.12,
        shadowRadius: 24,
      }
    : { flex: 1, width: '100%' },
});
