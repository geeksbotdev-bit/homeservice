import { View, TextInput, StyleSheet } from 'react-native';
import { Text } from './Text';
import { colors, radius } from '../theme/theme';

interface Props {
  value: string;                 // local part only (without +92)
  onChangeText: (v: string) => void;
  placeholder?: string;
  editable?: boolean;
}

/** Pakistani phone input with a 🇵🇰 +92 flag prefix. Holds the local number. */
export function PhoneField({ value, onChangeText, placeholder = '3XX XXX XXXX', editable = true }: Props) {
  return (
    <View style={styles.row}>
      <View style={styles.prefix}>
        <Text style={{ fontSize: 18 }}>🇵🇰</Text>
        <Text weight="bold" color={colors.textPrimary} style={{ fontSize: 15 }}>+92</Text>
      </View>
      <TextInput
        style={styles.input}
        placeholder={placeholder}
        placeholderTextColor={colors.textDisabled}
        keyboardType="phone-pad"
        value={value}
        onChangeText={(t) => onChangeText(t.replace(/[^0-9\s]/g, ''))}
        maxLength={12}
        editable={editable}
      />
    </View>
  );
}

/** Strip a leading +92 / 92 / 0 so only the local subscriber number remains. */
export function toLocalPk(full?: string): string {
  if (!full) return '';
  return full.replace(/\s+/g, '').replace(/^\+?92/, '').replace(/^0/, '');
}
/** Compose the stored E.164-ish value from the local part. */
export function toFullPk(local: string): string {
  const digits = local.replace(/\D/g, '').replace(/^0/, '');
  return digits ? `+92 ${digits}` : '';
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', borderWidth: 1.5, borderColor: colors.border, borderRadius: radius.lg, height: 52, overflow: 'hidden', backgroundColor: colors.white },
  prefix: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, borderRightWidth: 1.5, borderRightColor: colors.border, backgroundColor: '#F9FAFB' },
  input: { flex: 1, paddingHorizontal: 14, fontSize: 15, fontFamily: 'PlusJakartaSans_500Medium', color: colors.textPrimary },
});

export default PhoneField;
