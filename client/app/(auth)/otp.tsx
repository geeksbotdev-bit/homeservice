import { useEffect, useRef, useState } from 'react';
import { View, StyleSheet, TextInput, Pressable } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { Text, Button, NavBar } from '../../src/components';
import { colors, radius } from '../../src/theme/theme';
import { auth } from '../../src/services/api';
import { setAuthToken, setUserRole } from '../../src/services/client';
import { confirmOtp } from '../../src/services/phoneAuth';

export default function Otp() {
  const router = useRouter();
  const { phone, role, fb } = useLocalSearchParams<{ phone?: string; role?: string; fb?: string }>();
  const isFirebaseOtp = fb === '1';
  const LENGTH = isFirebaseOtp ? 6 : 4; // Firebase SMS codes are 6 digits
  const [digits, setDigits] = useState<string[]>(Array(LENGTH).fill(''));
  const [seconds, setSeconds] = useState(42);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputs = useRef<(TextInput | null)[]>([]);

  // Compact sizing so 6 boxes fit the phone width cleanly.
  const boxHeight = LENGTH >= 6 ? 52 : 66;
  const boxFont = LENGTH >= 6 ? 22 : 28;
  const boxGap = LENGTH >= 6 ? 8 : 12;

  useEffect(() => {
    if (seconds <= 0) return;
    const t = setTimeout(() => setSeconds((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [seconds]);

  const code = digits.join('');
  const filled = code.length === LENGTH;

  function setDigit(i: number, val: string) {
    if (error) setError(null);
    const v = val.replace(/[^0-9]/g, '').slice(-1);
    setDigits((d) => {
      const next = [...d];
      next[i] = v;
      return next;
    });
    if (v && i < LENGTH - 1) inputs.current[i + 1]?.focus();
  }

  function onKey(i: number, key: string) {
    if (key === 'Backspace' && !digits[i] && i > 0) inputs.current[i - 1]?.focus();
  }

  async function verify() {
    if (!filled) return;
    setLoading(true);
    try {
      const wantRole = role === 'professional' ? 'professional' : 'client';
      let res: any;
      if (isFirebaseOtp) {
        // Real Firebase SMS: confirm the code, then exchange the ID token.
        const { idToken, phone: fbPhone, name } = await confirmOtp(code);
        res = await auth.firebase(idToken, fbPhone ?? '+92' + (phone ?? ''), name);
      } else {
        res = await auth.verifyOtp('+92' + (phone ?? ''), code, wantRole);
      }
      setAuthToken(res.token);
      setUserRole(res.user?.role ?? (wantRole === 'professional' ? 'pro' : 'client'));
      setLoading(false);
      const pro = wantRole === 'professional' || res.user?.role === 'pro';
      // New user (or no name yet) → registration to complete profile.
      if (res.isNew || !res.user?.name) {
        router.replace({ pathname: '/(auth)/register', params: { role } });
      } else {
        router.replace(pro ? '/(pro)' : '/(tabs)');
      }
    } catch (e: any) {
      setLoading(false);
      setError(friendlyOtpError(e));
      setDigits(Array(LENGTH).fill(''));
      inputs.current[0]?.focus();
    }
  }

  const mins = Math.floor(seconds / 60);
  const secs = String(seconds % 60).padStart(2, '0');

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      <NavBar showLogo bordered={false} />

      <View style={styles.body}>
        <View style={styles.iconWrap}>
          <Feather name="mail" size={34} color={colors.primary} />
        </View>

        <Text variant="display" center style={{ fontSize: 26 }}>Enter the code</Text>
        <Text variant="bodyLg" center color={colors.textTertiary} style={{ marginTop: 8, marginBottom: 16, fontSize: 14 }}>
          We sent a {LENGTH}-digit verification code to your mobile number.
        </Text>

        {/* Editable phone chip */}
        <Pressable style={styles.chip} onPress={() => (router.canGoBack() ? router.back() : router.replace('/(auth)/phone'))}>
          <Text weight="bold" style={{ fontSize: 14 }}>🇵🇰 +92 {phone ?? '312 3456789'}</Text>
          <View style={styles.chipEdit}>
            <Feather name="edit-2" size={11} color={colors.white} />
          </View>
        </Pressable>

        {/* OTP boxes */}
        <View style={[styles.boxes, { gap: boxGap }]}>
          {digits.map((d, i) => (
            <TextInput
              key={i}
              ref={(r) => { inputs.current[i] = r; }}
              style={[
                styles.box,
                { height: boxHeight, fontSize: boxFont },
                d ? styles.boxFilled : null,
                error ? styles.boxError : null,
              ]}
              keyboardType="number-pad"
              maxLength={1}
              value={d}
              onChangeText={(v) => setDigit(i, v)}
              onKeyPress={(e) => onKey(i, e.nativeEvent.key)}
              autoFocus={i === 0}
            />
          ))}
        </View>

        {/* Inline error */}
        {error ? (
          <View style={styles.errorRow}>
            <Feather name="alert-circle" size={13} color={colors.error} />
            <Text variant="bodySm" color={colors.error} style={{ flex: 1 }}>{error}</Text>
          </View>
        ) : null}

        {/* Timer / resend */}
        <View style={styles.timer}>
          <Feather name="clock" size={14} color={colors.textDisabled} />
          {seconds > 0 ? (
            <Text variant="bodySm" color={colors.textDisabled}>
              Resend code in <Text weight="bold" color={colors.textSecondary}>{mins}:{secs}</Text>
            </Text>
          ) : (
            <Pressable onPress={() => setSeconds(42)}>
              <Text variant="bodySm" weight="semibold" color={colors.primary}>Resend code</Text>
            </Pressable>
          )}
        </View>

        <Button label="Verify & Continue" icon="check" onPress={verify} disabled={!filled} loading={loading} loadingLabel="Verifying..." />

        {/* Progress */}
        <View style={styles.progress}>
          <View style={[styles.pbar, { backgroundColor: colors.border }]} />
          <View style={[styles.pbar, { backgroundColor: colors.primary }]} />
          <View style={[styles.pbar, { backgroundColor: colors.border }]} />
        </View>

        <View style={styles.note}>
          <Feather name="shield" size={16} color={colors.primary} />
          <Text variant="bodySm" weight="medium" color={colors.primary700} style={{ flex: 1, fontSize: 12 }}>
            HomeService will never call to ask for your code.
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

function friendlyOtpError(e: any): string {
  const code = e?.code ?? '';
  const msg = String(e?.message ?? '');
  if (code.includes('invalid-verification-code') || msg.includes('invalid-verification-code'))
    return 'Incorrect code. Please check and try again.';
  if (code.includes('code-expired') || msg.includes('code-expired'))
    return 'This code has expired. Tap Resend to get a new one.';
  if (code.includes('too-many-requests') || msg.includes('too-many-requests'))
    return 'Too many attempts. Please wait a moment and try again.';
  if (msg.includes('network')) return 'Network error. Check your connection and retry.';
  return msg.replace(/^API \d+:\s*/, '') || 'Verification failed. Please try again.';
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.white },
  body: { flex: 1, paddingHorizontal: 28, paddingTop: 16, alignItems: 'center' },
  iconWrap: { width: 80, height: 80, borderRadius: 40, backgroundColor: colors.primary50, alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.surface, borderRadius: 24, paddingVertical: 8, paddingHorizontal: 16, marginBottom: 32 },
  chipEdit: { width: 20, height: 20, borderRadius: 10, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  boxes: { flexDirection: 'row', marginBottom: 12, width: '100%' },
  box: {
    flex: 1, minWidth: 0, borderRadius: radius.lg, borderWidth: 2, borderColor: colors.border,
    backgroundColor: '#FAFAFA', textAlign: 'center', fontFamily: 'PlusJakartaSans_800ExtraBold', color: colors.primary,
  },
  boxFilled: { borderColor: colors.primary, backgroundColor: '#F0FAFA' },
  boxError: { borderColor: colors.error, backgroundColor: colors.errorBg },
  errorRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 16, alignSelf: 'stretch' },
  timer: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 24 },
  progress: { flexDirection: 'row', justifyContent: 'center', gap: 6, marginTop: 20 },
  pbar: { width: 22, height: 5, borderRadius: 3 },
  note: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#F0FAFA', borderRadius: radius.lg, padding: 12, marginTop: 'auto', marginBottom: 8 },
});
