import React from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { Text, useTheme } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';

import ScoreRing from '@/components/feature/ScoreRing';
import Card from '@/components/common/Card';

interface Props {
  score: number;
  interviewsCount: number;
  bestScore: number;
  onPress?: () => void;
}

export default function ReadinessCard({ score, interviewsCount, bestScore, onPress }: Props) {
  const theme = useTheme();
  const label =
    score >= 80
      ? 'Interview Ready! 🚀'
      : score >= 60
        ? 'Almost there'
        : score >= 30
          ? 'Keep practising'
          : 'Just getting started';
  return (
    <Pressable onPress={onPress} testID="readiness-card">
      <Card>
        <View style={styles.row}>
          <ScoreRing score={score} size={110} label="READINESS" />
          <View style={{ flex: 1, marginLeft: 16 }}>
            <Text variant="titleMedium" style={{ fontWeight: '700' }}>
              {label}
            </Text>
            <Text style={{ color: theme.colors.onSurfaceVariant, marginTop: 4 }}>
              Combined score of mock interviews, speaking sessions and consistency.
            </Text>
            <View style={styles.miniStats}>
              <View style={styles.miniStat}>
                <Ionicons name="briefcase" size={14} color={theme.colors.primary} />
                <Text style={[styles.miniText, { color: theme.colors.onSurface }]}>
                  {interviewsCount} mock
                </Text>
              </View>
              <View style={styles.miniStat}>
                <Ionicons name="trophy" size={14} color={theme.colors.tertiary} />
                <Text style={[styles.miniText, { color: theme.colors.onSurface }]}>
                  Best {bestScore}
                </Text>
              </View>
            </View>
          </View>
        </View>
      </Card>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  miniStats: { flexDirection: 'row', gap: 12, marginTop: 8 },
  miniStat: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  miniText: { fontSize: 12, fontWeight: '600' },
});
