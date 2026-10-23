import { Image, StyleSheet } from 'react-native';

/**
 * The WithUrooj brand mark, as used on the website and the company's own
 * material. `size` is the rendered height; the width follows the artwork's
 * aspect ratio so the lock-up never distorts.
 *
 * `showWord` and `light` are kept for the screens that already pass them — the
 * artwork includes the wordmark, and it reads correctly on both light and dark
 * backgrounds, so neither changes what is drawn.
 */
export function Logo({ size = 54 }: { size?: number; showWord?: boolean; light?: boolean }) {
  const ratio = 279 / 220; // intrinsic size of the asset
  return (
    <Image
      source={require('../../assets/logo-withurooj.png')}
      style={[styles.logo, { height: size, width: size * ratio }]}
      resizeMode="contain"
      accessibilityRole="image"
      accessibilityLabel="WithUrooj"
    />
  );
}

const styles = StyleSheet.create({
  logo: { alignSelf: 'center' },
});

export default Logo;
