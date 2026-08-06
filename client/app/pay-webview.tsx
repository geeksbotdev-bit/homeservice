import { View, StyleSheet, ActivityIndicator } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import { NavBar } from '../src/components';
import { colors } from '../src/theme/theme';

/** In-app Bank Alfalah checkout (native). Intercepts the gateway's return
 *  redirect and routes back into the app. */
export default function PayWebView() {
  const router = useRouter();
  const { url, id } = useLocalSearchParams<{ url: string; id: string }>();

  // Returns false to stop the WebView loading the app URL and navigate in-app.
  function intercept(navUrl: string): boolean {
    if (navUrl.includes('/booking/finding')) {
      router.replace(`/booking/${id}`);
      return false;
    }
    if (navUrl.includes('/booking/payment') || navUrl.includes('failed=1')) {
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
