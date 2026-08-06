import { View, StyleSheet } from 'react-native';
import { Text } from './Text';
import { colors, radius } from '../theme/theme';

export type BookingStatus =
  | 'pending' | 'confirmed' | 'on_the_way' | 'arrived' | 'in_progress' | 'completed' | 'cancelled';

const MAP: Record<BookingStatus, { label: string; dot: string; bg: string; text: string }> = {
  pending:     { label: 'Payment pending', dot: colors.warning, bg: colors.warningBg, text: colors.warningText },
  confirmed:   { label: 'Confirmed',   dot: colors.primary,  bg: colors.primary50, text: colors.primary700 },
  on_the_way:  { label: 'On the Way',  dot: colors.warning,  bg: colors.warningBg, text: colors.warningText },
  arrived:     { label: 'Arrived',     dot: colors.arrived,  bg: colors.arrivedBg, text: colors.arrivedText },
  in_progress: { label: 'In Progress', dot: colors.primary,  bg: colors.primary50, text: colors.primary700 },
  completed:   { label: 'Completed',   dot: colors.success,  bg: colors.successBg, text: colors.successText },
  cancelled:   { label: 'Cancelled',   dot: colors.error,    bg: colors.errorBg,   text: colors.errorText },
};

/** Booking lifecycle status chip (light variant). */
export function StatusBadge({ status }: { status: BookingStatus }) {
  const s = MAP[status];
  return (
    <View style={[styles.badge, { backgroundColor: s.bg }]}>
      <View style={[styles.dot, { backgroundColor: s.dot }]} />
      <Text variant="bodySm" weight="semibold" color={s.text} style={{ fontSize: 12 }}>{s.label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: radius.pill,
    alignSelf: 'flex-start',
  },
  dot: { width: 6, height: 6, borderRadius: 3 },
});

export default StatusBadge;
