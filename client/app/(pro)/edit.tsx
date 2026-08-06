import { useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView, TextInput, Pressable, Switch } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text, Button, NavBar } from '../../src/components';
import { colors, radius } from '../../src/theme/theme';
import { pro } from '../../src/services/api';
import type { Cleaner } from '../../src/data/types';

export default function ProEdit() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [bio, setBio] = useState('');
  const [available, setAvailable] = useState(true);
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    pro.profile().then((c: Cleaner) => {
      setName(c.name ?? '');
      setBio(c.bio ?? '');
      setAvailable(c.available ?? true);
      setLoaded(true);
    });
  }, []);

  async function save() {
    if (!name.trim()) return;
    setSaving(true);
    await pro.updateProfile({ name: name.trim(), bio: bio.trim(), available });
    setSaving(false);
    (router.canGoBack() ? router.back() : router.replace('/(pro)'));
  }

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <NavBar title="Edit Profile" />
      <ScrollView contentContainerStyle={{ padding: 20, gap: 18 }} keyboardShouldPersistTaps="handled">
        <Field label="Full name">
          <TextInput style={styles.input} placeholder="Your name" placeholderTextColor={colors.textDisabled} value={name} onChangeText={setName} editable={loaded} />
        </Field>
        <Field label="Bio / specialties">
          <TextInput style={[styles.input, styles.area]} placeholder="e.g. Specialist in bathroom & kitchen deep cleans" placeholderTextColor={colors.textDisabled} value={bio} onChangeText={setBio} editable={loaded} multiline textAlignVertical="top" />
        </Field>

        <View style={styles.switchRow}>
          <View style={{ flex: 1 }}>
            <Text weight="semibold" style={{ fontSize: 15 }}>Available for jobs</Text>
            <Text variant="bodySm" color={colors.textTertiary} style={{ marginTop: 2 }}>{available ? 'You are online — receiving job requests' : 'You are offline — no new jobs'}</Text>
          </View>
          <Switch value={available} onValueChange={setAvailable} trackColor={{ true: colors.primary, false: colors.border }} thumbColor={colors.white} />
        </View>

        <Button label="Save Changes" icon="check" onPress={save} disabled={!name.trim()} loading={saving} loadingLabel="Saving..." style={{ marginTop: 8 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View>
      <Text variant="bodySm" weight="semibold" color={colors.textSecondary} style={{ marginBottom: 8 }}>{label}</Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.white },
  input: { borderWidth: 1.5, borderColor: colors.border, borderRadius: radius.lg, height: 52, paddingHorizontal: 16, fontSize: 15, fontFamily: 'PlusJakartaSans_500Medium', color: colors.textPrimary },
  area: { height: 100, paddingTop: 14 },
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.surfaceAlt, borderRadius: radius.lg, padding: 16 },
});
