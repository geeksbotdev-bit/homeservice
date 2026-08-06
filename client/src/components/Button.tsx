import { Pressable, StyleSheet, View, ActivityIndicator, ViewStyle } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Text } from './Text';
import { colors, radius, shadow } from '../theme/theme';

type Variant = 'primary' | 'secondary' | 'accent' | 'ghost' | 'danger';

interface Props {
  label: string;
  onPress?: () => void;
  variant?: Variant;
  icon?: keyof typeof Feather.glyphMap;
  iconRight?: keyof typeof Feather.glyphMap;
  disabled?: boolean;
  loading?: boolean;
  loadingLabel?: string;
  fullWidth?: boolean;
  style?: ViewStyle;
}

/** Primary CTA button — 56px tall, design-system styling. */
export function Button({
  label, onPress, variant = 'primary', icon, iconRight,
  disabled, loading, loadingLabel, fullWidth = true, style,
}: Props) {
  const isDisabled = disabled || loading;
  const v = VARIANTS[variant];
  const bg = isDisabled && variant !== 'ghost' ? colors.border : v.bg;
  const fg = isDisabled && variant !== 'ghost' ? colors.textDisabled : v.fg;

  return (
    <Pressable
      onPress={isDisabled ? undefined : onPress}
      style={({ pressed }) => [
        styles.base,
        { backgroundColor: bg },
        v.border ? { borderWidth: 2, borderColor: isDisabled ? colors.border : v.border } : null,
        fullWidth ? { width: '100%' } : { paddingHorizontal: 28 },
        variant === 'primary' && !isDisabled ? shadow.button : null,
        pressed && !isDisabled ? { opacity: 0.9 } : null,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={fg} size="small" />
      ) : (
        icon && <Feather name={icon} size={18} color={fg} style={{ marginRight: 8 }} />
      )}
      <Text variant="button" color={fg}>{loading ? (loadingLabel ?? label) : label}</Text>
      {iconRight && !loading && (
        <Feather name={iconRight} size={18} color={fg} style={{ marginLeft: 8 }} />
      )}
    </Pressable>
  );
}

const VARIANTS: Record<Variant, { bg: string; fg: string; border?: string }> = {
  primary: { bg: colors.primary, fg: colors.white },
  secondary: { bg: 'transparent', fg: colors.primary, border: colors.primary },
  accent: { bg: colors.accent, fg: colors.white },
  ghost: { bg: 'transparent', fg: colors.textTertiary },
  danger: { bg: colors.errorBg, fg: colors.error },
};

const styles = StyleSheet.create({
  base: {
    height: 56,
    borderRadius: radius.xl,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default Button;
