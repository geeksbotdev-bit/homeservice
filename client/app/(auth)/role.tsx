import { useState } from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { Text, Button, NavBar } from '../../src/components';
import { colors, radius, shadow } from '../../src/theme/theme';

type Role = 'client' | 'professional';

export default function RolePick() {
  const router = useRouter();
  const [role, setRole] = useState<Role>('client');

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      <NavBar showLogo bordered={false} />
      <View style={styles.body}>
        <Text variant="display" center style={{ fontSize: 26 }}>How will you use{'\n'}HomeService?</Text>
        <Text variant="bodyLg" center color={colors.textTertiary} style={{ fontSize: 14, marginTop: 8, marginBottom: 28 }}>
          Choose your account type. You can use the same number for either.
        </Text>

        <Option
          active={role === 'client'}
          onPress={() => setRole('client')}
          icon="home"
          title="I'm a Customer"
          subtitle="Book trusted cleaners for your home — pay after the job."
        />
        <Option
          active={role === 'professional'}
          onPress={() => setRole('professional')}
          icon="briefcase"
          title="I'm a Cleaner"
          subtitle="Get job requests near you, track work, and earn in PKR."
        />

        <Button
          label="Continue"
          iconRight="arrow-right"
          onPress={() => router.push({ pathname: '/(auth)/phone', params: { role } })}
          style={{ marginTop: 'auto' }}
        />
      </View>
    </SafeAreaView>
  );
}

function Option({ active, onPress, icon, title, subtitle }: { active: boolean; onPress: () => void; icon: any; title: string; subtitle: string }) {
  return (
    <Pressable onPress={onPress} style={[styles.card, active && styles.cardOn]}>
      <View style={[styles.icon, active && { backgroundColor: colors.primary }]}>
        <Feather name={icon} size={22} color={active ? colors.white : colors.primary} />
      </View>
      <View style={{ flex: 1 }}>
        <Text weight="bold" style={{ fontSize: 16 }}>{title}</Text>
        <Text variant="bodySm" color={colors.textTertiary} style={{ marginTop: 2, lineHeight: 18 }}>{subtitle}</Text>
      </View>
      <View style={[styles.radio, active && styles.radioOn]}>{active && <View style={styles.radioDot} />}</View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.white },
  body: { flex: 1, paddingHorizontal: 24, paddingTop: 12 },
  card: { flexDirection: 'row', alignItems: 'center', gap: 14, borderWidth: 2, borderColor: colors.border, borderRadius: radius.xl, padding: 16, marginBottom: 14 },
  cardOn: { borderColor: colors.primary, backgroundColor: '#F0FAFA', ...shadow.soft },
  icon: { width: 50, height: 50, borderRadius: radius.lg, backgroundColor: colors.primary50, alignItems: 'center', justifyContent: 'center' },
  radio: { width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  radioOn: { borderColor: colors.primary },
  radioDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: colors.primary },
});
