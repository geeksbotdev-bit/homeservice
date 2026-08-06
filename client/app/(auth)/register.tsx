import { useState } from 'react';
import { View, StyleSheet, TextInput, ScrollView } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { Text, Button, Logo } from '../../src/components';
import { colors, radius } from '../../src/theme/theme';
import { user as userApi } from '../../src/services/api';

/** First-time registration: new user completes their profile, then enters the app. */
export default function Register() {
  const router = useRouter();
  const { role } = useLocalSearchParams<{ role?: string }>();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [location, setLocation] = useState('');
  const [saving, setSaving] = useState(false);

  const home = role === 'professional' ? '/(pro)' : '/(tabs)';

  async function finish() {
    if (!name.trim()) return;
    setSaving(true);
    await userApi.update({ name: name.trim(), email: email.trim() || undefined, location: location.trim() || undefined });
    setSaving(false);
    router.replace(home as any);
  }

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      <View style={{ alignItems: 'center', paddingTop: 8 }}><Logo /></View>

      <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
        <View style={styles.iconWrap}>
          <Feather name="user-plus" size={34} color={colors.primary} />
        </View>

        <Text variant="display" center style={{ fontSize: 26 }}>Welcome aboard! 🎉</Text>
        <Text variant="bodyLg" center color={colors.textTertiary} style={{ marginTop: 8, marginBottom: 28, fontSize: 14, lineHeight: 23 }}>
          Just a couple of details to set up your account.
        </Text>

        <Field label="Full name *">
          <TextInput style={styles.input} placeholder="e.g. Ahmed Ali" placeholderTextColor={colors.textDisabled} value={name} onChangeText={setName} autoFocus />
        </Field>
        <Field label="Email (optional)">
          <TextInput style={styles.input} placeholder="you@example.com" placeholderTextColor={colors.textDisabled} value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />
        </Field>
        <Field label="City / Area (optional)">
          <TextInput style={styles.input} placeholder="DHA Phase 5, Lahore" placeholderTextColor={colors.textDisabled} value={location} onChangeText={setLocation} />
        </Field>

        <Button label="Continue" iconRight="arrow-right" onPress={finish} disabled={!name.trim()} loading={saving} loadingLabel="Setting up..." style={{ marginTop: 12 }} />

        <Text variant="bodySm" center color={colors.textDisabled} style={{ marginTop: 16 }}>
          You can change these anytime in Profile.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={{ width: '100%', marginBottom: 16 }}>
      <Text variant="bodySm" weight="semibold" color={colors.textSecondary} style={{ marginBottom: 8 }}>{label}</Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.white },
  body: { paddingHorizontal: 28, paddingTop: 24, alignItems: 'center' },
  iconWrap: { width: 80, height: 80, borderRadius: 40, backgroundColor: colors.primary50, alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  input: { borderWidth: 1.5, borderColor: colors.border, borderRadius: radius.lg, height: 54, paddingHorizontal: 16, fontSize: 15, fontFamily: 'PlusJakartaSans_500Medium', color: colors.textPrimary },
});
