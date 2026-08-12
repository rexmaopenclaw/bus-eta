// ============================================================
// Bus ETA Theme — SeaCast (Tide App) 深藍風格
// ============================================================

import { useColorScheme } from 'react-native';

// Color Palette — 跟 tide app (SeaCast) 深藍漸變風格
const palette = {
  white: '#FFFFFF',
  bgLight: '#0a1628',
  bgDark: '#081020',
  cardLight: '#0f1c30',
  cardDark: '#1a2a40',
  primary: '#60b0f4',
  primaryLight: '#8ab8e0',
  primaryDark: '#1a4a7a',
  teal: '#4ecdc4',
  textPrimary: '#e0e8f0',
  textSecondary: '#5a7a9a',
  textOnDark: '#e0e8f0',
  textOnDarkSecondary: '#8ab8e0',
  border: '#2a3a50',
  borderDark: '#2a3a50',
  success: '#4ecdc4',
  warning: '#e0a060',
  error: '#ff6b6b',
  orange: '#e0a060',
};

export type AppTheme = typeof lightTheme;

export const lightTheme = {
  dark: false,
  colors: {
    background: palette.bgLight,
    card: palette.cardLight,
    primary: palette.primary,
    primaryLight: palette.primaryLight,
    text: palette.textPrimary,
    textSecondary: palette.textSecondary,
    border: palette.border,
    success: palette.success,
    warning: palette.warning,
    error: palette.error,
    orange: palette.orange,
    white: palette.white,
  },
};

export const darkTheme: AppTheme = {
  dark: true,
  colors: {
    background: palette.bgDark,
    card: palette.cardDark,
    primary: palette.primary,
    primaryLight: palette.primaryDark,
    text: palette.textOnDark,
    textSecondary: palette.textOnDarkSecondary,
    border: palette.borderDark,
    success: palette.success,
    warning: palette.warning,
    error: palette.error,
    orange: palette.orange,
    white: palette.cardDark,
  },
};

export function useAppTheme(): AppTheme {
  const scheme = useColorScheme();
  return scheme === 'dark' ? darkTheme : lightTheme;
}
