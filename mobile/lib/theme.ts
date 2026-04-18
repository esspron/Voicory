export const theme = {
  colors: {
    background: '#0a0f1a',
    surface: '#111827',
    surfaceLight: '#1f2937',
    primary: '#00d4aa',
    text: '#ffffff',
    textSecondary: '#9ca3af',
    border: '#374151',
    danger: '#ef4444',
    success: '#22c55e',
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 48,
  },
  borderRadius: {
    sm: 6,
    md: 12,
    lg: 16,
    full: 9999,
  },
  fontSize: {
    xs: 12,
    sm: 14,
    md: 16,
    lg: 18,
    xl: 22,
    xxl: 28,
  },
  fontWeight: {
    regular: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: '700' as const,
  },
} as const;

export type Theme = typeof theme;
export type ThemeColors = typeof theme.colors;
