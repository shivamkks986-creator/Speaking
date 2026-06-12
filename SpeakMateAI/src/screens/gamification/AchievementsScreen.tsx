import React from 'react';
import { View, StyleSheet, ScrollView, Pressable } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Text } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import FadeInView from '@/components/common/FadeInView';

import { useGamification } from '@/contexts/GamificationContext';
import { useProgress } from '@/contexts/ProgressContext';
import { BADGES } from '@/data/badges';
import { LEVELS } from '@/config/levels';
import { radius, spacing } from '@/config/theme';
import XPBar from '@/components/feature/XPBar';

export default function AchievementsScreen() {
  const navigation = useNavigation();
  const { state, level } = useGamification();
  const { stats } = useProgress();

  const isUnlocked = (id: string) => state.unlockedBadgeIds.includes(id);

  return (
    <View style={{ flex: 1, backgroundColor: '#0A0418' }}>
      <LinearGradient colors={['#0A0418', '#150828', '#1F0E3D']} style={StyleSheet.absoluteFillObject} />
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        <View style={styles.header}>
          <Pressable onPress={() => navigation.goBack()} style={styles.backBtn} testID="achievements-back-btn">
            <Ionicons name="chevron-back" size={22} color="#F2EEFF" />
          </Pressable>
          <Text style={styles.title}>Achievements</Text>
          <View style={{ width: 36 }} />
        </View>

        <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: 140 }} showsVerticalScrollIndicator={false}>
          <View style={styles.summary}>
            <View style={styles.summaryRow}>
              <View style={styles.coinBox}>
                <Ionicons name="logo-bitcoin" size={20} color="#FACC15" />
                <Text style={styles.coinText}>{state.coins}</Text>
                <Text style={styles.coinLabel}>Coins</Text>
              </View>
              <View style={styles.coinBox}>
                <Text style={[styles.coinText, { color: level.color }]}>{level.badge}</Text>
                <Text style={styles.coinText}>{state.xp} XP</Text>
                <Text style={styles.coinLabel}>{level.name}</Text>
              </View>
              <View style={styles.coinBox}>
                <Ionicons name="ribbon" size={20} color="#22D3EE" />
                <Text style={styles.coinText}>{state.unlockedBadgeIds.length}/{BADGES.length}</Text>
                <Text style={styles.coinLabel}>Badges</Text>
              </View>
            </View>
            <View style={{ marginTop: spacing.md }}>
              <XPBar />
            </View>
          </View>

          <Text style={styles.section}>Levels</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
            {LEVELS.map((lvl) => {
              const reached = state.xp >= lvl.minXp;
              return (
                <View
                  key={lvl.id}
                  style={[
                    styles.levelChip,
                    reached && { borderColor: lvl.color, backgroundColor: `${lvl.color}20` },
                  ]}
                >
                  <Text style={{ fontSize: 18 }}>{lvl.badge}</Text>
                  <Text style={[styles.levelName, reached && { color: lvl.color }]}>{lvl.name}</Text>
                  <Text style={styles.levelXp}>{lvl.minXp} XP</Text>
                </View>
              );
            })}
          </ScrollView>

          <Text style={[styles.section, { marginTop: spacing.xl }]}>Badges</Text>
          <View style={styles.grid}>
            {BADGES.map((b, i) => {
              const unlocked = isUnlocked(b.id);
              const stat = (() => {
                switch (b.criteria.type) {
                  case 'streak': return stats.streak;
                  case 'totalMinutes': return stats.totalMinutes;
                  case 'interviewsCount': return stats.interviewsCount;
                  case 'wordsLearned': return stats.wordsLearned;
                  case 'speakingSessions': return stats.speakingScores.length;
                  case 'bestSpeakingScore': return stats.bestSpeakingScore;
                  case 'bestInterviewScore': return stats.bestInterviewScore;
                  case 'dailyChallengeStreak': return stats.dailyChallengeStreak;
                  case 'level': return level.id;
                  default: return 0;
                }
              })();
              const progress = Math.min(1, stat / b.criteria.threshold);
              return (
                <FadeInView
                  key={b.id}
                  delay={i * 50}
                  duration={300}
                  direction="up"
                  style={styles.badgeCardWrap}
                >
                  <LinearGradient
                    colors={unlocked ? b.gradient : ['#241139', '#150828']}
                    style={styles.badgeCard}
                  >
                    <Ionicons name={b.icon} size={28} color={unlocked ? '#FFFFFF' : 'rgba(242,238,255,0.4)'} />
                    <Text style={[styles.badgeTitle, !unlocked && { color: 'rgba(242,238,255,0.6)' }]}>
                      {b.title}
                    </Text>
                    <Text style={styles.badgeDesc} numberOfLines={2}>
                      {b.description}
                    </Text>
                    <View style={styles.badgeProgress}>
                      <View
                        style={[
                          styles.badgeProgressFill,
                          { width: `${progress * 100}%`, backgroundColor: unlocked ? '#FFFFFF' : b.color },
                        ]}
                      />
                    </View>
                    <Text style={styles.badgeProgressText}>
                      {Math.min(stat, b.criteria.threshold)}/{b.criteria.threshold}
                    </Text>
                  </LinearGradient>
                </FadeInView>
              );
            })}
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  backBtn: {
    width: 36, height: 36, borderRadius: 18,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  title: { color: '#F2EEFF', fontSize: 18, fontWeight: '800' },
  summary: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: radius.xl,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.sm },
  coinBox: { flex: 1, alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: radius.lg, paddingVertical: spacing.md },
  coinText: { color: '#F2EEFF', fontSize: 16, fontWeight: '800', marginTop: 4 },
  coinLabel: { color: 'rgba(242,238,255,0.6)', fontSize: 11, marginTop: 2 },
  section: { color: '#F2EEFF', fontWeight: '700', fontSize: 16, marginTop: spacing.xl, marginBottom: spacing.md },
  levelChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    backgroundColor: 'rgba(255,255,255,0.04)',
    alignItems: 'center',
    minWidth: 100,
  },
  levelName: { color: '#F2EEFF', fontWeight: '700', fontSize: 12, marginTop: 4 },
  levelXp: { color: 'rgba(242,238,255,0.5)', fontSize: 10, marginTop: 2 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  badgeCardWrap: { width: '48%' },
  badgeCard: {
    borderRadius: radius.lg,
    padding: spacing.md,
    minHeight: 140,
  },
  badgeTitle: { color: '#FFFFFF', fontWeight: '800', fontSize: 13, marginTop: 8 },
  badgeDesc: { color: 'rgba(255,255,255,0.85)', fontSize: 11, marginTop: 2 },
  badgeProgress: {
    marginTop: spacing.sm,
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: radius.pill,
    overflow: 'hidden',
  },
  badgeProgressFill: { height: '100%', borderRadius: radius.pill },
  badgeProgressText: { color: 'rgba(255,255,255,0.7)', fontSize: 10, fontWeight: '700', marginTop: 4 },
});
