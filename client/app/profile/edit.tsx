import { useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView, TextInput, Pressable, Image, Alert, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { Text, Button, NavBar } from '../../src/components';
import { colors, radius } from '../../src/theme/theme';
import { user as userApi } from '../../src/services/api';
import { initials } from '../../src/utils';
import type { User } from '../../src/data/types';

const GENDERS = ['Male', 'Female', 'Other'];

export default function EditProfile() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [gender, setGender] = useState('');
  const [dob, setDob] = useState('');
  const [location, setLocation] = useState('');
  const [avatar, setAvatar] = useState<string | undefined>();
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    userApi.me().then((me: User) => {
      setName(me.name ?? ''); setEmail(me.email ?? ''); setPhone(me.phone ?? '');
      setGender(me.gender ?? ''); setDob(me.dob ?? ''); setLocation(me.location ?? '');
      setAvatar(me.avatarUrl); setLoaded(true);
    });
  }, []);

  async function pickPhoto() {
    if (Platform.OS !== 'web') {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) { Alert.alert('Permission needed', 'Please allow photo access to set a profile picture.'); return; }
    }
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'] as any, allowsEditing: true, aspect: [1, 1], quality: 0.4, base64: true,
    });
    if (!res.canceled && res.assets?.[0]) {
      const a = res.assets[0];
      setAvatar(a.base64 ? `data:image/jpeg;base64,${a.base64}` : a.uri);
    }
  }

  async function save() {
    if (!name.trim()) return;
    setSaving(true);
    await userApi.update({
      name: name.trim(), email: email.trim(), phone: phone.trim(),
      gender, dob: dob.trim(), location: location.trim(), avatarUrl: avatar,
    });
    setSaving(false);
    router.canGoBack() ? router.back() : router.replace('/(tabs)/profile');
  }

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <NavBar title="Edit Profile" />
      <ScrollView contentContainerStyle={{ padding: 20, gap: 16, paddingBottom: 32 }} keyboardShouldPersistTaps="handled">
        {/* Avatar with upload */}
        <View style={styles.avatarWrap}>
          <Pressable onPress={pickPhoto} style={styles.avatar}>
            {avatar
              ? <Image source={{ uri: avatar }} style={styles.avatarImg} />
              : <Text weight="extrabold" color={colors.white} style={{ fontSize: 30 }}>{name ? initials(name) : '?'}</Text>}
            <View style={styles.camBadge}><Feather name="camera" size={14} color={colors.white} /></View>
          </Pressable>
          <Pressable onPress={pickPhoto}><Text weight="semibold" color={colors.primary} style={{ marginTop: 10 }}>Change photo</Text></Pressable>
        </View>

        <Field label="Full name *">
          <TextInput style={styles.input} placeholder="Your name" placeholderTextColor={colors.textDisabled} value={name} onChangeText={setName} editable={loaded} />
        </Field>
        <Field label="Email">
          <TextInput style={styles.input} placeholder="you@example.com" placeholderTextColor={colors.textDisabled} value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" editable={loaded} />
        </Field>
        <Field label="Phone">
          <TextInput style={styles.input} placeholder="+92 3XX XXXXXXX" placeholderTextColor={colors.textDisabled} value={phone} onChangeText={setPhone} keyboardType="phone-pad" editable={loaded} />
        </Field>

        <Field label="Gender">
          <View style={{ flexDirection: 'row', gap: 10 }}>
            {GENDERS.map((g) => {
              const on = gender === g;
              return (
                <Pressable key={g} onPress={() => setGender(on ? '' : g)} style={[styles.chip, on && styles.chipOn]}>
                  <Text weight="semibold" color={on ? colors.white : colors.textSecondary} style={{ fontSize: 13 }}>{g}</Text>
                </Pressable>
              );
            })}
          </View>
        </Field>

        <Field label="Date of birth">
          <TextInput style={styles.input} placeholder="DD / MM / YYYY" placeholderTextColor={colors.textDisabled} value={dob} onChangeText={setDob} editable={loaded} />
        </Field>
        <Field label="City / Area">
          <TextInput style={styles.input} placeholder="DHA Phase 5, Lahore" placeholderTextColor={colors.textDisabled} value={location} onChangeText={setLocation} editable={loaded} />
        </Field>

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
  avatarWrap: { alignItems: 'center', marginBottom: 4 },
  avatar: { width: 96, height: 96, borderRadius: 48, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  avatarImg: { width: 96, height: 96, borderRadius: 48 },
  camBadge: { position: 'absolute', bottom: 0, right: 0, width: 30, height: 30, borderRadius: 15, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: colors.white },
  input: { borderWidth: 1.5, borderColor: colors.border, borderRadius: radius.lg, height: 52, paddingHorizontal: 16, fontSize: 15, fontFamily: 'PlusJakartaSans_500Medium', color: colors.textPrimary },
  chip: { flex: 1, height: 46, borderRadius: radius.lg, borderWidth: 1.5, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  chipOn: { backgroundColor: colors.primary, borderColor: colors.primary },
});
