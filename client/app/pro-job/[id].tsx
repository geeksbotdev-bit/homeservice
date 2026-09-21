import { useCallback, useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView, Pressable, ActivityIndicator, Image, Platform } from 'react-native';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { Text, Button, Card, StatusBadge, NavBar, LiveMap } from '../../src/components';
import { useShareLocation } from '../../src/hooks/useShareLocation';
import { colors, radius, shadow } from '../../src/theme/theme';
import { pro } from '../../src/services/api';
import { showToast } from '../../src/store/toast';
import { formatPKR } from '../../src/utils';
import type { Booking, BookingStatus } from '../../src/data/types';

const NEXT: Partial<Record<BookingStatus, { to: BookingStatus; label: string; icon: any }>> = {
  confirmed: { to: 'on_the_way', label: 'On My Way', icon: 'navigation' },
  on_the_way: { to: 'arrived', label: 'Mark Arrived', icon: 'map-pin' },
  arrived: { to: 'in_progress', label: 'Start Job', icon: 'play' },
  in_progress: { to: 'completed', label: 'Complete Job', icon: 'check-circle' },
};

// Photo evidence the backend enforces: the site on arrival, the work at the end.
const MAX_PHOTOS = 6;

export default function ProJobDetail() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [b, setB] = useState<Booking | null>(null);
  const [busy, setBusy] = useState(false);
  const [focusTick, setFocusTick] = useState(0);
  // Photos held locally until the status change that sends them.
  const [before, setBefore] = useState<string[]>([]);
  const [after, setAfter] = useState<string[]>([]);
  const [uploading, setUploading] = useState<'before' | 'after' | null>(null);

  const load = useCallback(() => { if (id) pro.job(id).then(setB).catch(() => {}); }, [id]);
  // Poll every 5s so the customer's shared location updates live on the map.
  useFocusEffect(useCallback(() => {
    load();
    const t = setInterval(load, 5000);
    return () => clearInterval(t);
  }, [load]));

  // Cleaner shares their live GPS while the job is active.
  const shareActive = !!b && !!b.cleaner && ['confirmed', 'on_the_way', 'arrived', 'in_progress'].includes(b.status);
  const mine = useShareLocation(id, shareActive);

  // Seed from whatever is already saved on the job (the 5s poll must not wipe
  // photos the cleaner just added, so only fill in what's missing).
  useEffect(() => {
    if (b?.beforePhotos?.length) setBefore((p) => (p.length ? p : b.beforePhotos!));
    if (b?.afterPhotos?.length) setAfter((p) => (p.length ? p : b.afterPhotos!));
  }, [b?.beforePhotos, b?.afterPhotos]);

  /** Capture + upload one photo. Returns its URL, or null if cancelled/failed. */
  async function addPhoto(kind: 'before' | 'after', camera = true): Promise<string | null> {
    const list = kind === 'before' ? before : after;
    if (list.length >= MAX_PHOTOS) { showToast('Limit reached', `Up to ${MAX_PHOTOS} photos`); return null; }
    try {
      const perm = camera
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted && Platform.OS !== 'web') { showToast('Permission needed', 'Allow camera access to add the photo'); return null; }
      const res = camera
        ? await ImagePicker.launchCameraAsync({ base64: true, quality: 0.5 })
        : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], base64: true, quality: 0.5 });
      if (res.canceled || !res.assets?.[0]?.base64) return null;
      const a = res.assets[0];
      setUploading(kind);
      const { url } = await pro.uploadImage(`data:${a.mimeType || 'image/jpeg'};base64,${a.base64}`);
      (kind === 'before' ? setBefore : setAfter)((p) => [...p, url]);
      return url;
    } catch (e: any) {
      showToast('Upload failed', e?.message || 'Could not upload the photo');
      return null;
    } finally {
      setUploading(null);
    }
  }

  function removePhoto(kind: 'before' | 'after', i: number) {
    (kind === 'before' ? setBefore : setAfter)((p) => p.filter((_, x) => x !== i));
  }

  if (!b) {
    return (
      <SafeAreaView style={styles.root} edges={['top']}><NavBar title="Job" /><ActivityIndicator color={colors.primary} style={{ marginTop: 60 }} /></SafeAreaView>
    );
  }

  const enRoute = b.status === 'on_the_way';
  const etaLabel = b.status === 'completed' ? 'Completed' : b.status === 'in_progress' ? 'Working' : b.status === 'arrived' ? 'Arrived' : enRoute ? 'En route' : 'To customer';

  // Pool job: an open scheduled booking not yet taken (no cleaner) → claim it.
  const isPool = !b.cleaner && !b.accepted && b.status === 'confirmed';
  // Dispatched instant request assigned to me but not yet accepted.
  const isRequest = !!b.cleaner && !b.accepted && b.status === 'confirmed';
  const next = b.accepted ? NEXT[b.status] : undefined;

  // In-app navigation: re-centre the live route on our map (no external app).
  function navigate() {
    setFocusTick((t) => t + 1);
  }

  async function run(fn: () => Promise<any>, back = false) {
    setBusy(true);
    let failed = false;
    try {
      await fn();
    } catch (e: any) {
      // e.g. the job was just claimed by another cleaner, or a photo is missing
      failed = true;
      showToast('Could not update the job', e?.message || 'Please try again');
    }
    setBusy(false);
    if (back && !failed) router.replace('/(pro)');
    else load();
  }

  // Advance the job. When the step needs a photo that hasn't been taken yet,
  // go STRAIGHT to the upload screen — never a blocking error. That screen
  // finishes the transition once a picture is added.
  function advance(to: BookingStatus) {
    if (to === 'in_progress' && before.length === 0) {
      router.push(`/job-photos/${b!.id}?kind=before`);
      return;
    }
    if (to === 'completed' && after.length === 0) {
      router.push(`/job-photos/${b!.id}?kind=after`);
      return;
    }
    run(() => pro.setStatus(b!.id, to, { beforePhotos: before, afterPhotos: after }));
  }

  return (
    <View style={styles.root}>
      <SafeAreaView edges={['top']} style={{ backgroundColor: colors.white }}><NavBar title="Job Details" bordered={false} /></SafeAreaView>

      <ScrollView contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: 24 }} showsVerticalScrollIndicator={false}>
        {/* Live route map + navigate */}
        <Card style={{ overflow: 'hidden' }}>
          <View>
            <LiveMap
              pro={mine ?? (b.proLat != null && b.proLng != null ? { lat: b.proLat, lng: b.proLng } : null)}
              cust={b.custLat != null && b.custLng != null ? { lat: b.custLat, lng: b.custLng } : null}
              etaText={etaLabel}
              cleanerName="Customer"
              focusTick={focusTick}
            />
            <Pressable style={styles.navBtn} onPress={navigate}>
              <Feather name="navigation" size={15} color={colors.white} />
              <Text weight="bold" color={colors.white} style={{ fontSize: 13 }}>Navigate</Text>
            </Pressable>
          </View>
          <View style={{ padding: 14, flexDirection: 'row', alignItems: 'flex-start', gap: 10 }}>
            <Feather name="map-pin" size={16} color={colors.primary} style={{ marginTop: 2 }} />
            <Text style={{ flex: 1 }} color={colors.textSecondary}>{b.address?.trim() || 'Address shared after you accept'}</Text>
          </View>
        </Card>

        {/* Status + schedule */}
        <Card style={{ padding: 16 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
            <Text weight="bold" style={{ fontSize: 16 }}>{b.service}</Text>
            {isPool ? <View style={[styles.reqTag, { backgroundColor: colors.primary }]}><Text weight="bold" color={colors.white} style={{ fontSize: 10 }}>SCHEDULED · OPEN</Text></View>
              : isRequest ? <View style={styles.reqTag}><Text weight="bold" color={colors.white} style={{ fontSize: 10 }}>NEW REQUEST</Text></View>
              : <StatusBadge status={b.status} />}
          </View>
          <Text variant="bodySm" color={colors.textTertiary}>{b.scheduledType === 'now' ? 'Instant booking' : 'Scheduled'} · {b.dateLabel} · {b.timeLabel}</Text>
        </Card>

        {/* Custom package */}
        <Card style={{ padding: 16 }}>
          <Text variant="caption" color={colors.textDisabled} style={{ letterSpacing: 1, marginBottom: 10 }}>CUSTOMER'S PACKAGE</Text>
          <Row label={b.service} value="Base service" />
          {b.addOns.map((a) => <Row key={a} label={a} value="Add-on" accent />)}
          <View style={styles.totalRow}>
            <Text weight="bold">Job value</Text>
            <Text weight="extrabold" color={colors.primary} style={{ fontSize: 18 }}>{formatPKR(b.total)}</Text>
          </View>
        </Card>

        {/* Job photos — required evidence: the site on arrival, the work at the end */}
        {b.accepted && (
          <Card style={{ padding: 16, gap: 14 }}>
            <View>
              <Text variant="caption" color={colors.textDisabled} style={{ letterSpacing: 1 }}>JOB PHOTOS</Text>
              <Text variant="bodySm" color={colors.textTertiary} style={{ marginTop: 4 }}>
                Start Job asks for a photo of the site; Complete Job asks for a photo of the finished work.
              </Text>
            </View>

            <PhotoRow
              title="Before — site on arrival"
              required={b.status === 'arrived'}
              done={before.length > 0}
              photos={before}
              busy={uploading === 'before'}
              locked={b.status === 'completed'}
              onAdd={(camera) => addPhoto('before', camera)}
              onRemove={(i) => removePhoto('before', i)}
            />

            {['arrived', 'in_progress', 'completed'].includes(b.status) && (
              <PhotoRow
                title="After — finished work"
                required={b.status === 'in_progress'}
                done={after.length > 0}
                photos={after}
                busy={uploading === 'after'}
                locked={b.status === 'completed'}
                onAdd={(camera) => addPhoto('after', camera)}
                onRemove={(i) => removePhoto('after', i)}
              />
            )}
          </Card>
        )}

        {/* Chat */}
        <Pressable style={styles.chatBtn} onPress={() => router.push(`/chat/${b.id}`)}>
          <Feather name="message-circle" size={16} color={colors.primary} />
          <Text weight="semibold" color={colors.primary}>Message customer</Text>
        </Pressable>
      </ScrollView>

      {/* Footer actions */}
      <View style={styles.footer}>
        {isPool ? (
          <Button label="Accept this job" icon="check-circle" onPress={() => run(() => pro.claim(b.id))} loading={busy} />
        ) : isRequest ? (
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <Button label="Reject" variant="danger" icon="x" fullWidth onPress={() => run(() => pro.reject(b.id), true)} style={{ flex: 1 }} />
            <Button label="Accept Job" icon="check" fullWidth onPress={() => run(() => pro.accept(b.id))} loading={busy} style={{ flex: 1 }} />
          </View>
        ) : next ? (
          <Button label={next.label} icon={next.icon} onPress={() => advance(next.to)} loading={busy} />
        ) : (
          <View style={styles.doneRow}><Feather name="check-circle" size={18} color={colors.success} /><Text weight="bold" color={colors.success}>Job {b.status}</Text></View>
        )}
      </View>
    </View>
  );
}

/** A labelled strip of job photos with a camera tile (and gallery fallback). */
function PhotoRow({ title, required, done, photos, busy, locked, onAdd, onRemove }: {
  title: string; required?: boolean; done: boolean; photos: string[]; busy: boolean; locked?: boolean;
  onAdd: (camera: boolean) => void; onRemove: (i: number) => void;
}) {
  return (
    <View style={{ gap: 8 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        <Text weight="semibold" style={{ fontSize: 13, flex: 1 }}>
          {title}{required && !done ? <Text color={colors.error}> *</Text> : null}
        </Text>
        {done && <Feather name="check-circle" size={15} color={colors.success} />}
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
        {photos.map((uri, i) => (
          <View key={`${uri.slice(-16)}-${i}`}>
            <Image source={{ uri }} style={styles.thumb} resizeMode="cover" />
            {!locked && (
              <Pressable style={styles.thumbX} onPress={() => onRemove(i)} hitSlop={6}>
                <Feather name="x" size={11} color={colors.white} />
              </Pressable>
            )}
          </View>
        ))}
        {!locked && photos.length < MAX_PHOTOS && (
          <Pressable style={styles.addTile} onPress={() => onAdd(true)} onLongPress={() => onAdd(false)}>
            {busy ? (
              <ActivityIndicator color={colors.primary} />
            ) : (
              <>
                <Feather name="camera" size={20} color={colors.primary} />
                <Text variant="bodySm" color={colors.primary} weight="semibold" style={{ fontSize: 10 }}>Add</Text>
              </>
            )}
          </Pressable>
        )}
      </ScrollView>

      {!locked && (
        <Pressable onPress={() => onAdd(false)} style={{ alignSelf: 'flex-start' }}>
          <Text variant="bodySm" weight="semibold" color={colors.primary} style={{ fontSize: 12 }}>Choose from gallery</Text>
        </Pressable>
      )}
    </View>
  );
}

function Row({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <View style={styles.pkgRow}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
        <Feather name={accent ? 'plus-circle' : 'check-circle'} size={15} color={accent ? colors.accent600 : colors.primary} />
        <Text color={colors.textSecondary} style={{ flex: 1 }}>{label}</Text>
      </View>
      <Text variant="bodySm" color={colors.textDisabled}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surface },
  map: { position: 'relative' },
  navBtn: { position: 'absolute', bottom: 12, right: 12, flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.primary, borderRadius: radius.md, paddingVertical: 9, paddingHorizontal: 14, ...shadow.button },
  reqTag: { backgroundColor: colors.accent, borderRadius: 6, paddingVertical: 3, paddingHorizontal: 8 },
  pkgRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#F9FAFB' },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 2, borderTopColor: colors.border, marginTop: 8, paddingTop: 12 },
  chatBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: colors.primary50, borderRadius: radius.lg, height: 50 },
  thumb: { width: 84, height: 84, borderRadius: radius.md, backgroundColor: colors.surface },
  thumbX: {
    position: 'absolute', top: -5, right: -5, width: 20, height: 20, borderRadius: 10,
    backgroundColor: colors.error, alignItems: 'center', justifyContent: 'center',
  },
  addTile: {
    width: 84, height: 84, borderRadius: radius.md, borderWidth: 1.5, borderStyle: 'dashed',
    borderColor: colors.primary200, backgroundColor: colors.primary50, alignItems: 'center', justifyContent: 'center', gap: 3,
  },
  footer: { padding: 16, paddingTop: 12, backgroundColor: colors.white, borderTopWidth: 1, borderTopColor: '#F0F0F0', ...shadow.card },
  doneRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, height: 52 },
});
