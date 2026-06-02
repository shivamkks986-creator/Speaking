import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from 'react-native-paper';

import { MainTabParamList } from './types';
import HomeScreen from '@/screens/home/HomeScreen';
import AITutorScreen from '@/screens/tutor/AITutorScreen';
import SpeakingPracticeScreen from '@/screens/speaking/SpeakingPracticeScreen';
import ProgressScreen from '@/screens/progress/ProgressScreen';
import SettingsScreen from '@/screens/settings/SettingsScreen';

const Tab = createBottomTabNavigator<MainTabParamList>();

export default function MainTabNavigator() {
  const theme = useTheme();
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.onSurfaceVariant,
        tabBarStyle: {
          backgroundColor: theme.colors.surface,
          borderTopColor: theme.colors.outline,
          height: 60,
          paddingBottom: 8,
          paddingTop: 6,
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
        tabBarIcon: ({ color, focused, size }) => {
          let icon: keyof typeof Ionicons.glyphMap = 'home-outline';
          if (route.name === 'Home') icon = focused ? 'home' : 'home-outline';
          else if (route.name === 'Tutor') icon = focused ? 'chatbubbles' : 'chatbubbles-outline';
          else if (route.name === 'Speaking') icon = focused ? 'mic' : 'mic-outline';
          else if (route.name === 'Progress') icon = focused ? 'stats-chart' : 'stats-chart-outline';
          else if (route.name === 'Settings') icon = focused ? 'settings' : 'settings-outline';
          return <Ionicons name={icon} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Tutor" component={AITutorScreen} options={{ title: 'AI Tutor' }} />
      <Tab.Screen name="Speaking" component={SpeakingPracticeScreen} />
      <Tab.Screen name="Progress" component={ProgressScreen} />
      <Tab.Screen name="Settings" component={SettingsScreen} />
    </Tab.Navigator>
  );
}
