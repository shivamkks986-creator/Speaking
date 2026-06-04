// Premium dashboard — Speaking / Confidence / Pronunciation / Grammar + charts
import React, { useMemo } from 'react';
import { View, StyleSheet, ScrollView, Pressable } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Text } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';

import { useProgress } from '@/contexts/ProgressContext';
import { useGamification } from '@/contexts/GamificationContext';
import { radius, spacing } from '@/config/theme';

export default function PremiumDashboardScreen() {
  const navigation = useNavigation();
  const { stats } = useProgress();
  const { level, state: gam } = useGamification();

  const avg = (arr: number[]) => (arr.length ? Math.round(arr.reduce((a, b) => a + b, 0) / arr.length) : 0);

  const speaking = stats.bestSpeakingScore || avg(stats.speakingScores);
  const confidence = Math.min(100, Math.round((avg(stats.speakingScores) + stats.bestInterviewScore) / 2));
  const pronunciation = Math.max(speaking - 5, 0);
  const grammar = Math.max(speaking - 3, 0);

  const weeklyMax = useMemo(() => Math.max(10, ...stats.weeklyMinutes), [stats.weeklyMinutes]);

  return (
    <View style={{ flex: 1, backgroundColor: '#0A0418' }}>
      <LinearGradient colors={['#0A0418', '#150828', '#1F0E3D']} style={StyleSheet.absoluteFillObject} />
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        <View style={styles.header}>
          <Pressable onPress={() => navigation.goBack()} style={styles.backBtn} testID="dashboard-back-btn">
            <Ionicons name="chevron-back" size={22} color="#F2EEFF" />
          </Pressable>
          <Text style={styles.title}>Premium Dashboard</Text>
          <View style={{ width: 36 }} />
        </View>
        <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: 140 }} showsVerticalScrollIndicator={false}>
          <View style={styles.grid}>
            <ScoreCard label="Speaking" value={speaking} colors={['#FF6B9D', '#FFA496']} icon="mic" />
            <ScoreCard label="Confidence" value={confidence} colors={['#7C5CFF', '#A992FF']} icon="trending-up" />
            <ScoreCard label="Pronunciation" value={pronunciation} colors={['#22D3EE', '#7C5CFF']} icon="volume-high" />
            <ScoreCard label="Grammar" value={grammar} colors={['#34D399', '#22D3EE']} icon="checkmark-done" />
          </View>

          <Text style={styles.section}>Weekly minutes</Text>
          <View style={styles.weeklyCard}>
            <View style={styles.weeklyBars}>
              {stats.weeklyMinutes.map((m, i) => {
                const days = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
                const h = Math.max(8, (m / weeklyMax) * 120);
                return (
                  <View key={i} style={{ alignItems: 'center', gap: 6 }}>
                    <View style={[styles.barBg, { height: 120 }]}>
                      <LinearGradient
                        colors={['#7C5CFF', '#FF6B9D']}
                        style={[styles.barFill, { height: h }]}
                      />
                    </View>
                    <Text style={styles.barLabel}>{days[i]}</Text>
                    <Text style={styles.barValue}>{m}</Text>
                  </View>
                );
              })}
            </View>
          </View>

          <Text style={styles.section}>Monthly progress</Text>
          <View style={styles.statsRow}>
            <Stat label="Total minutes" value={stats.totalMinutes} icon="time" />
            <Stat label="Conversations" value={stats.conversationsCount} icon="chatbubbles" />
            <Stat label="Vocab" value={stats.wordsLearned} icon="book" />
          </View>
          <View style={styles.statsRow}>
            <Stat label="Interviews" value={stats.interviewsCount} icon="briefcase" />
            <Stat label="Best Speak" value={stats.bestSpeakingScore} icon="mic-circle" />
            <Stat label="Best Mock" value={stats.bestInterviewScore} icon="trophy" />
          </View>

          <Text style={styles.section}>Achievements</Text>
          <View style={styles.lvlCard}>
            <Text style={{ fontSize: 36 }}>{level.badge}</Text>
            <Text style={styles.lvlName}>{level.name}</Text>
            <Text style={styles.lvlSub}>{gam.xp} XP · {gam.unlockedBadgeIds.length} badges</Text>
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

function ScoreCard({ label, value, colors, icon }: { label: string; value: number; colors: [string, string]; icon: keyof typeof Ionicons.glyphMap }) {
  return (
    <LinearGradient colors={colors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.scoreCard}>
      <Ionicons name={icon} size={20} color="#FFFFFF" />
      <Text style={styles.scoreValue}>{value || '—'}</Text>
      <Text style={styles.scoreLabel}>{label}</Text>
    </LinearGradient>
  );
}

function Stat({ label, value, icon }: { label: string; value: number; icon: keyof typeof Ionicons.glyphMap }) {
  return (
    <View style={styles.stat}>
      <Ionicons name={icon} size={18} color="#A992FF" />
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  backBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.06)' },
  title: { color: '#F2EEFF', fontSize: 18, fontWeight: '800' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  scoreCard: { width: '48%', borderRadius: radius.lg, padding: spacing.md, minHeight: 110, justifyContent: 'space-between' },
  scoreValue: { color: '#FFFFFF', fontSize: 28, fontWeight: '800' },
  scoreLabel: { color: 'rgba(255,255,255,0.9)', fontSize: 12, fontWeight: '600' },
  section: { color: '#F2EEFF', fontWeight: '800', fontSize: 16, marginTop: spacing.xl, marginBottom: spacing.md },
  weeklyCard: { backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: radius.xl, padding: spacing.lg, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
  weeklyBars: { flexDirection: 'row', justifyContent: 'space-between' },
  barBg: { width: 14, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: radius.pill, overflow: 'hidden', justifyContent: 'flex-end' },
  barFill: { width: '100%', borderRadius: radius.pill },
  barLabel: { color: 'rgba(242,238,255,0.6)', fontSize: 10 },
  barValue: { color: '#F2EEFF', fontSize: 10, fontWeight: '700' },
  statsRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.sm },
  stat: { flex: 1, backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: radius.lg, padding: spacing.md, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)' },
  statValue: { color: '#F2EEFF', fontWeight: '800', fontSize: 18, marginTop: 4 },
  statLabel: { color: 'rgba(242,238,255,0.6)', fontSize: 10, marginTop: 2 },
  lvlCard: { backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: radius.xl, padding: spacing.xl, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
  lvlName: { color: '#F2EEFF', fontSize: 18, fontWeight: '800', marginTop: spacing.sm },
  lvlSub: { color: 'rgba(242,238,255,0.6)', fontSize: 12, marginTop: 4 },
});
