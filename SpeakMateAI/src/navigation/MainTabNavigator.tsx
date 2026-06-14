import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { MainTabParamList } from './types';
import HomeScreen from '@/screens/home/HomeScreen';
import AITutorScreen from '@/screens/tutor/AITutorScreen';
import SpeakingPracticeScreen from '@/screens/speaking/SpeakingPracticeScreen';
import InterviewCoachScreen from '@/screens/interview/InterviewCoachScreen';
import PremiumScreen from '@/screens/premium/PremiumScreen';
import ProgressScreen from '@/screens/progress/ProgressScreen';
import SettingsScreen from '@/screens/settings/SettingsScreen';
import KillSwitchGuard from '@/components/feature/KillSwitchGuard';

// Kill-switch wrapped variants — admin can disable a module from Firestore.
const TutorGuarded = () => (
  <KillSwitchGuard module="tutor" moduleLabel="AI Tutor">
    <AITutorScreen />
  </KillSwitchGuard>
);
const SpeakingGuarded = () => (
  <KillSwitchGuard module="speaking" moduleLabel="Speaking Practice">
    <SpeakingPracticeScreen />
  </KillSwitchGuard>
);
const InterviewGuarded = () => (
  <KillSwitchGuard module="interview" moduleLabel="Interview Coach">
    <InterviewCoachScreen />
  </KillSwitchGuard>
);
const PremiumGuarded = () => (
  <KillSwitchGuard module="premium" moduleLabel="Premium Store">
    <PremiumScreen />
  </KillSwitchGuard>
);

const Tab = createBottomTabNavigator<MainTabParamList>();

export default function MainTabNavigator() {
  const insets = useSafeAreaInsets();
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: '#A992FF',
        tabBarInactiveTintColor: 'rgba(242,238,255,0.5)',
        tabBarStyle: {
          backgroundColor: 'rgba(10,4,24,0.95)',
          borderTopColor: 'rgba(255,255,255,0.08)',
          borderTopWidth: 1,
          height: 60 + insets.bottom,
          paddingBottom: insets.bottom + 6,
          paddingTop: 8,
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          elevation: 16,
        },
        tabBarLabelStyle: { fontSize: 10, fontWeight: '700', marginTop: 2 },
        tabBarIcon: ({ color, focused, size }) => {
          let icon: keyof typeof Ionicons.glyphMap = 'home-outline';
          if (route.name === 'Home') icon = focused ? 'home' : 'home-outline';
          else if (route.name === 'Tutor') icon = focused ? 'chatbubbles' : 'chatbubbles-outline';
          else if (route.name === 'Speaking') icon = focused ? 'mic' : 'mic-outline';
          else if (route.name === 'Interview') icon = focused ? 'briefcase' : 'briefcase-outline';
          else if (route.name === 'Premium') icon = focused ? 'diamond' : 'diamond-outline';
          else if (route.name === 'Progress') icon = focused ? 'stats-chart' : 'stats-chart-outline';
          else if (route.name === 'Settings') icon = focused ? 'settings' : 'settings-outline';
          return <Ionicons name={icon} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Tutor" component={TutorGuarded} options={{ title: 'Tutor' }} />
      <Tab.Screen name="Speaking" component={SpeakingGuarded} options={{ title: 'Speak' }} />
      <Tab.Screen name="Interview" component={InterviewGuarded} options={{ title: 'Interview' }} />
      <Tab.Screen name="Premium" component={PremiumGuarded} options={{ title: 'Premium' }} />
      <Tab.Screen name="Progress" component={ProgressScreen} options={{ tabBarItemStyle: { display: 'none' } }} />
      <Tab.Screen name="Settings" component={SettingsScreen} options={{ tabBarItemStyle: { display: 'none' } }} />
    </Tab.Navigator>
  );
}
