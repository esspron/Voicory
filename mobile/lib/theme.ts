import { Platform, StyleSheet } from 'react-native';

// ═══════════════════════════════════════════════════════════════════════════════
// VOICORY DESIGN SYSTEM — Single source of truth
// Apple Design Award quality. Every screen imports from here.
// ═══════════════════════════════════════════════════════════════════════════════

export const colors = {
  // Backgrounds
  bg: '#050a12',
  surface: '#0c1219',
  surfaceRaised: '#111a24',
  surfaceElevated: '#161f2d',

  // Borders
  border: '#1a2332',
  borderLight: '#1a233340',
  borderFocus: '#00d4aa50',

  // Primary palette
  primary: '#00d4aa',
  primaryDark: '#00b894',
  primaryMuted: '#00d4aa15',
  primaryGlow: '#00d4aa30',

  // Secondary
  secondary: '#0099ff',
  secondaryMuted: '#0099ff15',

  // Text
  text: '#f0f2f5',
  textSecondary: '#8b95a5',
  textMuted: '#7a8599',
  textFaint: '#3d4a5c',
  textInverse: '#000000',

  // Semantic
  danger: '#ef4444',
  dangerMuted: '#ef444415',
  success: '#22c55e',
  successMuted: '#22c55e15',
  warning: '#f59e0b',
  warningMuted: '#f59e0b15',

  // Overlays
  overlay: 'rgba(0,0,0,0.5)',
  shimmer: '#1a2332',
  shimmerHighlight: '#243040',
} as const;

export const spacing = {
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  xxxxl: 40,
} as const;

export const radii = {
  xs: 6,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  full: 9999,
} as const;

export const typography = {
  // Display
  displayLg: { fontSize: 40, fontWeight: '800' as const, letterSpacing: -1, lineHeight: 44 },
  displayMd: { fontSize: 32, fontWeight: '800' as const, letterSpacing: -0.5, lineHeight: 38 },
  displaySm: { fontSize: 28, fontWeight: '800' as const, letterSpacing: -0.5, lineHeight: 34 },

  // Headings
  h1: { fontSize: 24, fontWeight: '700' as const, letterSpacing: -0.3, lineHeight: 30 },
  h2: { fontSize: 20, fontWeight: '700' as const, letterSpacing: -0.2, lineHeight: 26 },
  h3: { fontSize: 17, fontWeight: '700' as const, lineHeight: 22 },

  // Body
  bodyLg: { fontSize: 16, fontWeight: '500' as const, lineHeight: 22 },
  body: { fontSize: 15, fontWeight: '400' as const, lineHeight: 21 },
  bodySm: { fontSize: 14, fontWeight: '500' as const, lineHeight: 20 },

  // Captions
  caption: { fontSize: 13, fontWeight: '500' as const, lineHeight: 18 },
  captionSm: { fontSize: 12, fontWeight: '500' as const, lineHeight: 16 },
  captionXs: { fontSize: 11, fontWeight: '600' as const, lineHeight: 14 },

  // Labels
  label: { fontSize: 13, fontWeight: '600' as const, letterSpacing: 0.3 },
  labelSm: { fontSize: 12, fontWeight: '600' as const, letterSpacing: 0.3 },
  labelXs: { fontSize: 10, fontWeight: '600' as const, letterSpacing: 0.5 },

  // Section headers
  sectionHeader: { fontSize: 13, fontWeight: '700' as const, letterSpacing: 0.8, textTransform: 'uppercase' as const },

  // Buttons
  buttonLg: { fontSize: 16, fontWeight: '700' as const, letterSpacing: 0.3 },
  button: { fontSize: 15, fontWeight: '600' as const },
  buttonSm: { fontSize: 13, fontWeight: '600' as const },
} as const;

export const shadows = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 8,
  },
  glow: (color: string) => ({
    shadowColor: color,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  }),
} as const;

// Common layout patterns
export const layout = {
  screenPaddingH: 20,
  // Safe area top padding (use SafeAreaView instead when possible)
  screenPaddingTop: Platform.OS === 'ios' ? 60 : 48,
  tabBarHeight: Platform.OS === 'ios' ? 88 : 64,
  cardPadding: 20,
  inputHeight: 52,
  buttonHeight: 52,
  iconButtonSize: 44,
  avatarSm: 36,
  avatarMd: 48,
  avatarLg: 60,
} as const;

// Animation durations
export const durations = {
  fast: 150,
  normal: 250,
  slow: 350,
  spring: { damping: 15, stiffness: 150 },
} as const;

// Card style shorthand
export const cardStyle = {
  backgroundColor: colors.surface,
  borderRadius: radii.xl,
  borderWidth: 1,
  borderColor: colors.border,
  ...shadows.md,
} as const;

// Backward compat — legacy `theme` export
export const theme = {
  colors: {
    background: colors.bg,
    surface: colors.surface,
    surfaceLight: colors.surfaceRaised,
    primary: colors.primary,
    primaryDark: colors.primaryDark,
    secondary: colors.secondary,
    text: colors.text,
    textSecondary: colors.textSecondary,
    textTertiary: colors.textFaint,
    border: colors.border,
    danger: colors.danger,
    success: colors.success,
    warning: colors.warning,
  },
  spacing: {
    xs: spacing.xs,
    sm: spacing.sm,
    md: spacing.lg,
    lg: spacing.xl,
    xl: spacing.xxl,
    xxl: spacing.xxxl,
  },
  borderRadius: {
    sm: radii.sm,
    md: radii.md,
    lg: radii.xl,
    full: radii.full,
  },
  fontSize: {
    xs: 12,
    sm: 13,
    md: 15,
    lg: 18,
    xl: 20,
    xxl: 28,
    xxxl: 32,
  },
  fontWeight: {
    regular: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: '700' as const,
    extrabold: '800' as const,
  },
  shadow: {
    card: shadows.md,
  },
  button: { height: 52 },
  input: { height: 52, borderWidth: 1.5 },
  card: { padding: 20, borderWidth: 1 },
} as const;

export type Theme = typeof theme;
export type ThemeColors = typeof theme.colors;
