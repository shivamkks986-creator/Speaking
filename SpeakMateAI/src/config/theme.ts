import { MD3LightTheme, MD3DarkTheme, MD3Theme } from 'react-native-paper';
import {
  DefaultTheme as NavLightTheme,
  DarkTheme as NavDarkTheme,
  Theme as NavTheme,
} from '@react-navigation/native';

// Brand palette — Royal Indigo + Sunrise Coral + Mint
const brand = {
  primary: '#6D5BFF',
  primaryDark: '#5546E0',
  secondary: '#FF7A6B',
  tertiary: '#34D399',
  warning: '#F59E0B',
  danger: '#EF4444',
};

export const lightTheme: MD3Theme = {
  ...MD3LightTheme,
  roundness: 3,
  colors: {
    ...MD3LightTheme.colors,
    primary: brand.primary,
    onPrimary: '#FFFFFF',
    primaryContainer: '#EAE5FF',
    onPrimaryContainer: '#1A1340',
    secondary: brand.secondary,
    onSecondary: '#FFFFFF',
    secondaryContainer: '#FFE3DE',
    onSecondaryContainer: '#3D1410',
    tertiary: brand.tertiary,
    onTertiary: '#062F22',
    tertiaryContainer: '#D1FAE5',
    background: '#F7F7FB',
    onBackground: '#13131A',
    surface: '#FFFFFF',
    onSurface: '#13131A',
    surfaceVariant: '#EDEDF5',
    onSurfaceVariant: '#4A4A5C',
    outline: '#C9C9D6',
    error: brand.danger,
  },
};

export const darkTheme: MD3Theme = {
  ...MD3DarkTheme,
  roundness: 3,
  colors: {
    ...MD3DarkTheme.colors,
    primary: '#9C8FFF',
    onPrimary: '#1A1340',
    primaryContainer: '#3A2FB0',
    onPrimaryContainer: '#EAE5FF',
    secondary: '#FFA396',
    onSecondary: '#3D1410',
    secondaryContainer: '#8C2D20',
    onSecondaryContainer: '#FFE3DE',
    tertiary: '#6EE7B7',
    onTertiary: '#062F22',
    tertiaryContainer: '#0F5A3F',
    background: '#0B0B12',
    onBackground: '#F2F2F7',
    surface: '#15151F',
    onSurface: '#F2F2F7',
    surfaceVariant: '#222232',
    onSurfaceVariant: '#B6B6C8',
    outline: '#3A3A4D',
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
};

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  pill: 999,
};
