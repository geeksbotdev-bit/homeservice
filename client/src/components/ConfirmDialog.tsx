import { View, StyleSheet, Pressable } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Text } from './Text';
import { colors, radius, shadow } from '../theme/theme';

interface Props {
  visible: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  icon?: any;
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * A themed in-app confirm popup. Rendered as an absolute overlay (NOT a native
 * Modal) so on web it stays inside the phone-frame column instead of escaping
 * to the browser window root.
 */
export function ConfirmDialog({
  visible, title, message, confirmLabel = 'Confirm', cancelLabel = 'Keep', danger, icon, loading, onConfirm, onCancel,
}: Props) {
  if (!visible) return null;
  const accent = danger ? colors.error : colors.primary;
  return (
    <View style={styles.backdrop}>
      <Pressable style={StyleSheet.absoluteFill} onPress={onCancel} />
      <View style={styles.card}>
        <View style={[styles.iconWrap, { backgroundColor: danger ? colors.errorBg : colors.primary50 }]}>
          <Feather name={icon || (danger ? 'alert-triangle' : 'help-circle')} size={22} color={accent} />
        </View>
        <Text weight="extrabold" style={{ fontSize: 18, marginTop: 14 }} center>{title}</Text>
        <Text color={colors.textTertiary} center style={{ marginTop: 8, lineHeight: 21, fontSize: 14 }}>{message}</Text>

        <View style={styles.row}>
          <Pressable style={[styles.btn, styles.keep]} onPress={onCancel} disabled={loading}>
            <Text weight="bold" color={colors.textSecondary}>{cancelLabel}</Text>
          </Pressable>
          <Pressable style={[styles.btn, { backgroundColor: accent }]} onPress={onConfirm} disabled={loading}>
            <Text weight="bold" color={colors.white}>{loading ? 'Please wait…' : confirmLabel}</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(17,24,39,0.45)', alignItems: 'center', justifyContent: 'center',
    padding: 28, zIndex: 1000, elevation: 1000,
  },
  card: { backgroundColor: colors.white, borderRadius: 22, padding: 24, width: '100%', maxWidth: 360, alignItems: 'center', ...shadow.card },
  iconWrap: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center' },
  row: { flexDirection: 'row', gap: 10, marginTop: 22, alignSelf: 'stretch' },
  btn: { flex: 1, height: 48, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  keep: { backgroundColor: colors.surfaceAlt },
});

export default ConfirmDialog;
