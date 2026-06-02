import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from 'react-native-paper';
import { View, Text } from 'react-native';

import { MainTabParamList } from './types';
import HomeScreen from '@/screens/home/HomeScreen';
import AITutorScreen from '@/screens/tutor/AITutorScreen';
import SpeakingPracticeScreen from '@/screens/speaking/SpeakingPracticeScreen';
import InterviewCoachScreen from '@/screens/interview/InterviewCoachScreen';
import PremiumScreen from '@/screens/premium/PremiumScreen';
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
          height: 64,
          paddingBottom: 8,
          paddingTop: 6,
        },
        tabBarLabelStyle: { fontSize: 10, fontWeight: '600' },
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
      <Tab.Screen name="Tutor" component={AITutorScreen} options={{ title: 'Tutor' }} />
      <Tab.Screen name="Speaking" component={SpeakingPracticeScreen} options={{ title: 'Speak' }} />
      <Tab.Screen name="Interview" component={InterviewCoachScreen} options={{ title: 'Interview' }} />
      <Tab.Screen
        name="Premium"
        component={PremiumScreen}
        options={{
          title: 'Premium',
          tabBarIcon: ({ color, focused, size }) => (
            <Ionicons name={focused ? 'diamond' : 'diamond-outline'} size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Progress"
        component={ProgressScreen}
        options={{ tabBarItemStyle: { display: 'none' } }}
      />
      <Tab.Screen
        name="Settings"
        component={SettingsScreen}
        options={{ tabBarItemStyle: { display: 'none' } }}
      />
    </Tab.Navigator>
  );
}
