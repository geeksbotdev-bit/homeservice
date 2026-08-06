import { useState } from 'react';
import { View, StyleSheet, TextInput, ScrollView, Alert, Platform } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { Text, Button, NavBar } from '../../src/components';
import { colors, radius, spacing } from '../../src/theme/theme';
import { auth } from '../../src/services/api';
import { setAuthToken, setUserRole } from '../../src/services/client';
import { signInWithGoogle } from '../../src/services/firebaseAuth';
import { sendOtp } from '../../src/services/phoneAuth';
import { isFirebaseConfigured } from '../../src/services/firebase';

export default function PhoneAuth() {
  const router = useRouter();
  const { role, mode } = useLocalSearchParams<{ role?: string; mode?: string }>();
  const isLogin = mode === 'login';
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const valid = phone.replace(/\s/g, '').length >= 10;

  async function sendCode() {
    if (!valid) return;
    setLoading(true);
    const e164 = '+92' + phone.replace(/\s/g, '');
    try {
      // Try Firebase real-SMS (web); fall back to backend code on native.
      const { web } = await sendOtp(e164);
      if (!web) await auth.requestOtp(e164);
      setLoading(false);
      router.push({ pathname: '/(auth)/otp', params: { phone, role, mode, fb: web ? '1' : '0' } });
    } catch (e: any) {
      setLoading(false);
      Alert.alert('Could not send code', e?.message ?? 'Please try again.');
    }
  }

  async function continueWithGoogle() {
    setGoogleLoading(true);
    try {
      const user = await signInWithGoogle();
      // Exchange the Firebase ID token for an app session token so the
      // backend (/me, /bookings, …) recognises us.
      const idToken = user ? await user.getIdToken() : '';
      const res = await auth.google(idToken, user?.displayName ?? undefined, user?.email ?? undefined);
      setAuthToken(res.token);
      setUserRole(res.user?.role ?? 'client');
      const pro = res.user?.role === 'pro' || res.user?.role === 'professional';
      if (res.isNew && !res.user?.name) router.replace({ pathname: '/(auth)/register', params: { role } });
      else router.replace(pro ? '/(pro)' : '/(tabs)');
    } catch (e: any) {
      Alert.alert('Google sign-in', e?.message ?? 'Could not sign in with Google.');
    } finally {
      setGoogleLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      <NavBar showLogo bordered={false} />

      <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
        {/* Icon */}
        <View style={styles.iconWrap}>
          <Feather name="smartphone" size={34} color={colors.primary} />
        </View>

        <Text variant="display" center style={{ fontSize: 26 }}>
          {isLogin ? 'Welcome back.' : 'Your phone number,\nplease.'}
        </Text>
        <Text variant="bodyLg" center color={colors.textTertiary} style={{ marginTop: 8, marginBottom: 32, fontSize: 14, lineHeight: 23 }}>
          {isLogin
            ? 'Enter your number and we\'ll send a one-time code to log you in.'
            : 'We\'ll send a one-time code to verify it\'s you. No password needed.'}
        </Text>

        {/* Input */}
        <Text variant="bodySm" weight="semibold" color={colors.textSecondary} style={{ alignSelf: 'flex-start', marginBottom: 8 }}>
          Mobile Number
        </Text>
        <View style={styles.inputRow}>
          <View style={styles.prefix}>
            <Text style={{ fontSize: 20 }}>🇵🇰</Text>
            <Text weight="bold" color={colors.textPrimary} style={{ fontSize: 15 }}>+92</Text>
            <Feather name="chevron-down" size={14} color={colors.textDisabled} />
          </View>
          <TextInput
            style={styles.input}
            placeholder="3XX XXX XXXX"
            placeholderTextColor={colors.textDisabled}
            keyboardType="phone-pad"
            value={phone}
            onChangeText={setPhone}
            maxLength={11}
          />
        </View>

        <View style={styles.helper}>
          <Feather name="info" size={13} color={colors.textDisabled} />
          <Text variant="bodySm" color={colors.textDisabled} style={{ flex: 1 }}>
            Standard SMS rates may apply. Valid Pakistani number required.
          </Text>
        </View>

        <Button label="Send Code" iconRight="send" onPress={sendCode} disabled={!valid} loading={loading} loadingLabel="Sending..." style={{ marginTop: 24 }} />

        {/* Separator */}
        <View style={styles.sep}>
          <View style={styles.line} />
          <Text variant="bodySm" weight="medium" color={colors.textDisabled}>or continue with</Text>
          <View style={styles.line} />
        </View>

        <Button
          label={isFirebaseConfigured ? 'Continue with Google' : 'Continue with Email'}
          variant="secondary"
          icon={isFirebaseConfigured ? 'chrome' : 'mail'}
          onPress={isFirebaseConfigured ? continueWithGoogle : () => router.push({ pathname: '/(auth)/otp', params: { role } })}
          loading={googleLoading}
          loadingLabel="Opening Google…"
          style={{ borderColor: colors.border, height: 52 }}
        />

        {/* Social proof */}
        <View style={styles.proof}>
          {['Verified cleaners', 'Secure & encrypted', 'PKR payments'].map((t, i) => (
            <View key={t} style={styles.proofItem}>
              <Feather name="check-circle" size={13} color={colors.success} />
              <Text variant="bodySm" weight="medium" color={colors.textTertiary} style={{ fontSize: 11 }}>{t}</Text>
            </View>
          ))}
        </View>
      </ScrollView>

      <Text variant="bodySm" center color={colors.textDisabled} style={styles.terms}>
        By continuing, you agree to our <Text weight="semibold" color={colors.primary}>Terms of Service</Text> and{' '}
        <Text weight="semibold" color={colors.primary}>Privacy Policy</Text>.
      </Text>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.white },
  body: { paddingHorizontal: 28, paddingTop: 16, alignItems: 'center' },
  iconWrap: {
    width: 80, height: 80, borderRadius: 40, backgroundColor: colors.primary50,
    alignItems: 'center', justifyContent: 'center', marginBottom: 22,
  },
  inputRow: {
    flexDirection: 'row', borderWidth: 1.5, borderColor: colors.border,
    borderRadius: radius.lg, height: 58, overflow: 'hidden', width: '100%', backgroundColor: colors.white,
  },
  prefix: {
    flexDirection: 'row', alignItems: 'center', gap: 7, paddingHorizontal: 14,
    borderRightWidth: 1.5, borderRightColor: colors.border, backgroundColor: '#F9FAFB',
  },
  input: { flex: 1, paddingHorizontal: 16, fontSize: 16, fontFamily: 'PlusJakartaSans_500Medium', color: colors.textPrimary },
  helper: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10, alignSelf: 'flex-start', paddingRight: 10 },
  sep: { flexDirection: 'row', alignItems: 'center', gap: 14, marginVertical: 20, width: '100%' },
  line: { flex: 1, height: 1, backgroundColor: colors.border },
  proof: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12, marginTop: 20, flexWrap: 'wrap' },
  proofItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  terms: { paddingHorizontal: 28, paddingBottom: 8, fontSize: 11.5, lineHeight: 19 },
});
