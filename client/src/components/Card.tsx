import { View, ViewStyle, StyleProp, StyleSheet } from 'react-native';
import { Text } from './Text';
import { colors, radius, shadow, spacing } from '../theme/theme';

interface CardProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  padded?: boolean;
}

/** White rounded card with the standard design-system shadow. */
export function Card({ children, style, padded }: CardProps) {
  return (
    <View style={[styles.card, padded && { padding: spacing.md }, style]}>
      {children}
    </View>
  );
}

/** Uppercase section label used as card headers (e.g. "SERVICE SUMMARY"). */
export function SectionLabel({ children }: { children: string }) {
  return (
    <View style={styles.sectionLabel}>
      <Text variant="caption" color={colors.textDisabled} style={{ letterSpacing: 1.5, textTransform: 'uppercase', fontSize: 10 }}>
        {children}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.white,
    borderRadius: radius.xl,
    ...shadow.soft,
  },
  sectionLabel: {
    paddingHorizontal: spacing.md,
    paddingTop: 11,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.surface,
  },
});

export default Card;
