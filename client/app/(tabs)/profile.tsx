import { useCallback, useState } from 'react';
import { View, StyleSheet, ScrollView, Pressable, Linking, Image } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather, FontAwesome } from '@expo/vector-icons';
import { Text, Card } from '../../src/components';
import { colors, radius, shadow } from '../../src/theme/theme';
import { user as userApi, cleaners as cleanersApi } from '../../src/services/api';
import { setAuthToken, setUserRole } from '../../src/services/client';
import { useLang, LANGUAGES } from '../../src/store/lang';
import { initials } from '../../src/utils';
import type { User, Cleaner } from '../../src/data/types';

export default function Profile() {
  const router = useRouter();
  const { t, lang } = useLang();
  const langNative = LANGUAGES.find((l) => l.code === lang)?.native ?? 'English';
  const [me, setMe] = useState<User | null>(null);
  const [preferred, setPreferred] = useState<Cleaner[]>([]);
  const [favIds, setFavIds] = useState<string[]>([]);
  // Refetch whenever the tab regains focus so new data (profile, cleaners) shows.
  const load = useCallback(() => {
    userApi.me().then(setMe).catch(() => {});
    cleanersApi.preferred().then((list) => { setPreferred(list); setFavIds(list.map((c) => c.id)); }).catch(() => {});
  }, []);
  useFocusEffect(load);

  async function removeAddress(id: string) { setMe((m) => m ? { ...m, addresses: m.addresses.filter((a) => a.id !== id) } : m); await userApi.deleteAddress(id).catch(() => {}); load(); }
  async function removePayment(id: string) { setMe((m) => m ? { ...m, paymentMethods: m.paymentMethods.filter((p) => p.id !== id) } : m); await userApi.deletePayment(id).catch(() => {}); load(); }

  const [switching, setSwitching] = useState(false);
  async function switchToCleaner() {
    setSwitching(true);
    try {
      await userApi.setRole('professional');
      setUserRole('pro');
      router.replace('/(pro)');
    } catch { setSwitching(false); }
  }

  return (
    <View style={styles.root}>
      <SafeAreaView edges={['top']} style={styles.header}>
        <Pressable style={styles.editBtn} onPress={() => router.push('/profile/edit')}>
          <Feather name="edit-2" size={16} color={colors.white} />
        </Pressable>
        <View style={styles.avatarBig}>
          {me?.avatarUrl
            ? <Image source={{ uri: me.avatarUrl }} style={styles.avatarImg} />
            : <Text weight="extrabold" color={colors.white} style={{ fontSize: 26 }}>{me ? initials(me.name) : ''}</Text>}
        </View>
        <Text variant="h1" color={colors.white} style={{ fontSize: 20 }}>{me?.name}</Text>
        <Text color="rgba(255,255,255,0.7)" style={{ marginTop: 2 }}>{me?.phone}</Text>
      </SafeAreaView>

      <ScrollView contentContainerStyle={{ padding: 16, paddingTop: 20, gap: 16 }} showsVerticalScrollIndicator={false}>
        {/* Saved addresses */}
        <Section title={t('Saved Addresses')} icon="map-pin" action={t('Add')} onAction={() => router.push('/address/new')}>
          {/* Search an address (opens the searchable add screen) */}
          <Pressable onPress={() => router.push('/address/new')} style={styles.addrSearch}>
            <Feather name="search" size={16} color={colors.textDisabled} />
            <Text color={colors.textDisabled} style={{ flex: 1, fontSize: 14 }}>Search area, street, landmark…</Text>
            <Feather name="chevron-right" size={16} color={colors.textDisabled} />
          </Pressable>
          {(me?.addresses.length ?? 0) === 0 && <Empty icon="map-pin" label="No saved addresses yet — search above or tap Add." />}
          {me?.addresses.map((a, i, arr) => (
            <Row key={a.id} icon="home" title={a.label} subtitle={`${a.line1}, ${a.area}`} badge={a.isDefault ? 'Default' : undefined} onDelete={() => removeAddress(a.id)} last={i === arr.length - 1} />
          ))}
        </Section>

        {/* Payment methods */}
        <Section title={t('Payment Methods')} icon="credit-card" action={t('Add')} onAction={() => router.push('/payment/new')}>
          {(me?.paymentMethods.length ?? 0) === 0 && <Empty icon="credit-card" label="No payment methods yet. Tap Add to add one." />}
          {me?.paymentMethods.map((p, i, arr) => (
            <Row key={p.id} icon="credit-card" title={p.name} subtitle={p.detail} badge={p.isDefault ? 'Default' : undefined} onDelete={() => removePayment(p.id)} last={i === arr.length - 1} />
          ))}
        </Section>

        {/* Preferred professionals */}
        <Section title={t('Preferred Cleaners')} icon="star">
          {preferred.length === 0 && (
            <View style={{ padding: 18, alignItems: 'center', gap: 6 }}>
              <Feather name="heart" size={22} color={colors.border} />
              <Text variant="bodySm" color={colors.textDisabled} center>Cleaners you favourite after a booking will appear here.</Text>
            </View>
          )}
          {preferred.map((c) => (
            <View key={c.id} style={styles.proRow}>
              <View style={styles.proAvatar}><Text weight="bold" color={colors.primary700}>{c.initials}</Text></View>
              <View style={{ flex: 1 }}>
                <Text weight="semibold">{c.name}</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <FontAwesome name="star" size={11} color={colors.accent} />
                  <Text variant="bodySm" color={colors.textTertiary}>{c.rating} · {c.jobs} jobs</Text>
                </View>
              </View>
              <Pressable
                onPress={() => {
                  const next = !favIds.includes(c.id);
                  setFavIds((ids) => next ? [...ids, c.id] : ids.filter((x) => x !== c.id));
                  cleanersApi.setPreferred(c.id, next).catch(() => {});
                }}
                style={[styles.heart, !favIds.includes(c.id) && { backgroundColor: colors.surface }]}
              >
                <FontAwesome name={favIds.includes(c.id) ? 'heart' : 'heart-o'} size={14} color={favIds.includes(c.id) ? colors.error : colors.textDisabled} />
              </Pressable>
            </View>
          ))}
        </Section>

        {/* Settings list */}
        <Card style={{ overflow: 'hidden' }}>
          {[
            { icon: 'bell', label: t('Notifications'), onPress: () => router.push('/notifications') },
            { icon: 'globe', label: `${t('Language')} · ${langNative}`, onPress: () => router.push('/language') },
            { icon: 'help-circle', label: t('Help & Support'), onPress: () => Linking.openURL('https://wa.me/923001234567') },
            { icon: 'file-text', label: t('Terms & Privacy'), onPress: () => Linking.openURL('https://example.com/terms') },
          ].map((item, i, arr) => (
            <Pressable key={item.label} style={[styles.settingRow, i < arr.length - 1 && styles.divider]} onPress={item.onPress}>
              <Feather name={item.icon as any} size={18} color={colors.textSecondary} />
              <Text style={{ flex: 1 }} color={colors.textSecondary}>{item.label}</Text>
              <Feather name="chevron-right" size={18} color={colors.textDisabled} />
            </Pressable>
          ))}
        </Card>

        <Pressable style={styles.switchRole} onPress={switchToCleaner} disabled={switching}>
          <Feather name="briefcase" size={18} color={colors.primary} />
          <Text weight="bold" color={colors.primary}>{switching ? t('Switching…') : t('Switch to Cleaner mode')}</Text>
        </Pressable>

        <Pressable style={styles.logout} onPress={() => { setAuthToken(null); router.replace('/(auth)/welcome'); }}>
          <Feather name="log-out" size={18} color={colors.error} />
          <Text weight="bold" color={colors.error}>{t('Log Out')}</Text>
        </Pressable>

        <Text center variant="bodySm" color={colors.textDisabled}>HomeService v1.0 · Pakistan</Text>
      </ScrollView>
    </View>
  );
}

function Section({ title, icon, action, onAction, children }: { title: string; icon: any; action?: string; onAction?: () => void; children: React.ReactNode }) {
  return (
    <View>
      <View style={styles.sectionHead}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Feather name={icon} size={15} color={colors.primary} />
          <Text variant="h3" style={{ fontSize: 15 }}>{title}</Text>
        </View>
        {action && (
          <Pressable onPress={onAction} hitSlop={8} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <Feather name="plus" size={14} color={colors.primary} />
            <Text weight="semibold" color={colors.primary} style={{ fontSize: 13 }}>{action}</Text>
          </Pressable>
        )}
      </View>
      <Card style={{ overflow: 'hidden' }}>{children}</Card>
    </View>
  );
}

function Row({ icon, title, subtitle, badge, onDelete, last }: { icon: any; title: string; subtitle: string; badge?: string; onDelete?: () => void; last?: boolean }) {
  return (
    <View style={[styles.row, !last && styles.rowDivider]}>
      <View style={styles.rowIcon}><Feather name={icon} size={16} color={colors.primary} /></View>
      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Text weight="semibold" style={{ fontSize: 14 }}>{title}</Text>
          {badge && <View style={styles.defaultBadge}><Text style={{ fontSize: 10 }} weight="semibold" color={colors.primary700}>{badge}</Text></View>}
        </View>
        <Text variant="bodySm" color={colors.textTertiary} numberOfLines={1}>{subtitle}</Text>
      </View>
      {onDelete && (
        <Pressable onPress={onDelete} hitSlop={8} style={styles.rowDelete}>
          <Feather name="trash-2" size={15} color={colors.error} />
        </Pressable>
      )}
    </View>
  );
}

function Empty({ icon, label }: { icon: any; label: string }) {
  return (
    <View style={{ padding: 16, alignItems: 'center', gap: 6 }}>
      <Feather name={icon} size={20} color={colors.border} />
      <Text variant="bodySm" color={colors.textDisabled} center>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surface },
  header: { backgroundColor: colors.primary, alignItems: 'center', paddingTop: 10, paddingBottom: 24 },
  editBtn: { position: 'absolute', top: 12, right: 16, width: 38, height: 38, borderRadius: 19, backgroundColor: 'rgba(255,255,255,0.18)', alignItems: 'center', justifyContent: 'center', zIndex: 1 },
  avatarBig: { width: 72, height: 72, borderRadius: 36, backgroundColor: 'rgba(255,255,255,0.18)', alignItems: 'center', justifyContent: 'center', marginBottom: 12, overflow: 'hidden' },
  avatarImg: { width: 72, height: 72, borderRadius: 36 },
  sectionHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 },
  rowDivider: { borderBottomWidth: 1, borderBottomColor: colors.surface },
  rowDelete: { width: 34, height: 34, borderRadius: 17, backgroundColor: colors.errorBg, alignItems: 'center', justifyContent: 'center' },
  rowIcon: { width: 40, height: 40, borderRadius: radius.lg, backgroundColor: colors.primary50, alignItems: 'center', justifyContent: 'center' },
  defaultBadge: { backgroundColor: colors.primary50, borderRadius: 5, paddingHorizontal: 6, paddingVertical: 1 },
  proRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 },
  proAvatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.primary200, alignItems: 'center', justifyContent: 'center' },
  heart: { width: 34, height: 34, borderRadius: 17, backgroundColor: colors.errorBg, alignItems: 'center', justifyContent: 'center' },
  settingRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16 },
  divider: { borderBottomWidth: 1, borderBottomColor: colors.surface },
  addrSearch: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: colors.surface, borderRadius: radius.lg, height: 46, paddingHorizontal: 14, marginBottom: 4 },
  switchRole: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: colors.primary50, borderRadius: radius.lg, height: 52 },
  logout: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: colors.errorBg, borderRadius: radius.lg, height: 52 },
});
