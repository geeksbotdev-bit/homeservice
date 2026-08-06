import { View, StyleSheet } from 'react-native';
import { Text } from './Text';
import { colors, radius } from '../theme/theme';

/** The "HS" rounded-square mark + optional wordmark. */
export function Logo({ size = 28, showWord = true, light = false }: { size?: number; showWord?: boolean; light?: boolean }) {
  return (
    <View style={styles.row}>
      <View style={[styles.mark, { width: size, height: size, borderRadius: size * 0.25 }]}>
        <Text weight="extrabold" color={colors.white} style={{ fontSize: size * 0.43 }}>HS</Text>
      </View>
      {showWord && (
        <Text weight="bold" color={light ? colors.white : colors.textPrimary} style={{ fontSize: 15, letterSpacing: -0.3 }}>
          HomeService
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  mark: { backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center' },
});

export default Logo;
