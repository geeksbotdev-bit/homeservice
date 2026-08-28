import { useEffect, useRef } from 'react';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import { NavBar } from '../src/components';
import { colors } from '../src/theme/theme';
import { payments } from '../src/services/api';

/** In-app Bank Alfalah checkout (native). Confirms payment by polling the
 *  server (which checks the gateway directly), and also intercepts the gateway's
 *  own return redirect — whichever happens first advances the app. */
export default function PayWebView() {
  const router = useRouter();
  const { url, id } = useLocalSearchParams<{ url: string; id: string }>();
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const done = useRef(false);

  function finish() {
    if (done.current) return;
    done.current = true;
    if (pollRef.current) clearInterval(pollRef.current);
    router.replace({ pathname: '/booking/finding', params: { id } });
  }

  // Poll the server → it confirms with the gateway (retrieveOrder), so we don't
  // depend on the checkout's own redirect (which can be blocked).
  useEffect(() => {
    if (!id) return;
    const t = setInterval(async () => {
      const r = await payments.verify(String(id)).catch(() => null);
      if (r?.status === 'paid') finish();
    }, 2500);
    pollRef.current = t;
    return () => clearInterval(t);
  }, [id]);

  // Returns false to stop the WebView loading the app URL and navigate in-app.
  function intercept(navUrl: string): boolean {
    if (navUrl.includes('/booking/finding')) { finish(); return false; }
    if (navUrl.includes('/booking/payment') || navUrl.includes('failed=1')) {
      if (pollRef.current) clearInterval(pollRef.current);
      router.replace({ pathname: '/booking/payment', params: { id, failed: '1' } });
      return false;
    }
    return true;
  }

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <NavBar title="Secure payment" />
      <WebView
        source={{ uri: String(url) }}
        originWhitelist={['*']}
        onShouldStartLoadWithRequest={(r) => intercept(r.url)}
        onNavigationStateChange={(s) => { if (s.url) intercept(s.url); }}
        startInLoadingState
        renderLoading={() => <View style={styles.loading}><ActivityIndicator size="large" color={colors.primary} /></View>}
        style={{ flex: 1 }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.white },
  loading: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' },
});
