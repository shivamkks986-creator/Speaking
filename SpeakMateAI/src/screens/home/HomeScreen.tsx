import React, { useMemo } from 'react';
import { View, StyleSheet, ScrollView, Pressable } from 'react-native';
import { Text, useTheme, Avatar } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { RootStackParamList } from '@/navigation/types';
import { useAuth } from '@/contexts/AuthContext';
import { useProgress } from '@/contexts/ProgressContext';
import { VOCAB_WORDS } from '@/data/vocabulary';
import Card from '@/components/common/Card';
import StreakBadge from '@/components/feature/StreakBadge';
import ScreenContainer from '@/components/common/ScreenContainer';
import { radius } from '@/config/theme';

type Nav = NativeStackNavigationProp<RootStackParamList>;

interface Action {
  label: string;
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
  colors: [string, string];
  onPress: () => void;
  testID: string;
}

export default function HomeScreen() {
  const theme = useTheme();
  const navigation = useNavigation<Nav>();
  const { user } = useAuth();
  const { stats } = useProgress();

  const wordOfDay = useMemo(() => {
    const idx = new Date().getDate() % VOCAB_WORDS.length;
    return VOCAB_WORDS[idx];
  }, []);

  const greeting = useMemo(() => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 18) return 'Good afternoon';
    return 'Good evening';
  }, []);

  const actions: Action[] = [
    {
      label: 'AI Tutor',
      description: 'Chat & get grammar fixes',
      icon: 'chatbubbles',
      colors: ['#6D5BFF', '#9C8FFF'],
      onPress: () => navigation.navigate('Main', { screen: 'Tutor' }),
      testID: 'home-action-tutor',
    },
    {
      label: 'Speak',
      description: 'Practise pronunciation',
      icon: 'mic',
      colors: ['#FF7A6B', '#FFA396'],
      onPress: () => navigation.navigate('Main', { screen: 'Speaking' }),
      testID: 'home-action-speak',
    },
    {
      label: 'Vocabulary',
      description: 'Build your word bank',
      icon: 'book',
      colors: ['#34D399', '#6EE7B7'],
      onPress: () => navigation.navigate('Vocabulary'),
      testID: 'home-action-vocab',
    },
    {
      label: 'Mock Interview',
      description: 'HR interview practice',
      icon: 'briefcase',
      colors: ['#F59E0B', '#FBBF24'],
      onPress: () => navigation.navigate('MockInterview'),
      testID: 'home-action-interview',
    },
  ];

  return (
    <ScreenContainer scroll padded={false}>
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
            {greeting},
          </Text>
          <Text variant="headlineSmall" style={{ fontWeight: '700' }} numberOfLines={1}>
            {user?.displayName || 'Learner'} 👋
          </Text>
        </View>
        <Pressable onPress={() => navigation.navigate('Profile')} testID="home-profile-btn">
          {user?.photoURL ? (
            <Avatar.Image size={44} source={{ uri: user.photoURL }} />
          ) : (
            <Avatar.Text
              size={44}
              label={(user?.displayName || 'U').slice(0, 1).toUpperCase()}
              color="#fff"
              style={{ backgroundColor: theme.colors.primary }}
            />
          )}
        </Pressable>
      </View>

      <View style={styles.contentWrap}>
        <LinearGradient
          colors={[theme.colors.primary, theme.colors.secondary]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.streakHero}
        >
          <View style={{ flex: 1 }}>
            <Text style={styles.streakLabel}>YOUR STREAK 🔥</Text>
            <Text style={styles.streakNumber}>
              {stats.streak}
              <Text style={styles.streakDays}> days</Text>
            </Text>
            <Text style={styles.streakSubtitle}>
              {stats.streak === 0
                ? 'Start your streak today!'
                : 'Keep going — consistency wins.'}
            </Text>
          </View>
          <View style={styles.heroStats}>
            <StatPill label="Words" value={stats.wordsLearned} />
            <StatPill label="Chats" value={stats.conversationsCount} />
            <StatPill label="Min" value={stats.totalMinutes} />
          </View>
        </LinearGradient>

        <Text variant="titleMedium" style={styles.sectionTitle}>
          Quick start
        </Text>
        <View style={styles.actionsGrid}>
          {actions.map((a) => (
            <Pressable
              key={a.label}
              onPress={a.onPress}
              style={({ pressed }) => [styles.actionWrap, { opacity: pressed ? 0.85 : 1 }]}
              testID={a.testID}
            >
              <LinearGradient
                colors={a.colors}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.actionCard}
              >
                <Ionicons name={a.icon} size={26} color="#fff" />
                <Text style={styles.actionLabel}>{a.label}</Text>
                <Text style={styles.actionDesc}>{a.description}</Text>
              </LinearGradient>
            </Pressable>
          ))}
        </View>

        <View style={styles.rowBetween}>
          <Text variant="titleMedium" style={styles.sectionTitle}>
            Word of the day
          </Text>
          <Pressable onPress={() => navigation.navigate('Vocabulary')}>
            <Text style={{ color: theme.colors.primary, fontWeight: '700' }}>See all →</Text>
          </Pressable>
        </View>
        <Card>
          <View style={styles.wodHeader}>
            <Text variant="headlineSmall" style={{ fontWeight: '800' }}>
              {wordOfDay.word}
            </Text>
            <StreakBadge streak={stats.streak} />
          </View>
          <Text variant="labelMedium" style={{ color: theme.colors.onSurfaceVariant }}>
            {wordOfDay.partOfSpeech} · {wordOfDay.hindiMeaning}
          </Text>
          <Text style={{ marginTop: 8 }}>{wordOfDay.meaning}</Text>
          <View
            style={[styles.exampleBox, { backgroundColor: theme.colors.primaryContainer }]}
          >
            <Text style={{ color: theme.colors.onPrimaryContainer, fontStyle: 'italic' }}>
              “{wordOfDay.example}”
            </Text>
          </View>
        </Card>

        {!user?.isPremium ? (
          <Pressable
            onPress={() => navigation.navigate('Premium')}
            testID="home-premium-cta"
          >
            <LinearGradient
              colors={['#1A1340', '#3A2FB0']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.premiumCard}
            >
              <Ionicons name="diamond" size={28} color="#FFD86B" />
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={{ color: '#fff', fontSize: 16, fontWeight: '700' }}>
                  Upgrade to Premium
                </Text>
                <Text style={{ color: 'rgba(255,255,255,0.85)', marginTop: 2, fontSize: 13 }}>
                  Unlimited chats, interviews & advanced feedback.
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={22} color="#fff" />
            </LinearGradient>
          </Pressable>
        ) : null}
      </View>
    </ScreenContainer>
  );
}

function StatPill({ label, value }: { label: string; value: number }) {
  return (
    <View style={styles.pill}>
      <Text style={styles.pillValue}>{value}</Text>
      <Text style={styles.pillLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 4,
    paddingBottom: 12,
  },
  contentWrap: { paddingHorizontal: 16, gap: 16 },
  streakHero: {
    borderRadius: radius.xl,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
  },
  streakLabel: { color: 'rgba(255,255,255,0.85)', fontSize: 12, fontWeight: '700', letterSpacing: 1 },
  streakNumber: { color: '#fff', fontSize: 48, fontWeight: '800', marginTop: 2 },
  streakDays: { fontSize: 18, fontWeight: '600' },
  streakSubtitle: { color: 'rgba(255,255,255,0.85)', marginTop: 2 },
  heroStats: { gap: 8 },
  pill: {
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 6,
    minWidth: 56,
    alignItems: 'center',
  },
  pillValue: { color: '#fff', fontWeight: '800', fontSize: 16 },
  pillLabel: { color: 'rgba(255,255,255,0.85)', fontSize: 11 },
  sectionTitle: { fontWeight: '700', marginTop: 8 },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  actionWrap: { width: '48%' },
  actionCard: {
    borderRadius: radius.lg,
    padding: 16,
    height: 110,
    justifyContent: 'space-between',
  },
  actionLabel: { color: '#fff', fontWeight: '700', fontSize: 16 },
  actionDesc: { color: 'rgba(255,255,255,0.85)', fontSize: 12 },
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  wodHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  exampleBox: { marginTop: 12, padding: 12, borderRadius: 12 },
  premiumCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: radius.lg,
    marginTop: 8,
    marginBottom: 16,
  },
});
