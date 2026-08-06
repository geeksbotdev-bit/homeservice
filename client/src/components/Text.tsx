import { Text as RNText, TextProps, StyleSheet } from 'react-native';
import { colors, fonts } from '../theme/theme';

type Variant =
  | 'display' | 'h1' | 'h2' | 'h3'
  | 'bodyLg' | 'body' | 'bodySm' | 'caption' | 'button';

type Weight = keyof typeof fonts;

interface Props extends TextProps {
  variant?: Variant;
  weight?: Weight;
  color?: string;
  center?: boolean;
}

/** App-wide Text — always uses Plus Jakarta Sans. */
export function Text({ variant = 'body', weight, color, center, style, ...rest }: Props) {
  return (
    <RNText
      {...rest}
      style={[
        styles[variant],
        weight ? { fontFamily: fonts[weight] } : null,
        color ? { color } : null,
        center ? { textAlign: 'center' } : null,
        style,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  display: { fontFamily: fonts.extrabold, fontSize: 26, letterSpacing: -0.6, color: colors.textPrimary, lineHeight: 31 },
  h1: { fontFamily: fonts.extrabold, fontSize: 24, letterSpacing: -0.5, color: colors.textPrimary },
  h2: { fontFamily: fonts.extrabold, fontSize: 18, letterSpacing: -0.3, color: colors.textPrimary },
  h3: { fontFamily: fonts.bold, fontSize: 16, letterSpacing: -0.3, color: colors.textPrimary },
  bodyLg: { fontFamily: fonts.regular, fontSize: 16, lineHeight: 26, color: colors.textSecondary },
  body: { fontFamily: fonts.regular, fontSize: 14, color: colors.textSecondary },
  bodySm: { fontFamily: fonts.regular, fontSize: 12, color: colors.textTertiary },
  caption: { fontFamily: fonts.semibold, fontSize: 11, letterSpacing: 0.5, color: colors.textTertiary },
  button: { fontFamily: fonts.bold, fontSize: 16, color: colors.white },
});

export default Text;
