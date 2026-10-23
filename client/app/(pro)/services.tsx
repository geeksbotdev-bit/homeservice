import { useCallback, useState } from 'react';
import { View, StyleSheet, ScrollView, Pressable, ActivityIndicator } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { Text, Button, NavBar } from '../../src/components';
import { colors, radius } from '../../src/theme/theme';
import { pro } from '../../src/services/api';
import { alertT, toastT } from '../../src/i18n';

interface Row { id: string; name: string; category: string; icon: string }

/**
 * The services this cleaner offers.
 *
 * Jobs are only shown and pushed to cleaners who do that work, so this is what
 * decides which requests reach them. Choosing none is a valid state — it means
 * "not decided yet" and keeps showing everything, rather than quietly cutting
 * them off from work.
 */
export default function ProServices() {
  const router = useRouter();
  const [rows, setRows] = useState<Row[] | null>(null);
  const [picked, setPicked] = useState<string[]>([]);
  const [saved, setSaved] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  useFocusEffect(useCallback(() => {
    pro.services()
      .then((r) => { setRows(r.services); setPicked(r.selected); setSaved(r.selected); })
      .catch(() => setRows([]));
  }, []));

  const dirty = picked.length !== saved.length || picked.some((id) => !saved.includes(id));

  function toggle(id: string) {
    setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));
  }

  async function save() {
    if (saving) return;
    setSaving(true);
    try {
      const r = await pro.setServices(picked);
      setSaved(r.selected);
      setPicked(r.selected);
      toastT('Services updated', picked.length === 0
        ? 'You will keep seeing every job until you choose.'
        : 'You will only be sent jobs for these services.');
      router.canGoBack() ? router.back() : router.replace('/(pro)');
    } catch (e: any) {
      alertT('Could not save', e?.message || 'Please try again.');
    } finally {
      setSaving(false);
    }
  }

  // Grouped the way the catalogue is organised, so a long list stays readable.
  const groups = (rows ?? []).reduce<Record<string, Row[]>>((acc, r) => {
    (acc[r.category] ||= []).push(r);
    return acc;
  }, {});

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <NavBar title="My services" />

      {rows === null ? (
        <ActivityIndicator color={colors.primary} style={{ paddingVertical: 40 }} />
      ) : (
        <>
          <ScrollView contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: 24 }}>
            <View style={styles.note}>
              <Feather name="info" size={15} color={colors.primary} />
              <Text variant="bodySm" color={colors.textSecondary} style={{ flex: 1, lineHeight: 19 }}>
                {picked.length === 0
                  ? 'You have not chosen yet, so you are shown every job. Pick the work you actually do to stop getting the rest.'
                  : `You will be sent jobs for ${picked.length} service${picked.length > 1 ? 's' : ''}.`}
              </Text>
            </View>

            {Object.entries(groups).map(([cat, items]) => (
              <View key={cat}>
                <Text variant="caption" color={colors.textTertiary} style={{ letterSpacing: 0.8, marginBottom: 8 }}>
                  {cat.toUpperCase()}
                </Text>
                <View style={styles.card}>
                  {items.map((r, i) => {
                    const on = picked.includes(r.id);
                    return (
                      <Pressable
                        key={r.id}
                        onPress={() => toggle(r.id)}
                        style={[styles.row, i < items.length - 1 && styles.rowBorder]}
                        accessibilityRole="checkbox"
                        accessibilityState={{ checked: on }}
                      >
                        <View style={[styles.box, on && styles.boxOn]}>
                          {on && <Feather name="check" size={13} color={colors.white} />}
                        </View>
                        <Text style={{ flex: 1, fontSize: 14 }} numberOfLines={1}>{r.name}</Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            ))}

            {rows.length === 0 && (
              <Text color={colors.textTertiary} center style={{ paddingVertical: 30 }}>
                No services are available yet.
              </Text>
            )}
          </ScrollView>

          <View style={styles.footer}>
            <Pressable onPress={() => setPicked(rows.map((r) => r.id))} hitSlop={8}>
              <Text variant="bodySm" weight="semibold" color={colors.textTertiary}>Select all</Text>
            </Pressable>
            <Button
              label={dirty ? 'Save changes' : 'Saved'}
              icon="check"
              onPress={save}
              disabled={!dirty}
              loading={saving}
              loadingLabel="Saving..."
              fullWidth={false}
              style={{ paddingHorizontal: 26, height: 48 }}
            />
          </View>
        </>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surface },
  note: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, backgroundColor: colors.primary50, borderRadius: radius.lg, padding: 14 },
  card: { backgroundColor: colors.white, borderRadius: radius.lg, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, paddingVertical: 13 },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: colors.surfaceAlt },
  box: { width: 21, height: 21, borderRadius: 6, borderWidth: 2, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  boxOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: colors.white },
});
