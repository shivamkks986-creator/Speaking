import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useTheme } from 'react-native-paper';

import { RootStackParamList } from './types';
import { useAuth } from '@/contexts/AuthContext';
import LoadingScreen from '@/components/common/LoadingScreen';

import AuthNavigator from './AuthNavigator';
import MainTabNavigator from './MainTabNavigator';
import VocabularyScreen from '@/screens/vocabulary/VocabularyScreen';
import FavoritesScreen from '@/screens/vocabulary/FavoritesScreen';
import MockInterviewScreen from '@/screens/interview/MockInterviewScreen';
import InterviewSessionScreen from '@/screens/interview/InterviewSessionScreen';
import InterviewResultsScreen from '@/screens/interview/InterviewResultsScreen';
import DailyChallengeScreen from '@/screens/speaking/DailyChallengeScreen';
import SpeakingScoreScreen from '@/screens/speaking/SpeakingScoreScreen';
import PronunciationPracticeScreen from '@/screens/speaking/PronunciationPracticeScreen';
import PremiumScreen from '@/screens/premium/PremiumScreen';
import ProfileScreen from '@/screens/settings/ProfileScreen';
import NotificationPrefsScreen from '@/screens/settings/NotificationPrefsScreen';
import PrivacyPolicyScreen from '@/screens/settings/PrivacyPolicyScreen';
import CompanionsScreen from '@/screens/companions/CompanionsScreen';
import AchievementsScreen from '@/screens/gamification/AchievementsScreen';
import VoiceCallScreen from '@/screens/speaking/VoiceCallScreen';
import PremiumDashboardScreen from '@/screens/progress/PremiumDashboardScreen';
import DailyMissionsScreen from '@/screens/gamification/DailyMissionsScreen';
import FlashcardsScreen from '@/screens/vocabulary/FlashcardsScreen';
import LiveInterviewScreen from '@/screens/interview/LiveInterviewScreen';
import InterviewDashboardScreen from '@/screens/interview/InterviewDashboardScreen';

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function RootNavigator() {
  const { user, initializing } = useAuth();
  const theme = useTheme();

  if (initializing) {
    return <LoadingScreen label="Setting things up…" />;
  }

  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: theme.colors.surface },
        headerTintColor: theme.colors.onSurface,
        headerTitleStyle: { fontWeight: '700' },
        animation: 'slide_from_right',
      }}
    >
      {!user ? (
        <Stack.Screen name="Auth" component={AuthNavigator} options={{ headerShown: false }} />
      ) : (
        <>
          <Stack.Screen name="Main" component={MainTabNavigator} options={{ headerShown: false }} />
          <Stack.Screen
            name="Vocabulary"
            component={VocabularyScreen}
            options={{ title: 'Vocabulary' }}
          />
          <Stack.Screen
            name="Favorites"
            component={FavoritesScreen}
            options={{ title: 'Favorite Words' }}
          />
          <Stack.Screen
            name="MockInterview"
            component={MockInterviewScreen}
            options={{ title: 'Mock Interview' }}
          />
          <Stack.Screen
            name="InterviewSession"
            component={InterviewSessionScreen}
            options={{ title: 'Interview Session' }}
          />
          <Stack.Screen
            name="InterviewResults"
            component={InterviewResultsScreen}
            options={{ title: 'Interview Results' }}
          />
          <Stack.Screen
            name="DailyChallenge"
            component={DailyChallengeScreen}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="SpeakingScore"
            component={SpeakingScoreScreen}
            options={{ title: 'Your Score' }}
          />
          <Stack.Screen
            name="PronunciationPractice"
            component={PronunciationPracticeScreen}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="Premium"
            component={PremiumScreen}
            options={{ title: 'Go Premium', presentation: 'modal' }}
          />
          <Stack.Screen name="Profile" component={ProfileScreen} options={{ title: 'Profile' }} />
          <Stack.Screen
            name="NotificationPrefs"
            component={NotificationPrefsScreen}
            options={{ title: 'Notifications' }}
          />
          <Stack.Screen
            name="PrivacyPolicy"
            component={PrivacyPolicyScreen}
            options={{ title: 'Privacy Policy' }}
          />
          <Stack.Screen
            name="Companions"
            component={CompanionsScreen}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="Achievements"
            component={AchievementsScreen}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="VoiceCall"
            component={VoiceCallScreen}
            options={{ headerShown: false, presentation: 'fullScreenModal' }}
          />
          <Stack.Screen
            name="PremiumDashboard"
            component={PremiumDashboardScreen}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="DailyMissions"
            component={DailyMissionsScreen}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="Flashcards"
            component={FlashcardsScreen}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="LiveInterview"
            component={LiveInterviewScreen}
            options={{ headerShown: false, presentation: 'fullScreenModal', gestureEnabled: false }}
          />
          <Stack.Screen
            name="InterviewDashboard"
            component={InterviewDashboardScreen}
            options={{ headerShown: false }}
          />
        </>
      )}
    </Stack.Navigator>
  );
}
