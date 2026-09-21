import { useState } from 'react';
import { View, StyleSheet, ScrollView, Pressable, ActivityIndicator, Image, Platform } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { Text, Button, Card, NavBar } from '../../src/components';
import { colors, radius, shadow } from '../../src/theme/theme';
import { pro } from '../../src/services/api';
import { showToast } from '../../src/store/toast';

const MAX_PHOTOS = 6;

/**
 * The photo step the cleaner is sent to instead of being blocked by an error:
 * "Start Job" opens this with kind=before, "Complete Job" with kind=after.
 * Upload at least one picture, then the same button finishes the transition.
 */
export default function JobPhotos() {
  const router = useRouter();
  const { id, kind } = useLocalSearchParams<{ id: string; kind?: string }>();
  const isBefore = kind !== 'after';

  const [photos, setPhotos] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  const copy = isBefore
    ? { title: 'Before you start', head: 'Photo of the site', sub: 'Take a picture of the area as you found it. The customer sees this with the job.', cta: 'Start Job', icon: 'play' as const }
    : { title: 'Finish the job', head: 'Photo of your work', sub: 'Take a picture of the area you cleaned. This is sent with the completed job.', cta: 'Complete Job', icon: 'check-circle' as const };

  async function add(camera: boolean) {
    if (photos.length >= MAX_PHOTOS) { showToast('Limit reached', `Up to ${MAX_PHOTOS} photos`); return; }
    try {
      const perm = camera
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted && Platform.OS !== 'web') { showToast('Permission needed', 'Allow camera access to add the photo'); return; }
      const res = camera
        ? await ImagePicker.launchCameraAsync({ base64: true, quality: 0.5 })
        : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], base64: true, quality: 0.5 });
      if (res.canceled || !res.assets?.[0]?.base64) return;
      const a = res.assets[0];
      setUploading(true);
      const { url } = await pro.uploadImage(`data:${a.mimeType || 'image/jpeg'};base64,${a.base64}`);
      setPhotos((p) => [...p, url]);
    } catch (e: any) {
      showToast('Upload failed', e?.message || 'Could not upload the photo');
    } finally {
      setUploading(false);
    }
  }

  async function submit() {
    if (!photos.length || !id) return;
    setSaving(true);
    try {
      await pro.setStatus(
        id,
        isBefore ? 'in_progress' : 'completed',
        isBefore ? { beforePhotos: photos } : { afterPhotos: photos },
      );
      showToast(isBefore ? 'Job started' : 'Job completed', isBefore ? 'Good luck!' : 'Nice work — the customer has been notified');
      router.replace(`/pro-job/${id}`);
    } catch (e: any) {
      showToast('Could not update the job', e?.message || 'Please try again');
    } finally {
      setSaving(false);
    }
  }

  return (
    <View style={styles.root}>
      <SafeAreaView edges={['top']} style={{ backgroundColor: colors.white }}><NavBar title={copy.title} bordered={false} /></SafeAreaView>

      <ScrollView contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: 24 }} showsVerticalScrollIndicator={false}>
        <Card style={{ padding: 16, gap: 6 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <View style={styles.badge}><Feather name="camera" size={17} color={colors.primary} /></View>
            <Text weight="bold" style={{ fontSize: 16, flex: 1 }}>{copy.head}</Text>
          </View>
          <Text variant="bodySm" color={colors.textTertiary} style={{ lineHeight: 20 }}>{copy.sub}</Text>
        </Card>

        {/* Big capture area */}
        <Pressable onPress={() => add(true)} style={styles.dropzone} disabled={uploading}>
          {uploading ? (
            <ActivityIndicator color={colors.primary} />
          ) : (
            <View style={{ alignItems: 'center', gap: 8 }}>
              <Feather name="camera" size={28} color={colors.primary} />
              <Text weight="semibold" color={colors.primary}>Take a photo</Text>
              <Text variant="bodySm" color={colors.textTertiary} style={{ fontSize: 12 }}>
                {photos.length ? `${photos.length} added — tap to add another` : 'Required to continue'}
              </Text>
            </View>
          )}
        </Pressable>

        <Pressable onPress={() => add(false)} style={{ alignSelf: 'center' }} disabled={uploading}>
          <Text variant="bodySm" weight="semibold" color={colors.primary}>Choose from gallery instead</Text>
        </Pressable>

        {photos.length > 0 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10, paddingVertical: 2 }}>
            {photos.map((uri, i) => (
              <View key={`${uri.slice(-16)}-${i}`}>
                <Image source={{ uri }} style={styles.thumb} resizeMode="cover" />
                <Pressable style={styles.thumbX} onPress={() => setPhotos((p) => p.filter((_, x) => x !== i))} hitSlop={6}>
                  <Feather name="x" size={11} color={colors.white} />
                </Pressable>
              </View>
            ))}
          </ScrollView>
        )}
      </ScrollView>

      <View style={styles.footer}>
        <Button
          label={copy.cta}
          icon={copy.icon}
          onPress={submit}
          disabled={photos.length === 0 || uploading}
          loading={saving}
          loadingLabel="Saving…"
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surface },
  badge: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.primary50, alignItems: 'center', justifyContent: 'center' },
  dropzone: {
    height: 190, borderRadius: radius.lg, borderWidth: 1.5, borderStyle: 'dashed',
    borderColor: colors.primary200, backgroundColor: colors.primary50, alignItems: 'center', justifyContent: 'center',
  },
  thumb: { width: 96, height: 96, borderRadius: radius.md, backgroundColor: colors.white },
  thumbX: {
    position: 'absolute', top: -5, right: -5, width: 20, height: 20, borderRadius: 10,
    backgroundColor: colors.error, alignItems: 'center', justifyContent: 'center',
  },
  footer: { padding: 16, paddingTop: 12, backgroundColor: colors.white, borderTopWidth: 1, borderTopColor: '#F0F0F0', ...shadow.card },
});
