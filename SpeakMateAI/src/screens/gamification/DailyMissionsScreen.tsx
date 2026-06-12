// Daily Missions — gamified daily tasks with XP/coin rewards
import React, { useMemo } from 'react';
import { View, StyleSheet, ScrollView, Pressable } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Text } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import FadeInView from '@/components/common/FadeInView';

import { RootStackParamList } from '@/navigation/types';
import { useProgress } from '@/contexts/ProgressContext';
import { useGamification } from '@/contexts/GamificationContext';
import { radius, spacing } from '@/config/theme';
import { todayKey } from '@/utils/helpers';

type Nav = NativeStackNavigationProp<RootStackParamList>;

interface Mission {
  id: string;
  title: string;
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
  colors: [string, string];
  target: number;
  current: number;
  xp: number;
  coins: number;
  action: () => void;
  testID: string;
}

export default function DailyMissionsScreen() {
  const navigation = useNavigation<Nav>();
  const { stats } = useProgress();
  const { state: gam } = useGamification();
  const today = todayKey();
  const todayIdx = new Date().getDay() === 0 ? 6 : new Date().getDay() - 1;
  const todayMinutes = stats.weeklyMinutes[todayIdx] || 0;

  const missions: Mission[] = useMemo(
    () => [
      {
        id: 'speak2',
        title: 'Speak for 2 minutes',
        description: 'Record any speaking practice',
        icon: 'mic',
        colors: ['#FF6B9D', '#FFA496'],
        target: 2,
        current: Math.min(2, todayMinutes),
        xp: 50,
        coins: 10,
        action: () => (navigation as unknown as { navigate: (n: string, p?: object) => void }).navigate('Main', { screen: 'Speaking' }),
        testID: 'mission-speak-2',
      },
      {
        id: 'chat3',
        title: 'Chat with companion 3 times',
        description: 'Send messages to your AI tutor',
        icon: 'chatbubbles',
        colors: ['#7C5CFF', '#A992FF'],
        target: 3,
        current: Math.min(3, stats.conversationsCount % 3 === 0 ? 3 : stats.conversationsCount % 3),
        xp: 30,
        coins: 5,
        action: () => (navigation as unknown as { navigate: (n: string, p?: object) => void }).navigate('Main', { screen: 'Tutor' }),
        testID: 'mission-chat-3',
      },
      {
        id: 'interview1',
        title: 'Complete 1 interview question',
        description: 'Practice with Sophia',
        icon: 'briefcase',
        colors: ['#5B3FE0', '#22D3EE'],
        target: 1,
        current: stats.interviewsCount > 0 ? 1 : 0,
        xp: 60,
        coins: 15,
        action: () => (navigation as unknown as { navigate: (n: string, p?: object) => void }).navigate('Main', { screen: 'Interview' }),
        testID: 'mission-interview-1',
      },
      {
        id: 'vocab1',
        title: 'Learn 1 new word',
        description: 'Open vocabulary and add to favourites',
        icon: 'book',
        colors: ['#34D399', '#22D3EE'],
        target: 1,
        current: stats.wordsLearned > 0 ? 1 : 0,
        xp: 25,
        coins: 5,
        action: () => navigation.navigate('Vocabulary'),
        testID: 'mission-vocab-1',
      },
      {
        id: 'challenge1',
        title: 'Complete daily challenge',
        description: '60-second prompt challenge',
        icon: 'trophy',
        colors: ['#FACC15', '#F97316'],
        target: 1,
        current: stats.dailyChallengeStreak > 0 ? 1 : 0,
        xp: 100,
        coins: 25,
        action: () => navigation.navigate('DailyChallenge'),
        testID: 'mission-daily-challenge',
      },
    ],
    [stats, todayMinutes, navigation]
  );

  const completed = missions.filter((m) => m.current >= m.target).length;
  const totalXp = missions.reduce((s, m) => s + m.xp, 0);

  return (
    <View style={{ flex: 1, backgroundColor: '#0A0418' }}>
      <LinearGradient colors={['#0A0418', '#150828', '#1F0E3D']} style={StyleSheet.absoluteFillObject} />
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        <View style={styles.header}>
          <Pressable onPress={() => navigation.goBack()} style={styles.backBtn} testID="missions-back-btn">
            <Ionicons name="chevron-back" size={22} color="#F2EEFF" />
          </Pressable>
          <Text style={styles.title}>Daily Missions</Text>
          <View style={{ width: 36 }} />
        </View>

        <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: 140 }} showsVerticalScrollIndicator={false}>
          <LinearGradient
            colors={['#7C5CFF', '#FF6B9D']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.summary}
          >
            <View style={{ flex: 1 }}>
              <Text style={styles.summaryTitle}>Today's Progress</Text>
              <Text style={styles.summarySub}>{completed}/{missions.length} missions complete · Up to {totalXp} XP</Text>
              <View style={styles.summaryBar}>
                <View style={[styles.summaryBarFill, { width: `${(completed / missions.length) * 100}%` }]} />
              </View>
            </View>
            <Ionicons name="rocket" size={36} color="#FFFFFF" />
          </LinearGradient>

          {missions.map((m, i) => {
            const pct = Math.min(1, m.current / m.target);
            const done = pct >= 1;
            return (
              <FadeInView key={m.id} delay={i * 60} duration={300} direction="up">
                <Pressable onPress={m.action} style={[styles.card, done && { opacity: 0.7 }]} testID={m.testID}>
                  <LinearGradient
                    colors={done ? ['#34D399', '#22D3EE'] : m.colors}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.iconBox}
                  >
                    <Ionicons name={done ? 'checkmark-circle' : m.icon} size={26} color="#FFFFFF" />
                  </LinearGradient>
                  <View style={{ flex: 1, marginLeft: spacing.md }}>
                    <Text style={styles.cardTitle}>{m.title}</Text>
                    <Text style={styles.cardDesc}>{m.description}</Text>
                    <View style={styles.progressTrack}>
                      <LinearGradient
                        colors={done ? ['#34D399', '#22D3EE'] : m.colors}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={[styles.progressFill, { width: `${pct * 100}%` }]}
                      />
                    </View>
                    <Text style={styles.cardMeta}>
                      {m.current}/{m.target} · +{m.xp} XP · +{m.coins} coins
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color="rgba(242,238,255,0.5)" />
                </Pressable>
              </FadeInView>
            );
          })}

          <Text style={styles.footnote}>Missions reset every day at midnight · Streak: {stats.streak}d · Coins: {gam.coins}</Text>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  backBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.06)' },
  title: { color: '#F2EEFF', fontSize: 18, fontWeight: '800' },
  summary: { flexDirection: 'row', alignItems: 'center', borderRadius: radius.xl, padding: spacing.lg, marginBottom: spacing.lg },
  summaryTitle: { color: '#FFFFFF', fontSize: 16, fontWeight: '800' },
  summarySub: { color: 'rgba(255,255,255,0.85)', fontSize: 12, marginTop: 4 },
  summaryBar: { height: 6, backgroundColor: 'rgba(0,0,0,0.25)', borderRadius: radius.pill, marginTop: 12, overflow: 'hidden' },
  summaryBarFill: { height: '100%', backgroundColor: '#FFFFFF', borderRadius: radius.pill },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: radius.xl,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  iconBox: { width: 52, height: 52, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  cardTitle: { color: '#F2EEFF', fontWeight: '800', fontSize: 14 },
  cardDesc: { color: 'rgba(242,238,255,0.6)', fontSize: 11, marginTop: 2 },
  progressTrack: { height: 4, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: radius.pill, marginTop: 8, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: radius.pill },
  cardMeta: { color: 'rgba(242,238,255,0.5)', fontSize: 10, fontWeight: '700', marginTop: 4 },
  footnote: { color: 'rgba(242,238,255,0.4)', fontSize: 11, textAlign: 'center', marginTop: spacing.lg },
});
