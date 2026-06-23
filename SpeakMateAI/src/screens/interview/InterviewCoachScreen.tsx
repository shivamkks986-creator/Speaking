// Interview Coach hub — track selection with 11 tracks, AI interviewer assignment, dashboard CTA
import React from 'react';
import { View, StyleSheet, Pressable, ScrollView } from 'react-native';
import { Text } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import FadeInView from '@/components/common/FadeInView';

import { RootStackParamList } from '@/navigation/types';
import { INTERVIEW_TRACKS } from '@/data/interviewTracks';
import { COMPANIONS } from '@/config/companions';
import { useProgress } from '@/contexts/ProgressContext';
import { useAuth } from '@/contexts/AuthContext';
import { aiService } from '@/services/aiService';
import CompanionAvatar from '@/components/feature/CompanionAvatar';
import { radius, spacing } from '@/config/theme';

type Nav = NativeStackNavigationProp<RootStackParamList>;

export default function InterviewCoachScreen() {
  const navigation = useNavigation<Nav>();
  const tabBarHeight = useBottomTabBarHeight();
  const { stats } = useProgress();
  const { user } = useAuth();
  const [difficulty, setDifficulty] = React.useState<'beginner' | 'intermediate' | 'advanced'>('intermediate');

  const readiness = aiService.computeInterviewReadiness({
    interviewsCount: stats.interviewsCount,
    bestInterviewScore: stats.bestInterviewScore,
    streak: stats.streak,
    speakingScores: stats.speakingScores,
  });

  const DIFFICULTY_OPTIONS: { id: 'beginner' | 'intermediate' | 'advanced'; label: string; desc: string; icon: keyof typeof Ionicons.glyphMap }[] = [
    { id: 'beginner', label: 'Beginner', desc: 'Easy questions, gentle feedback', icon: 'flower' },
    { id: 'intermediate', label: 'Intermediate', desc: 'Real interview pace', icon: 'flame' },
    { id: 'advanced', label: 'Advanced', desc: 'Tough follow-ups, deep grading', icon: 'rocket' },
  ];

  return (
    <View style={{ flex: 1, backgroundColor: '#0A0418' }}>
      <LinearGradient colors={['#0A0418', '#150828', '#1F0E3D']} style={StyleSheet.absoluteFillObject} />
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>Interview Coach</Text>
            <Text style={styles.subtitle}>Live AI mock interviews · 11 tracks</Text>
          </View>
          <Pressable
            onPress={() => navigation.navigate('InterviewDashboard')}
            style={styles.dashBtn}
            testID="interview-dashboard-btn"
          >
            <Ionicons name="stats-chart" size={18} color="#F2EEFF" />
          </Pressable>
        </View>

        <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: tabBarHeight + 32 }} showsVerticalScrollIndicator={false}>
          {/* Readiness hero */}
          <LinearGradient colors={['#7C5CFF', '#FF6B9D']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.readinessCard}>
            <View style={{ flex: 1 }}>
              <Text style={styles.readinessLabel}>Interview Readiness</Text>
              <Text style={styles.readinessValue}>{readiness}<Text style={styles.readinessUnit}>/100</Text></Text>
              <View style={styles.readinessBar}>
                <View style={[styles.readinessFill, { width: `${readiness}%` }]} />
              </View>
              <Text style={styles.readinessMeta}>{stats.interviewsCount} interviews · Best {stats.bestInterviewScore}</Text>
            </View>
            <Ionicons name="trophy" size={48} color="#FFFFFF" />
          </LinearGradient>

          {/* Difficulty selector */}
          <Text style={styles.section}>Difficulty level</Text>
          <View style={styles.difficultyRow}>
            {DIFFICULTY_OPTIONS.map((d) => {
              const active = difficulty === d.id;
              return (
                <Pressable
                  key={d.id}
                  onPress={() => setDifficulty(d.id)}
                  testID={`difficulty-${d.id}`}
                  style={[styles.difficultyPill, active && styles.difficultyPillActive]}
                >
                  <Ionicons name={d.icon} size={16} color={active ? '#FACC15' : 'rgba(242,238,255,0.6)'} />
                  <Text style={[styles.difficultyLabel, active && { color: '#F2EEFF' }]}>{d.label}</Text>
                </Pressable>
              );
            })}
          </View>
          <Text style={styles.difficultyDesc}>
            {DIFFICULTY_OPTIONS.find((d) => d.id === difficulty)?.desc}
          </Text>

          <Text style={styles.section}>Choose your track</Text>

          {INTERVIEW_TRACKS.map((track, i) => {
            const locked = track.premium && !user?.isPremium;
            const interviewer = COMPANIONS.find((c) => c.id === track.interviewer);
            return (
              <FadeInView key={track.id} delay={i * 40} duration={300} direction="up">
                <Pressable
                  onPress={() => {
                    if (locked) {
                      navigation.navigate('Premium');
                      return;
                    }
                    navigation.navigate('LiveInterview', { track: track.id, targetQuestions: 5, difficulty });
                  }}
                  testID={`track-${track.id}`}
                  style={styles.trackOuter}
                >
                  <LinearGradient colors={track.colors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.trackCard}>
                    <View style={styles.trackIconBox}>
                      <Ionicons name={track.icon} size={26} color="#FFFFFF" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <View style={styles.titleRow}>
                        <Text style={styles.trackTitle}>{track.title}</Text>
                        {locked && (
                          <View style={styles.lockedTag}>
                            <Ionicons name="lock-closed" size={9} color="#FFFFFF" />
                            <Text style={styles.lockedText}>PREMIUM</Text>
                          </View>
                        )}
                      </View>
                      <Text style={styles.trackDesc} numberOfLines={2}>{track.description}</Text>
                      <View style={styles.metaRow}>
                        <View style={styles.metaPill}>
                          <Ionicons name="time-outline" size={11} color="#FFFFFF" />
                          <Text style={styles.metaText}>{track.duration}</Text>
                        </View>
                        <View style={styles.metaPill}>
                          <Ionicons name="mic" size={11} color="#FFFFFF" />
                          <Text style={styles.metaText}>Live voice</Text>
                        </View>
                      </View>
                    </View>
                    {interviewer && (
                      <View style={styles.interviewerWrap}>
                        <CompanionAvatar companion={interviewer} size={36} />
                        <Text style={styles.interviewerName}>{interviewer.name}</Text>
                      </View>
                    )}
                  </LinearGradient>
                </Pressable>
              </FadeInView>
            );
          })}

          <Text style={styles.tipFooter}>
            Tip: Use the STAR framework (Situation, Task, Action, Result) for behavioural questions.
          </Text>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.sm },
  title: { color: '#F2EEFF', fontSize: 22, fontWeight: '800' },
  subtitle: { color: 'rgba(242,238,255,0.6)', fontSize: 12, marginTop: 2 },
  dashBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.06)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  readinessCard: { flexDirection: 'row', alignItems: 'center', padding: spacing.lg, borderRadius: radius.xl, gap: spacing.lg },
  readinessLabel: { color: 'rgba(255,255,255,0.85)', fontSize: 12, fontWeight: '700' },
  readinessValue: { color: '#FFFFFF', fontSize: 40, fontWeight: '800', marginTop: 4 },
  readinessUnit: { fontSize: 18, fontWeight: '600' },
  readinessBar: { height: 6, backgroundColor: 'rgba(0,0,0,0.3)', borderRadius: radius.pill, marginTop: 8, overflow: 'hidden' },
  readinessFill: { height: '100%', backgroundColor: '#FFFFFF', borderRadius: radius.pill },
  readinessMeta: { color: 'rgba(255,255,255,0.85)', fontSize: 11, marginTop: 6 },
  section: { color: '#F2EEFF', fontWeight: '800', fontSize: 15, marginTop: spacing.xl, marginBottom: spacing.md },
  trackOuter: { marginBottom: spacing.md },
  trackCard: { flexDirection: 'row', alignItems: 'center', padding: spacing.md, borderRadius: radius.xl, gap: spacing.md, minHeight: 100 },
  trackIconBox: { width: 50, height: 50, borderRadius: 25, backgroundColor: 'rgba(255,255,255,0.22)', alignItems: 'center', justifyContent: 'center' },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  trackTitle: { color: '#FFFFFF', fontSize: 16, fontWeight: '800' },
  trackDesc: { color: 'rgba(255,255,255,0.9)', fontSize: 11, marginTop: 2 },
  metaRow: { flexDirection: 'row', marginTop: 6, gap: 6 },
  metaPill: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: 'rgba(255,255,255,0.22)', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
  metaText: { color: '#FFFFFF', fontSize: 10, fontWeight: '700' },
  lockedTag: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.4)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8, gap: 3 },
  lockedText: { color: '#FFFFFF', fontSize: 9, fontWeight: '800', letterSpacing: 0.4 },
  interviewerWrap: { alignItems: 'center', gap: 2 },
  interviewerName: { color: '#FFFFFF', fontSize: 9, fontWeight: '700' },
  tipFooter: { color: 'rgba(242,238,255,0.4)', fontSize: 11, textAlign: 'center', marginTop: spacing.xl },
  difficultyRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.sm },
  difficultyPill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    paddingVertical: 10,
    borderRadius: radius.pill,
  },
  difficultyPillActive: {
    backgroundColor: 'rgba(250,204,21,0.12)',
    borderColor: 'rgba(250,204,21,0.5)',
  },
  difficultyLabel: { color: 'rgba(242,238,255,0.6)', fontSize: 12, fontWeight: '800' },
  difficultyDesc: { color: 'rgba(242,238,255,0.45)', fontSize: 11, fontStyle: 'italic', marginBottom: spacing.sm },
});
