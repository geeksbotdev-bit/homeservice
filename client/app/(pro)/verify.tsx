import { useCallback, useState } from 'react';
import { View, StyleSheet, ScrollView, Pressable, ActivityIndicator, Image, TextInput, Platform } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { Text, Button, Card, NavBar } from '../../src/components';
import { colors, radius, shadow } from '../../src/theme/theme';
import { pro } from '../../src/services/api';
import { showToast } from '../../src/store/toast';

type Slot = 'idFront' | 'idBack' | 'selfie';

export default function Verify() {
  const router = useRouter();
  const [cnic, setCnic] = useState('');
  const [imgs, setImgs] = useState<Record<Slot, string | null>>({ idFront: null, idBack: null, selfie: null });
  const [busy, setBusy] = useState<Slot | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState<string>('unverified');
  const [note, setNote] = useState<string | undefined>();

  useFocusEffect(useCallback(() => {
    pro.profile().then((p) => { setStatus(p.verifStatus ?? 'unverified'); setNote(p.verifNote); }).catch(() => {});
  }, []));

  async function pick(slot: Slot, camera = false) {
    try {
      const perm = camera
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted && Platform.OS !== 'web') { showToast('Permission needed', 'Allow photo access to continue'); return; }
      const res = camera
        ? await ImagePicker.launchCameraAsync({ base64: true, quality: 0.5 })
        : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, base64: true, quality: 0.5 });
      if (res.canceled || !res.assets?.[0]?.base64) return;
      const a = res.assets[0];
      const mime = a.mimeType || 'image/jpeg';
      const dataUrl = `data:${mime};base64,${a.base64}`;
      setBusy(slot);
      const { url } = await pro.uploadImage(dataUrl);
      setImgs((p) => ({ ...p, [slot]: url }));
    } catch {
      showToast('Upload failed', 'Could not upload the image');
    } finally {
      setBusy(null);
    }
  }

  async function submit() {
    const digits = cnic.replace(/\D/g, '');
    if (digits.length !== 13) { showToast('Invalid CNIC', 'Enter a valid 13-digit CNIC number'); return; }
    if (!imgs.idFront || !imgs.selfie) { showToast('Missing documents', 'CNIC front photo and a selfie are required'); return; }
    setSubmitting(true);
    try {
      await pro.submitVerification({ cnic: digits, idFront: imgs.idFront, idBack: imgs.idBack ?? undefined, selfie: imgs.selfie });
      showToast('Submitted', 'We’ll review your documents shortly');
      router.back();
    } catch (e: any) {
      showToast('Submission failed', e?.message || 'Please try again');
    } finally {
      setSubmitting(false);
    }
  }

  const pending = status === 'pending';
  const verified = status === 'verified';

  return (
    <View style={styles.root}>
      <SafeAreaView edges={['top']} style={{ backgroundColor: colors.white }}><NavBar title="Identity Verification" bordered={false} /></SafeAreaView>

      <ScrollView contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: 32 }} showsVerticalScrollIndicator={false}>
        {verified ? (
          <Card style={[styles.banner, { backgroundColor: colors.successBg }]}>
            <Feather name="check-circle" size={20} color={colors.success} />
            <Text weight="semibold" color={colors.textSecondary} style={{ flex: 1 }}>Your identity is verified. You can accept jobs.</Text>
          </Card>
        ) : pending ? (
          <Card style={[styles.banner, { backgroundColor: colors.primary50 }]}>
            <Feather name="clock" size={20} color={colors.primary} />
            <Text weight="semibold" color={colors.textSecondary} style={{ flex: 1 }}>Under review — you’ll be notified once approved. You can resubmit below if needed.</Text>
          </Card>
        ) : status === 'rejected' ? (
          <Card style={[styles.banner, { backgroundColor: colors.errorBg }]}>
            <Feather name="alert-circle" size={20} color={colors.error} />
            <Text weight="semibold" color={colors.textSecondary} style={{ flex: 1 }}>{note || 'Verification was rejected. Please re-submit clear documents.'}</Text>
          </Card>
        ) : (
          <Text color={colors.textTertiary} style={{ lineHeight: 20 }}>
            Verify your identity to start accepting jobs. Upload a clear photo of your CNIC and a selfie. Your documents are private and used only for verification.
          </Text>
        )}

        {/* CNIC number */}
        <Card style={{ padding: 16, gap: 8 }}>
          <Text weight="semibold" style={{ fontSize: 13 }}>CNIC Number</Text>
          <TextInput
            value={cnic}
            onChangeText={setCnic}
            placeholder="42101-1234567-1"
            placeholderTextColor={colors.textDisabled}
            keyboardType="number-pad"
            style={styles.input}
          />
        </Card>

        {/* Documents */}
        <DocTile label="CNIC — Front" required busy={busy === 'idFront'} uri={imgs.idFront} onPick={() => pick('idFront')} />
        <DocTile label="CNIC — Back" busy={busy === 'idBack'} uri={imgs.idBack} onPick={() => pick('idBack')} />
        <DocTile label="Selfie" required selfie busy={busy === 'selfie'} uri={imgs.selfie} onPick={() => pick('selfie', true)} onPickLib={() => pick('selfie')} />

        <Button label={pending ? 'Re-submit for review' : 'Submit for verification'} icon="shield" loading={submitting} onPress={submit} style={{ marginTop: 4 }} />
      </ScrollView>
    </View>
  );
}

function DocTile({ label, required, selfie, busy, uri, onPick, onPickLib }: {
  label: string; required?: boolean; selfie?: boolean; busy: boolean; uri: string | null; onPick: () => void; onPickLib?: () => void;
}) {
  return (
    <Card style={{ padding: 14, gap: 10 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Text weight="semibold" style={{ fontSize: 13 }}>{label}{required && <Text color={colors.error}> *</Text>}</Text>
        {uri && <Feather name="check-circle" size={16} color={colors.success} />}
      </View>
      <Pressable onPress={onPick} style={styles.dropzone}>
        {busy ? (
          <ActivityIndicator color={colors.primary} />
        ) : uri ? (
          <Image source={{ uri }} style={styles.preview} resizeMode="cover" />
        ) : (
          <View style={{ alignItems: 'center', gap: 6 }}>
            <Feather name={selfie ? 'camera' : 'upload'} size={22} color={colors.primary} />
            <Text variant="bodySm" color={colors.textTertiary}>{selfie ? 'Take a selfie' : 'Upload a photo'}</Text>
          </View>
        )}
      </Pressable>
      {selfie && onPickLib && (
        <Pressable onPress={onPickLib} style={{ alignSelf: 'center' }}>
          <Text variant="bodySm" weight="semibold" color={colors.primary}>Choose from gallery instead</Text>
        </Pressable>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surface },
  banner: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 },
  input: { borderWidth: 1.5, borderColor: colors.border, borderRadius: radius.md, paddingHorizontal: 14, height: 48, fontSize: 15, color: colors.textPrimary, backgroundColor: colors.white },
  dropzone: { height: 150, borderRadius: radius.lg, borderWidth: 1.5, borderStyle: 'dashed', borderColor: colors.primary200, backgroundColor: colors.primary50, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  preview: { width: '100%', height: '100%' },
});
