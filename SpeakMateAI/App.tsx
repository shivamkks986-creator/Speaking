// CRITICAL: must be the FIRST import — provides crypto.getRandomValues() polyfill
// that Firebase Auth needs on React Native (Hermes engine). Without this,
// Firebase signup/login fails with "auth/network-request-failed".
import 'react-native-get-random-values';
import 'react-native-gesture-handler';
import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { PaperProvider } from 'react-native-paper';
import { NavigationContainer } from '@react-navigation/native';
import * as Updates from 'expo-updates';

import { ThemeProvider, useAppTheme } from '@/contexts/ThemeContext';
import { AuthProvider } from '@/contexts/AuthContext';
import { ProgressProvider } from '@/contexts/ProgressContext';
import { GamificationProvider } from '@/contexts/GamificationContext';
import { CompanionProvider } from '@/contexts/CompanionContext';
import { RemoteConfigProvider } from '@/contexts/RemoteConfigContext';
import RootNavigator from '@/navigation/RootNavigator';
import RewardModal from '@/components/feature/RewardModal';
import ErrorBoundary from '@/components/common/ErrorBoundary';

// Silently check for an EAS Update on every cold start. If a new bundle is
// available, download it in the background and apply it on the NEXT app launch
// (no jarring reload mid-session). Development & Expo Go builds skip this.
async function checkForOTAUpdate() {
  if (__DEV__ || !Updates.isEnabled) return;
  try {
    const update = await Updates.checkForUpdateAsync();
    if (update.isAvailable) {
      await Updates.fetchUpdateAsync();
      // Apply on next launch — don't force-reload mid-session to avoid bad UX.
      // If you want immediate apply: await Updates.reloadAsync();
    }
  } catch {
    // Silent fail — never block app startup because of an OTA check.
  }
}

function ThemedApp() {
  const { paperTheme, navTheme } = useAppTheme();
  return (
    <PaperProvider theme={paperTheme}>
      <NavigationContainer theme={navTheme}>
        <AuthProvider>
          <RemoteConfigProvider>
            <ProgressProvider>
              <GamificationProvider>
                <CompanionProvider>
                  <StatusBar style="light" />
                  <RootNavigator />
                  <RewardModal />
                </CompanionProvider>
              </GamificationProvider>
            </ProgressProvider>
          </RemoteConfigProvider>
        </AuthProvider>
      </NavigationContainer>
    </PaperProvider>
  );
}

export default function App() {
  useEffect(() => {
    checkForOTAUpdate();
  }, []);
  return (
    <ErrorBoundary>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <SafeAreaProvider>
          <ThemeProvider>
            <ThemedApp />
          </ThemeProvider>
        </SafeAreaProvider>
      </GestureHandlerRootView>
    </ErrorBoundary>
  );
}
