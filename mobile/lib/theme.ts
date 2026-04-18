export const theme = {
  colors: {
    background: '#060b14',      // Deep space black
    surface: '#0d1420',         // Card background  
    surfaceLight: '#141e2e',    // Elevated surface
    primary: '#00d4aa',         // Teal accent
    primaryDark: '#00b894',     // Darker teal for gradients
    secondary: '#0099ff',       // Blue accent
    text: '#ffffff',            // Primary text
    textSecondary: '#6b7280',   // Muted text  
    textTertiary: '#4b5563',    // Very muted
    border: '#1a2332',          // Subtle borders
    danger: '#ef4444',
    success: '#22c55e',
    warning: '#f59e0b',
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 20,
    xl: 24,
    xxl: 32,
  },
  borderRadius: {
    sm: 8,
    md: 14,
    lg: 20,
    full: 999,
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
    card: {
      shadowColor: '#000',
      shadowOpacity: 0.2,
      shadowRadius: 12,
      shadowOffset: { width: 0, height: 4 },
      elevation: 8,
    },
  },
  button: {
    height: 52,
  },
  input: {
    height: 52,
    borderWidth: 1.5,
  },
  card: {
    padding: 20,
    borderWidth: 1,
  },
} as const;

export type Theme = typeof theme;
export type ThemeColors = typeof theme.colors;
