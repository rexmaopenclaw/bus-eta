// ============================================================
// 主題設定 — 支援 Dark Mode
// ============================================================

import { useColorScheme } from 'react-native';

// Color Palette
const palette = {
  white: '#FFFFFF',
  bgLight: '#F2F4F7',
  bgDark: '#0F1419',
  cardLight: '#FFFFFF',
  cardDark: '#1A1E26',
  primary: '#1A7AF5',
  primaryLight: '#E8F0FE',
  primaryDark: '#0D4F9E',
  textPrimary: '#1A1A2E',
  textSecondary: '#6B7280',
  textOnDark: '#E4E6EB',
  textOnDarkSecondary: '#9CA3AF',
  border: '#E5E7EB',
  borderDark: '#2D3340',
  success: '#10B981',
  warning: '#F59E0B',
  error: '#EF4444',
  orange: '#F97316',
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