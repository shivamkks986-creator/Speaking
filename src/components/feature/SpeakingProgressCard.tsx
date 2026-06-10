import React from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { Text, ProgressBar, useTheme } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';

import Card from '@/components/common/Card';

interface Props {
  scores: number[]; // last N speaking sessions
  bestScore: number;
  onPress?: () => void;
}

export default function SpeakingProgressCard({ scores, bestScore, onPress }: Props) {
  const theme = useTheme();
  const avg = scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
  const lastFive = scores.slice(-5);
  const trendIcon =
    lastFive.length < 2
      ? 'remove'
      : lastFive[lastFive.length - 1] > lastFive[0]
        ? 'trending-up'
        : lastFive[lastFive.length - 1] < lastFive[0]
          ? 'trending-down'
          : 'remove';
  const trendColor =
    trendIcon === 'trending-up'
      ? theme.colors.tertiary
      : trendIcon === 'trending-down'
        ? theme.colors.error
        : theme.colors.onSurfaceVariant;

  return (
    <Pressable onPress={onPress} testID="speaking-progress-card">
      <Card>
        <View style={styles.headerRow}>
          <View style={[styles.icon, { backgroundColor: theme.colors.secondaryContainer }]}>
            <Ionicons name="mic" size={20} color={theme.colors.secondary} />
          </View>
          <View style={{ flex: 1, marginLeft: 10 }}>
            <Text variant="titleSmall" style={{ fontWeight: '700' }}>
              Speaking Progress
            </Text>
            <Text style={{ color: theme.colors.onSurfaceVariant, fontSize: 12 }}>
              {scores.length} session{scores.length === 1 ? '' : 's'} tracked
            </Text>
          </View>
          <Ionicons name={trendIcon} size={22} color={trendColor} />
        </View>

        <View style={styles.statsRow}>
          <View style={styles.stat}>
            <Text style={[styles.statValue, { color: theme.colors.primary }]}>{avg}</Text>
            <Text style={[styles.statLabel, { color: theme.colors.onSurfaceVariant }]}>Avg</Text>
          </View>
          <View style={styles.stat}>
            <Text style={[styles.statValue, { color: theme.colors.tertiary }]}>{bestScore}</Text>
            <Text style={[styles.statLabel, { color: theme.colors.onSurfaceVariant }]}>Best</Text>
          </View>
          <View style={styles.stat}>
            <Text style={[styles.statValue, { color: theme.colors.secondary }]}>{scores.length}</Text>
            <Text style={[styles.statLabel, { color: theme.colors.onSurfaceVariant }]}>Sessions</Text>
          </View>
        </View>

        <ProgressBar
          progress={avg / 100}
          color={theme.colors.primary}
          style={styles.progress}
        />

        <View style={styles.sparkline}>
          {lastFive.length === 0
            ? Array.from({ length: 5 }).map((_, i) => (
                <View
                  key={i}
                  style={[styles.spark, { backgroundColor: theme.colors.outline, height: 8 }]}
                />
              ))
            : lastFive.map((s, i) => (
                <View
                  key={i}
                  style={[
                    styles.spark,
                    {
                      backgroundColor: theme.colors.primary,
                      height: Math.max(8, (s / 100) * 36),
                      opacity: 0.5 + (i / lastFive.length) * 0.5,
                    },
                  ]}
                />
              ))}
        </View>
      </Card>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  headerRow: { flexDirection: 'row', alignItems: 'center' },
  icon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statsRow: {
    flexDirection: 'row',
    marginTop: 12,
    justifyContent: 'space-between',
  },
  stat: { alignItems: 'center', flex: 1 },
  statValue: { fontSize: 22, fontWeight: '800' },
  statLabel: { fontSize: 11, marginTop: 2 },
  progress: { marginTop: 12, height: 6, borderRadius: 3 },
  sparkline: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 6,
    marginTop: 12,
    height: 36,
  },
  spark: { flex: 1, borderRadius: 4 },
});
