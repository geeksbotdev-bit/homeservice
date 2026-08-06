import { useCallback, useState } from 'react';
import { View, StyleSheet, ScrollView, Pressable, Linking, Switch } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather, FontAwesome } from '@expo/vector-icons';
import { Text, Card } from '../../src/components';
import { colors, radius, shadow } from '../../src/theme/theme';
import { pro, user as userApi } from '../../src/services/api';
import { setAuthToken, setUserRole } from '../../src/services/client';
import { useLang } from '../../src/store/lang';
import type { Cleaner } from '../../src/data/types';

export default function ProProfile() {
  const router = useRouter();
  const { t } = useLang();
  const [me, setMe] = useState<Cleaner | null>(null);
  const [switching, setSwitching] = useState(false);

  useFocusEffect(useCallback(() => { pro.profile().then(setMe); }, []));

  async function toggleAvailable(v: boolean) {
    setMe((m) => (m ? { ...m, available: v } : m));
    await pro.updateProfile({ available: v });
  }

  async function switchToCustomer() {
    setSwitching(true);
    try {
      await userApi.setRole('client');
      setUserRole('client');
      router.replace('/(tabs)');
    } catch { setSwitching(false); }
  }

  const online = me?.available ?? true;

  return (
    <View style={styles.root}>
      <SafeAreaView edges={['top']} style={styles.header}>
        <Pressable style={styles.editBtn} onPress={() => router.push('/(pro)/edit')}>
          <Feather name="edit-2" size={16} color={colors.white} />
        </Pressable>
        <View style={styles.avatar}><Text weight="extrabold" color={colors.white} style={{ fontSize: 26 }}>{me?.initials ?? ''}</Text></View>
        <Text variant="h1" color={colors.white} style={{ fontSize: 20 }}>{me?.name}</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 }}>
          {(me?.jobs ?? 0) === 0 ? (
            <Text color="rgba(255,255,255,0.85)" weight="semibold">✨ New professional</Text>
          ) : (
            <>
              <FontAwesome name="star" size={13} color={colors.accent} />
              <Text weight="semibold" color={colors.white}>{me?.rating}</Text>
              <Text color="rgba(255,255,255,0.7)">· {me?.jobs} jobs completed</Text>
            </>
          )}
        </View>
        <View style={styles.proBadge}><Feather name="check-circle" size={12} color={colors.white} /><Text weight="bold" color={colors.white} style={{ fontSize: 11 }}>VERIFIED PROFESSIONAL</Text></View>
      </SafeAreaView>

      <ScrollView contentContainerStyle={{ padding: 16, gap: 16 }} showsVerticalScrollIndicator={false}>
        {/* Availability toggle */}
        <Card style={{ padding: 16, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <View style={[styles.dot, { backgroundColor: online ? colors.success : colors.textDisabled }]} />
          <View style={{ flex: 1 }}>
            <Text weight="bold" style={{ fontSize: 15 }}>{online ? 'Online' : 'Offline'}</Text>
            <Text variant="bodySm" color={colors.textTertiary}>{online ? 'Receiving new job requests' : 'Not receiving new jobs'}</Text>
          </View>
          <Switch value={online} onValueChange={toggleAvailable} trackColor={{ true: colors.primary, false: colors.border }} thumbColor={colors.white} />
        </Card>

        {/* Stats */}
        <View style={{ flexDirection: 'row', gap: 12 }}>
          <Stat icon="star" label="Rating" value={me?.rating ? String(me.rating) : 'New'} />
          <Stat icon="briefcase" label="Jobs" value={String(me?.jobs ?? '—')} />
          <Stat icon="map-pin" label="Range" value={`${me?.distanceKm ?? '—'} km`} />
        </View>

        {me?.bio && (
          <Card style={{ padding: 16 }}>
            <Text variant="caption" color={colors.textDisabled} style={{ fontSize: 10, letterSpacing: 1, marginBottom: 6 }}>ABOUT</Text>
            <Text color={colors.textSecondary} style={{ lineHeight: 21 }}>{me.bio}</Text>
          </Card>
        )}

        <Card style={{ overflow: 'hidden' }}>
          {[
            { icon: 'edit-2', label: 'Edit profile & availability', onPress: () => router.push('/(pro)/edit') },
            { icon: 'dollar-sign', label: 'Payout method', onPress: () => router.push('/(pro)/payout') },
            { icon: 'file-text', label: 'My Documents', onPress: () => Linking.openURL('https://example.com/pro/documents') },
            { icon: 'bell', label: 'Notifications', onPress: () => Linking.openURL('https://example.com/pro/notifications') },
            { icon: 'star', label: 'Reviews', onPress: () => router.push('/(pro)/reviews') },
            { icon: 'help-circle', label: 'Help & Support', onPress: () => Linking.openURL('https://wa.me/923001234567') },
          ].map((item, i, arr) => (
            <Pressable key={item.label} style={[styles.row, i < arr.length - 1 && styles.divider]} onPress={item.onPress}>
              <Feather name={item.icon as any} size={18} color={colors.textSecondary} />
              <Text style={{ flex: 1 }} color={colors.textSecondary}>{item.label}</Text>
              <Feather name="chevron-right" size={18} color={colors.textDisabled} />
            </Pressable>
          ))}
        </Card>

        <Pressable style={styles.switchRole} onPress={switchToCustomer} disabled={switching}>
          <Feather name="home" size={18} color={colors.primary} />
          <Text weight="bold" color={colors.primary}>{switching ? t('Switching…') : t('Switch to Customer mode')}</Text>
        </Pressable>

        <Pressable style={styles.logout} onPress={() => { setAuthToken(null); router.replace('/(auth)/welcome'); }}>
          <Feather name="log-out" size={18} color={colors.error} />
          <Text weight="bold" color={colors.error}>{t('Log Out')}</Text>
        </Pressable>

        <Text center variant="bodySm" color={colors.textDisabled}>HomeService Pro v1.0 · Pakistan</Text>
      </ScrollView>
    </View>
  );
}

function Stat({ icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <Card style={{ flex: 1, padding: 14, gap: 5, alignItems: 'center' }}>
      <Feather name={icon} size={17} color={colors.primary} />
      <Text weight="extrabold" style={{ fontSize: 16 }}>{value}</Text>
      <Text variant="bodySm" color={colors.textTertiary} style={{ fontSize: 11 }}>{label}</Text>
    </Card>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surface },
  header: { backgroundColor: colors.primary, alignItems: 'center', paddingTop: 10, paddingBottom: 22 },
  editBtn: { position: 'absolute', top: 12, right: 16, width: 38, height: 38, borderRadius: 19, backgroundColor: 'rgba(255,255,255,0.18)', alignItems: 'center', justifyContent: 'center', zIndex: 1 },
  avatar: { width: 72, height: 72, borderRadius: 36, backgroundColor: 'rgba(255,255,255,0.18)', alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  proBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: 'rgba(255,255,255,0.18)', borderRadius: radius.pill, paddingVertical: 5, paddingHorizontal: 12, marginTop: 12 },
  dot: { width: 12, height: 12, borderRadius: 6 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16 },
  divider: { borderBottomWidth: 1, borderBottomColor: colors.surface },
  switchRole: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: colors.primary50, borderRadius: radius.lg, height: 52 },
  logout: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: colors.errorBg, borderRadius: radius.lg, height: 52 },
});
