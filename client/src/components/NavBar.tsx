import { View, Pressable, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Text } from './Text';
import { Logo } from './Logo';
import { colors } from '../theme/theme';

interface Props {
  title?: string;
  showLogo?: boolean;
  rightIcon?: keyof typeof Feather.glyphMap;
  onRight?: () => void;
  onBack?: () => void;
  bordered?: boolean;
}

/** Top app bar: round back button · centred title (or logo) · optional right action. */
export function NavBar({ title, showLogo, rightIcon, onRight, onBack, bordered = true }: Props) {
  const router = useRouter();
  return (
    <View style={[styles.bar, bordered && styles.bordered]}>
      <Pressable
        onPress={onBack ?? (() => (router.canGoBack() ? router.back() : router.replace('/(tabs)')))}
        style={styles.circle}
      >
        <Feather name="chevron-left" size={20} color={colors.textSecondary} />
      </Pressable>

      {showLogo ? <Logo /> : <Text variant="h2" style={{ fontSize: 16 }}>{title}</Text>}

      {rightIcon ? (
        <Pressable onPress={onRight} style={styles.circle}>
          <Feather name={rightIcon} size={18} color={colors.textSecondary} />
        </Pressable>
      ) : (
        <View style={{ width: 38 }} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    backgroundColor: colors.white,
  },
  bordered: { borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  circle: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: colors.surface,
    alignItems: 'center', justifyContent: 'center',
  },
});

export default NavBar;
