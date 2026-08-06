import { View, Pressable } from 'react-native';
import { FontAwesome } from '@expo/vector-icons';
import { colors } from '../theme/theme';

interface Props {
  value: number;            // 0..5
  size?: number;
  gap?: number;
  onChange?: (n: number) => void; // if set, stars become tappable
}

/** Star rating — display-only, or interactive when onChange is passed. */
export function Stars({ value, size = 16, gap = 2, onChange }: Props) {
  return (
    <View style={{ flexDirection: 'row', gap }}>
      {[1, 2, 3, 4, 5].map((n) => {
        const star = (
          <FontAwesome
            name="star"
            size={size}
            color={n <= value ? colors.accent : colors.border}
          />
        );
        return onChange ? (
          <Pressable key={n} onPress={() => onChange(n)} hitSlop={4}>{star}</Pressable>
        ) : (
          <View key={n}>{star}</View>
        );
      })}
    </View>
  );
}

export default Stars;
