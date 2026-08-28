import { Modal, View, StyleSheet, Pressable } from 'react-native';
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

/** A themed in-app confirm popup (replaces window.confirm / Alert). */
export function ConfirmDialog({
  visible, title, message, confirmLabel = 'Confirm', cancelLabel = 'Keep', danger, icon, loading, onConfirm, onCancel,
}: Props) {
  const accent = danger ? colors.error : colors.primary;
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel} statusBarTranslucent>
      <Pressable style={styles.backdrop} onPress={onCancel}>
        <Pressable style={styles.card} onPress={() => {}}>
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
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(17,24,39,0.45)', alignItems: 'center', justifyContent: 'center', padding: 28 },
  card: { backgroundColor: colors.white, borderRadius: 22, padding: 24, width: '100%', maxWidth: 360, alignItems: 'center', ...shadow.card },
  iconWrap: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center' },
  row: { flexDirection: 'row', gap: 10, marginTop: 22, alignSelf: 'stretch' },
  btn: { flex: 1, height: 48, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  keep: { backgroundColor: colors.surfaceAlt },
});

export default ConfirmDialog;
