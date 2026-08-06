import { View, StyleSheet, Pressable, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { Text, NavBar } from '../src/components';
import { colors, radius } from '../src/theme/theme';
import { useLang, LANGUAGES, type Lang } from '../src/store/lang';

export default function LanguagePicker() {
  const router = useRouter();
  const { lang, setLang, t } = useLang();

  function choose(code: Lang) {
    setLang(code);
    setTimeout(() => (router.canGoBack() ? router.back() : router.replace('/(tabs)/profile')), 120);
  }

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <NavBar title={t('Choose Language')} />
      <ScrollView contentContainerStyle={{ padding: 20, gap: 12 }}>
        <Text variant="bodySm" color={colors.textTertiary} style={{ marginBottom: 4 }}>{t('Select your preferred language')}</Text>
        {LANGUAGES.map((l) => {
          const active = lang === l.code;
          return (
            <Pressable key={l.code} onPress={() => choose(l.code)} style={[styles.row, active && styles.rowOn]}>
              <View style={[styles.globe, active && { backgroundColor: colors.primary }]}>
                <Feather name="globe" size={18} color={active ? colors.white : colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text weight="bold" style={{ fontSize: 15 }}>{l.native}</Text>
                {l.native !== l.label && <Text variant="bodySm" color={colors.textTertiary}>{l.label}</Text>}
              </View>
              {active && <Feather name="check-circle" size={22} color={colors.primary} />}
            </Pressable>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.white },
  row: { flexDirection: 'row', alignItems: 'center', gap: 14, borderWidth: 1.5, borderColor: colors.border, borderRadius: radius.xl, padding: 16 },
  rowOn: { borderColor: colors.primary, backgroundColor: colors.primary50 },
  globe: { width: 46, height: 46, borderRadius: radius.lg, backgroundColor: colors.primary50, alignItems: 'center', justifyContent: 'center' },
});
