import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, useTheme } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

import { useProgress } from '@/contexts/ProgressContext';
import Card from '@/components/common/Card';
import ScreenContainer from '@/components/common/ScreenContainer';
import { radius } from '@/config/theme';

const DAY_LABELS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

export default function ProgressScreen() {
  const theme = useTheme();
  const { stats } = useProgress();
  const maxMin = Math.max(...stats.weeklyMinutes, 10);

  const metrics = [
    {
      label: 'Streak',
      value: stats.streak,
      unit: 'days',
      icon: 'flame' as const,
      color: '#F59E0B',
    },
    {
      label: 'Total time',
      value: stats.totalMinutes,
      unit: 'min',
      icon: 'time' as const,
      color: theme.colors.primary,
    },
    {
      label: 'Conversations',
      value: stats.conversationsCount,
      unit: '',
      icon: 'chatbubbles' as const,
      color: theme.colors.secondary,
    },
    {
      label: 'Words saved',
      value: stats.wordsLearned,
      unit: '',
      icon: 'book' as const,
      color: theme.colors.tertiary,
    },
  ];

  return (
    <ScreenContainer scroll>
      <Text variant="headlineMedium" style={styles.title}>
        Your Progress 📈
      </Text>
      <Text style={[styles.sub, { color: theme.colors.onSurfaceVariant }]}>
        Consistency is the secret. Keep showing up.
      </Text>

      <LinearGradient
        colors={['#F59E0B', '#FFB347']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.streakCard}
      >
        <Ionicons name="flame" size={40} color="#fff" />
        <View style={{ marginLeft: 16, flex: 1 }}>
          <Text style={{ color: 'rgba(255,255,255,0.85)', fontSize: 12, letterSpacing: 1 }}>
            CURRENT STREAK
          </Text>
          <Text style={{ color: '#fff', fontSize: 36, fontWeight: '800' }}>
            {stats.streak} <Text style={{ fontSize: 16 }}>days</Text>
          </Text>
          <Text style={{ color: 'rgba(255,255,255,0.9)', marginTop: 2 }}>
            Longest: {stats.longestStreak} days
          </Text>
        </View>
      </LinearGradient>

      <View style={styles.grid}>
        {metrics.map((m) => (
          <Card key={m.label} style={styles.metricCard}>
            <View style={[styles.metricIcon, { backgroundColor: m.color + '22' }]}>
              <Ionicons name={m.icon} size={20} color={m.color} />
            </View>
            <Text variant="labelMedium" style={{ color: theme.colors.onSurfaceVariant }}>
              {m.label}
            </Text>
            <Text variant="headlineSmall" style={{ fontWeight: '800', marginTop: 2 }}>
              {m.value}
              {m.unit ? <Text style={{ fontSize: 14 }}> {m.unit}</Text> : null}
            </Text>
          </Card>
        ))}
      </View>

      <Card style={{ marginTop: 16 }}>
        <Text variant="titleMedium" style={{ fontWeight: '700' }}>
          Weekly activity
        </Text>
        <Text style={{ color: theme.colors.onSurfaceVariant, marginBottom: 12 }}>
          Minutes spent learning each day
        </Text>
        <View style={styles.chart}>
          {stats.weeklyMinutes.map((m, i) => {
            const heightPct = Math.max(8, (m / maxMin) * 100);
            return (
              <View key={i} style={styles.barColumn}>
                <View style={styles.barWrap}>
                  <View
                    style={[
                      styles.bar,
                      {
                        height: `${heightPct}%`,
                        backgroundColor: m > 0 ? theme.colors.primary : theme.colors.outline,
                      },
                    ]}
                  />
                </View>
                <Text style={[styles.dayLabel, { color: theme.colors.onSurfaceVariant }]}>
                  {DAY_LABELS[i]}
                </Text>
                <Text style={[styles.minLabel, { color: theme.colors.onSurfaceVariant }]}>
                  {m}
                </Text>
              </View>
            );
          })}
        </View>
      </Card>

      <Card style={{ marginTop: 16, marginBottom: 24 }}>
        <Text variant="titleMedium" style={{ fontWeight: '700' }}>
          Weekly summary
        </Text>
        <Text style={{ color: theme.colors.onSurfaceVariant, marginTop: 4 }}>
          You practised{' '}
          <Text style={{ fontWeight: '700', color: theme.colors.onSurface }}>
            {stats.weeklyMinutes.reduce((a, b) => a + b, 0)} minutes
          </Text>{' '}
          this week across{' '}
          <Text style={{ fontWeight: '700', color: theme.colors.onSurface }}>
            {stats.weeklyMinutes.filter((m) => m > 0).length} days
          </Text>
          . {stats.interviewsCount > 0 ? `Mock interviews: ${stats.interviewsCount}.` : ''}
        </Text>
      </Card>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  title: { fontWeight: '800', marginTop: 4 },
  sub: { marginBottom: 16 },
  streakCard: {
    borderRadius: radius.xl,
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 16,
  },
  metricCard: { width: '48%' },
  metricIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  chart: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    height: 160,
    alignItems: 'flex-end',
    marginTop: 8,
  },
  barColumn: { alignItems: 'center', flex: 1 },
  barWrap: { height: 120, justifyContent: 'flex-end', width: 18 },
  bar: { width: 18, borderRadius: 9 },
  dayLabel: { marginTop: 6, fontWeight: '700', fontSize: 12 },
  minLabel: { fontSize: 10 },
});
