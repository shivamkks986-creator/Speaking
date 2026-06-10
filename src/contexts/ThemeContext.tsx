import React, { createContext, useContext, useEffect, useMemo, useState, useCallback } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MD3Theme } from 'react-native-paper';
import { Theme as NavTheme } from '@react-navigation/native';

import { ThemeMode } from '@/types';
import { STORAGE_KEYS } from '@/utils/constants';
import { lightTheme, darkTheme, lightNavTheme, darkNavTheme } from '@/config/theme';

interface ThemeCtx {
  mode: ThemeMode;
  isDark: boolean;
  paperTheme: MD3Theme;
  navTheme: NavTheme;
  setMode: (m: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeCtx | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const system = useColorScheme();
  const [mode, setModeState] = useState<ThemeMode>('system');

  useEffect(() => {
    (async () => {
      const saved = await AsyncStorage.getItem(STORAGE_KEYS.THEME_MODE);
      if (saved === 'light' || saved === 'dark' || saved === 'system') {
        setModeState(saved);
      }
    })();
  }, []);

  const setMode = useCallback((m: ThemeMode) => {
    setModeState(m);
    AsyncStorage.setItem(STORAGE_KEYS.THEME_MODE, m).catch(() => {});
  }, []);

  const isDark = mode === 'system' ? system === 'dark' : mode === 'dark';

  const value = useMemo<ThemeCtx>(
    () => ({
      mode,
      isDark,
      paperTheme: isDark ? darkTheme : lightTheme,
      navTheme: isDark ? darkNavTheme : lightNavTheme,
      setMode,
    }),
    [mode, isDark, setMode]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useAppTheme(): ThemeCtx {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useAppTheme must be used within ThemeProvider');
  return ctx;
}
