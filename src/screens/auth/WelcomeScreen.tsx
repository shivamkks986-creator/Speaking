import React from 'react';
import { View, StyleSheet, Image } from 'react-native';
import { Text, Button, useTheme } from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';

import { AuthStackParamList } from '@/navigation/types';
import { APP_NAME, TAGLINE } from '@/utils/constants';

type Props = NativeStackScreenProps<AuthStackParamList, 'Welcome'>;

export default function WelcomeScreen({ navigation }: Props) {
  const theme = useTheme();
  return (
    <LinearGradient
      colors={[theme.colors.primary, theme.colors.secondary]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.container}
    >
      <View style={styles.content}>
        <View style={styles.logoWrap}>
          <Ionicons name="mic-circle" size={88} color="#fff" />
        </View>
        <Text variant="displaySmall" style={styles.title}>
          {APP_NAME}
        </Text>
        <Text variant="titleMedium" style={styles.subtitle}>
          {TAGLINE}
        </Text>

        <View style={styles.features}>
          {[
            { icon: 'chatbubbles', text: 'Chat with an AI tutor 24/7' },
            { icon: 'mic', text: 'Practise pronunciation & fluency' },
            { icon: 'briefcase', text: 'Crack mock interviews' },
            { icon: 'trending-up', text: 'Track your daily progress' },
          ].map((f) => (
            <View key={f.text} style={styles.featureRow}>
              <Ionicons name={f.icon as keyof typeof Ionicons.glyphMap} size={20} color="#fff" />
              <Text style={styles.featureText}>{f.text}</Text>
            </View>
          ))}
        </View>
      </View>

      <View style={styles.ctaWrap}>
        <Button
          mode="contained"
          buttonColor="#fff"
          textColor={theme.colors.primary}
          style={styles.cta}
          contentStyle={styles.ctaContent}
          testID="welcome-signup-btn"
          onPress={() => navigation.navigate('Signup')}
        >
          Get Started — it's free
        </Button>
        <Button
          mode="text"
          textColor="#fff"
          testID="welcome-login-btn"
          onPress={() => navigation.navigate('Login')}
        >
          I already have an account
        </Button>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 24, paddingTop: 72, paddingBottom: 36 },
  content: { flex: 1, alignItems: 'center' },
  logoWrap: { marginBottom: 16 },
  title: { color: '#fff', fontWeight: '800', textAlign: 'center' },
  subtitle: { color: 'rgba(255,255,255,0.85)', marginTop: 6, textAlign: 'center' },
  features: { marginTop: 48, alignSelf: 'stretch', gap: 14 },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: 'rgba(255,255,255,0.18)',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 14,
  },
  featureText: { color: '#fff', fontSize: 15, fontWeight: '500' },
  ctaWrap: { gap: 8 },
  cta: { borderRadius: 16 },
  ctaContent: { height: 52 },
});
