import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { ViewStyle } from 'react-native';

type IconName = keyof typeof MaterialCommunityIcons.glyphMap;

/** Gradient rounded-square holding a service glyph (matches the mockups' service tiles). */
export function ServiceIcon({
  icon, gradient, size = 92, radius = 16, iconSize, style,
}: {
  icon: IconName;
  gradient: [string, string];
  size?: number;
  radius?: number;
  iconSize?: number;
  style?: ViewStyle;
}) {
  return (
    <LinearGradient
      colors={gradient}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[{ width: size, height: size, borderRadius: radius, alignItems: 'center', justifyContent: 'center' }, style]}
    >
      <MaterialCommunityIcons name={icon} size={iconSize ?? size * 0.5} color="#fff" />
    </LinearGradient>
  );
}

export default ServiceIcon;
