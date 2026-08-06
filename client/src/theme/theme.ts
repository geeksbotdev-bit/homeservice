/**
 * HomeService Design System v1.0 — design tokens
 * Mirrors the provided "HomeService Design System" spec exactly.
 * Primary: #0B7C82 (deep teal) · Accent: #F39C12 (warm orange)
 * Font: Plus Jakarta Sans · Currency: PKR · Market: Pakistan
 */

export const colors = {
  // Primary — Deep Teal
  primary50: '#E6F4F5',
  primary200: '#B3DFE2',
  primary400: '#1A9BA3',
  primary: '#0B7C82', // 500 — drives all interactive elements
  primary700: '#065A5E',
  primary900: '#03383B',

  // Accent — Warm Orange
  accent50: '#FEF3DC',
  accent200: '#FADA92',
  accent: '#F39C12', // 400 — promotions & highlights
  accent600: '#D68910',
  accent800: '#9A6109',

  // Semantic
  success: '#059669',
  successBg: '#D1FAE5',
  successText: '#065F46',
  warning: '#D97706',
  warningBg: '#FEF3C7',
  warningText: '#92400E',
  error: '#DC2626',
  errorBg: '#FEF2F2',
  errorText: '#991B1B',
  arrived: '#7C3AED',
  arrivedBg: '#EDE9FE',
  arrivedText: '#5B21B6',

  // Neutrals & surface
  textPrimary: '#111827',
  textSecondary: '#374151',
  textTertiary: '#6B7280',
  textDisabled: '#9CA3AF',
  border: '#E5E7EB',
  surface: '#F3F4F6',
  surfaceAlt: '#F8FAFA',
  white: '#FFFFFF',
  black: '#111111',
};

// 4px base spacing scale
export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

// Rounded, friendly radii
export const radius = {
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  xxl: 24,
  pill: 999,
};

export const shadow = {
  card: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  button: {
    shadowColor: '#0B7C82',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.3,
    shadowRadius: 14,
    elevation: 6,
  },
  soft: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 1,
  },
};

// Plus Jakarta Sans weights (loaded in app/_layout.tsx)
export const fonts = {
  light: 'PlusJakartaSans_300Light',
  regular: 'PlusJakartaSans_400Regular',
  medium: 'PlusJakartaSans_500Medium',
  semibold: 'PlusJakartaSans_600SemiBold',
  bold: 'PlusJakartaSans_700Bold',
  extrabold: 'PlusJakartaSans_800ExtraBold',
};

// Type scale (from the design system "Typography" section)
export const type = {
  display: { fontFamily: fonts.extrabold, fontSize: 32, letterSpacing: -1, lineHeight: 36 },
  h1: { fontFamily: fonts.bold, fontSize: 24, letterSpacing: -0.5 },
  h2: { fontFamily: fonts.bold, fontSize: 20 },
  h3: { fontFamily: fonts.semibold, fontSize: 18 },
  bodyLg: { fontFamily: fonts.regular, fontSize: 16, lineHeight: 26 },
  body: { fontFamily: fonts.regular, fontSize: 14 },
  bodySm: { fontFamily: fonts.regular, fontSize: 12 },
  caption: { fontFamily: fonts.medium, fontSize: 11, letterSpacing: 1 },
  button: { fontFamily: fonts.semibold, fontSize: 14 },
};

export const theme = { colors, spacing, radius, shadow, fonts, type };
export default theme;
