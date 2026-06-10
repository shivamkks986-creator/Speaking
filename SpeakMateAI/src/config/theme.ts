import { MD3LightTheme, MD3DarkTheme, MD3Theme } from 'react-native-paper';
import {
  DefaultTheme as NavLightTheme,
  DarkTheme as NavDarkTheme,
  Theme as NavTheme,
} from '@react-navigation/native';

// Premium AI startup palette — Royal Purple + Electric Indigo + Neon Mint
const brand = {
  primary: '#7C5CFF',       // electric purple
  primaryDark: '#5B3FE0',
  primaryLight: '#A992FF',
  secondary: '#FF6B9D',     // hot pink
  tertiary: '#22D3EE',      // cyan accent
  accent: '#FACC15',        // gold for XP/coins
  success: '#34D399',
  warning: '#F59E0B',
  danger: '#EF4444',
};

export const colors = brand;

// Gradient presets used across the app
export const gradients = {
  primary: ['#7C5CFF', '#A992FF'] as [string, string],
  hero: ['#5B3FE0', '#7C5CFF', '#A992FF'] as [string, string, string],
  pink: ['#FF6B9D', '#FFA496'] as [string, string],
  cyan: ['#22D3EE', '#7C5CFF'] as [string, string],
  gold: ['#FACC15', '#F97316'] as [string, string],
  emerald: ['#10B981', '#22D3EE'] as [string, string],
  darkBg: ['#0A0418', '#150828', '#1F0E3D'] as [string, string, string],
  darkCard: ['rgba(124,92,255,0.15)', 'rgba(34,211,238,0.05)'] as [string, string],
  premium: ['#FACC15', '#FF6B9D', '#7C5CFF'] as [string, string, string],
};

export const lightTheme: MD3Theme = {
  ...MD3LightTheme,
  roundness: 4,
  colors: {
    ...MD3LightTheme.colors,
    primary: brand.primary,
    onPrimary: '#FFFFFF',
    primaryContainer: '#EAE5FF',
    onPrimaryContainer: '#1A1340',
    secondary: brand.secondary,
    onSecondary: '#FFFFFF',
    secondaryContainer: '#FFE3EE',
    onSecondaryContainer: '#3D1024',
    tertiary: brand.tertiary,
    onTertiary: '#00343D',
    tertiaryContainer: '#CFFAFE',
    background: '#F5F4FB',
    onBackground: '#13131A',
    surface: '#FFFFFF',
    onSurface: '#13131A',
    surfaceVariant: '#EDEDF5',
    onSurfaceVariant: '#4A4A5C',
    outline: '#C9C9D6',
    error: brand.danger,
  },
};

// Dark theme: Premium AI aesthetic — deep purple bg, glass cards, neon accents
export const darkTheme: MD3Theme = {
  ...MD3DarkTheme,
  roundness: 4,
  colors: {
    ...MD3DarkTheme.colors,
    primary: brand.primaryLight,
    onPrimary: '#1A0F3D',
    primaryContainer: '#3A2480',
    onPrimaryContainer: '#EAE0FF',
    secondary: '#FF8FB6',
    onSecondary: '#3D1024',
    secondaryContainer: '#7A1A40',
    onSecondaryContainer: '#FFE3EE',
    tertiary: '#67E8F9',
    onTertiary: '#00343D',
    tertiaryContainer: '#155E75',
    background: '#0A0418',
    onBackground: '#F2EEFF',
    surface: '#150828',
    onSurface: '#F2EEFF',
    surfaceVariant: '#241139',
    onSurfaceVariant: '#C8BBE0',
    outline: '#3A2858',
    error: '#FF6B6B',
  },
};

export const lightNavTheme: NavTheme = {
  ...NavLightTheme,
  colors: {
    ...NavLightTheme.colors,
    primary: lightTheme.colors.primary,
    background: lightTheme.colors.background,
    card: lightTheme.colors.surface,
    text: lightTheme.colors.onSurface,
    border: lightTheme.colors.outline,
    notification: lightTheme.colors.secondary,
  },
};

export const darkNavTheme: NavTheme = {
  ...NavDarkTheme,
  colors: {
    ...NavDarkTheme.colors,
    primary: darkTheme.colors.primary,
    background: darkTheme.colors.background,
    card: darkTheme.colors.surface,
    text: darkTheme.colors.onSurface,
    border: darkTheme.colors.outline,
    notification: darkTheme.colors.secondary,
  },
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  huge: 48,
};

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  pill: 999,
};
