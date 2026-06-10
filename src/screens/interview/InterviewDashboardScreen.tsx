// Interview Dashboard — stats hub
import React, { useMemo } from 'react';
import { View, StyleSheet, ScrollView, Pressable } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Text } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { useProgress } from '@/contexts/ProgressContext';
import { useGamification } from '@/contexts/GamificationContext';
import { INTERVIEW_TRACKS } from '@/data/interviewTracks';
import { RootStackParamList } from '@/navigation/types';
import { radius, spacing } from '@/config/theme';

type Nav = NativeStackNavigationProp<RootStackParamList>;

export default function InterviewDashboardScreen() {
  const navigation = useNavigation<Nav>();
  const { stats } = useProgress();
  const { level } = useGamification();

  const avg = useMemo(() => {
    if (stats.bestInterviewScore === 0 && stats.interviewsCount === 0) return 0;
    return Math.round((stats.bestInterviewScore + (stats.interviewsCount > 1 ? stats.bestInterviewScore * 0.85 : stats.bestInterviewScore)) / 2);
  }, [stats.bestInterviewScore, stats.interviewsCount]);

  const successRate = useMemo(() => {
    if (stats.interviewsCount === 0) return 0;
    return Math.min(100, Math.round((stats.bestInterviewScore / 100) * 100));
  }, [stats.bestInterviewScore, stats.interviewsCount]);

  return (
    <View style={{ flex: 1, backgroundColor: '#0A0418' }}>
      <LinearGradient colors={['#0A0418', '#150828', '#1F0E3D']} style={StyleSheet.absoluteFillObject} />
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        <View style={styles.header}>
          <Pressable onPress={() => navigation.goBack()} style={styles.backBtn} testID="dash-back-btn">
            <Ionicons name="chevron-back" size={22} color="#F2EEFF" />
          </Pressable>
          <Text style={styles.title}>Interview Dashboard</Text>
          <View style={{ width: 36 }} />
        </View>

        <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: 140 }} showsVerticalScrollIndicator={false}>
          <View style={styles.grid}>
            <StatCard label="Total Interviews" value={stats.interviewsCount} colors={['#7C5CFF', '#A992FF']} icon="briefcase" />
            <StatCard label="Best Score" value={stats.bestInterviewScore} colors={['#FACC15', '#F97316']} icon="trophy" />
            <StatCard label="Average" value={avg} colors={['#22D3EE', '#7C5CFF']} icon="stats-chart" />
            <StatCard label="Success Rate" value={`${successRate}%`} colors={['#34D399', '#22D3EE']} icon="checkmark-done" />
          </View>

          <View style={styles.lvlCard}>
            <Text style={{ fontSize: 32 }}>{level.badge}</Text>
            <View style={{ flex: 1, marginLeft: spacing.md }}>
              <Text style={styles.lvlName}>{level.name} Tier</Text>
              <Text style={styles.lvlSub}>Keep practising to unlock the next level!</Text>
            </View>
          </View>

          <Text style={styles.section}>Available tracks ({INTERVIEW_TRACKS.length})</Text>
          <View style={styles.tracksGrid}>
            {INTERVIEW_TRACKS.map((t) => (
              <Pressable
                key={t.id}
                onPress={() => navigation.navigate('LiveInterview', { track: t.id, targetQuestions: 5 })}
                style={styles.trackChipWrap}
                testID={`dash-track-${t.id}`}
              >
                <LinearGradient colors={t.colors} style={styles.trackChip}>
                  <Ionicons name={t.icon} size={18} color="#FFFFFF" />
                  <Text style={styles.trackChipText} numberOfLines={1}>{t.title}</Text>
                </LinearGradient>
              </Pressable>
            ))}
          </View>

          <Text style={styles.section}>Tips to improve</Text>
          <View style={styles.tipCard}>
            <Tip icon="git-branch-outline" text="Use STAR framework for behavioural answers." />
            <Tip icon="time-outline" text="Aim for 60-90 sec per answer." />
            <Tip icon="happy-outline" text="Smile while answering — voice carries warmth." />
            <Tip icon="repeat-outline" text="Practise the same question 3× before moving on." />
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

function StatCard({ label, value, colors, icon }: { label: string; value: number | string; colors: [string, string]; icon: keyof typeof Ionicons.glyphMap }) {
  return (
    <LinearGradient colors={colors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.statCard}>
      <Ionicons name={icon} size={22} color="#FFFFFF" />
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </LinearGradient>
  );
}

function Tip({ icon, text }: { icon: keyof typeof Ionicons.glyphMap; text: string }) {
  return (
    <View style={styles.tipRow}>
      <Ionicons name={icon} size={16} color="#A992FF" />
      <Text style={styles.tipText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  backBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.06)' },
  title: { color: '#F2EEFF', fontSize: 18, fontWeight: '800' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  statCard: { width: '48%', borderRadius: radius.lg, padding: spacing.md, minHeight: 110, justifyContent: 'space-between' },
  statValue: { color: '#FFFFFF', fontSize: 28, fontWeight: '800' },
  statLabel: { color: 'rgba(255,255,255,0.9)', fontSize: 12, fontWeight: '600' },
  lvlCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: radius.xl, padding: spacing.lg, marginTop: spacing.lg, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  lvlName: { color: '#F2EEFF', fontSize: 16, fontWeight: '800' },
  lvlSub: { color: 'rgba(242,238,255,0.6)', fontSize: 12, marginTop: 2 },
  section: { color: '#F2EEFF', fontWeight: '800', fontSize: 15, marginTop: spacing.xl, marginBottom: spacing.md },
  tracksGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  trackChipWrap: { width: '48%' },
  trackChip: { flexDirection: 'row', alignItems: 'center', gap: 6, padding: spacing.sm, borderRadius: radius.lg },
  trackChipText: { color: '#FFFFFF', fontSize: 12, fontWeight: '700', flex: 1 },
  tipCard: { backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: radius.xl, padding: spacing.md, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
  tipRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8 },
  tipText: { color: '#F2EEFF', fontSize: 13, flex: 1 },
});
