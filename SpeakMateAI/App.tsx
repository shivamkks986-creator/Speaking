import 'react-native-gesture-handler';
import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { PaperProvider } from 'react-native-paper';
import { NavigationContainer } from '@react-navigation/native';

import { ThemeProvider, useAppTheme } from '@/contexts/ThemeContext';
import { AuthProvider } from '@/contexts/AuthContext';
import { ProgressProvider } from '@/contexts/ProgressContext';
import { GamificationProvider } from '@/contexts/GamificationContext';
import { CompanionProvider } from '@/contexts/CompanionContext';
import { RemoteConfigProvider } from '@/contexts/RemoteConfigContext';
import RootNavigator from '@/navigation/RootNavigator';
import RewardModal from '@/components/feature/RewardModal';
import ErrorBoundary from '@/components/common/ErrorBoundary';

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
