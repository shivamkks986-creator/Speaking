import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Text, Button, useTheme, ProgressBar } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { RootStackParamList } from '@/navigation/types';
import { InterviewResult } from '@/types';
import { INTERVIEW_TRACKS } from '@/data/interviewTracks';
import Card from '@/components/common/Card';
import ScoreRing from '@/components/feature/ScoreRing';
import { radius } from '@/config/theme';

type Route = RouteProp<RootStackParamList, 'InterviewResults'>;
type Nav = NativeStackNavigationProp<RootStackParamList>;

export default function InterviewResultsScreen() {
  const theme = useTheme();
  const route = useRoute<Route>();
  const navigation = useNavigation<Nav>();
  const result: InterviewResult = route.params.result;
  const trackMeta = INTERVIEW_TRACKS.find((t) => t.id === result.track);

  const gradientColors = trackMeta?.colors ?? ['#6D5BFF', '#9C8FFF'];

  const verdict =
    result.overallScore >= 85
      ? 'Outstanding! You sound interview-ready.'
      : result.overallScore >= 70
        ? 'Strong performance. A bit more polish and you\'re there.'
        : result.overallScore >= 55
          ? 'Good progress — keep practising consistently.'
          : 'Keep going! Every round gets easier.';

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <ScrollView contentContainerStyle={styles.content}>
        <LinearGradient
          colors={gradientColors}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.hero}
        >
          <Ionicons name="trophy" size={32} color="#fff" />
          <Text style={styles.heroTitle}>{trackMeta?.title} Complete</Text>
          <Text style={styles.heroSub}>{verdict}</Text>
        </LinearGradient>

        <View style={styles.overallWrap}>
          <ScoreRing score={result.overallScore} size={160} label="OVERALL" sublabel="out of 100" />
        </View>

        <Card>
          <Text variant="titleMedium" style={{ fontWeight: '700', marginBottom: 12 }}>
            Score breakdown
          </Text>
          <ScoreBar
            label="Communication"
            value={result.communicationScore}
            color={theme.colors.primary}
            icon="megaphone"
          />
          <ScoreBar
            label="Confidence"
            value={result.confidenceScore}
            color={theme.colors.secondary}
            icon="rocket"
          />
          <ScoreBar
            label="Content / Relevance"
            value={result.contentScore}
            color={theme.colors.tertiary}
            icon="bulb"
          />
          {typeof result.fluencyScore === 'number' && (
            <ScoreBar label="Fluency" value={result.fluencyScore} color="#22D3EE" icon="water" />
          )}
          {typeof result.grammarScore === 'number' && (
            <ScoreBar label="Grammar" value={result.grammarScore} color="#34D399" icon="checkmark-done" />
          )}
          {typeof result.professionalismScore === 'number' && (
            <ScoreBar label="Professionalism" value={result.professionalismScore} color="#F59E0B" icon="briefcase" />
          )}
        </Card>

        {result.strengths.length > 0 ? (
          <Card>
            <View style={styles.sectionHeader}>
              <Ionicons name="checkmark-circle" size={20} color={theme.colors.tertiary} />
              <Text variant="titleMedium" style={{ fontWeight: '700', marginLeft: 8 }}>
                Your strengths
              </Text>
            </View>
            {result.strengths.map((s, i) => (
              <View
                key={i}
                style={[styles.suggestionRow, { backgroundColor: theme.colors.tertiaryContainer }]}
              >
                <Text style={{ color: theme.colors.onTertiaryContainer, flex: 1 }}>{s}</Text>
              </View>
            ))}
          </Card>
        ) : null}

        <Card>
          <View style={styles.sectionHeader}>
            <Ionicons name="bulb" size={20} color={theme.colors.secondary} />
            <Text variant="titleMedium" style={{ fontWeight: '700', marginLeft: 8 }}>
              Improvement suggestions
            </Text>
          </View>
          {result.suggestions.map((s, i) => (
            <View
              key={i}
              style={[styles.suggestionRow, { backgroundColor: theme.colors.secondaryContainer }]}
            >
              <Text style={{ color: theme.colors.onSecondaryContainer, fontWeight: '700', marginRight: 6 }}>
                {i + 1}.
              </Text>
              <Text style={{ color: theme.colors.onSecondaryContainer, flex: 1 }}>{s}</Text>
            </View>
          ))}
        </Card>

        <Card>
          <Text variant="titleMedium" style={{ fontWeight: '700', marginBottom: 8 }}>
            Per-question review
          </Text>
          {result.answers.map((a, i) => (
            <View
              key={a.questionId}
              style={[styles.qaRow, { borderColor: theme.colors.outline }]}
            >
              <Text variant="labelMedium" style={{ color: theme.colors.onSurfaceVariant }}>
                Q{i + 1}
              </Text>
              <Text style={{ fontWeight: '700', marginTop: 2 }}>{a.question}</Text>
              <View style={styles.qaScoreRow}>
                <Text style={{ color: theme.colors.onSurfaceVariant }}>Score</Text>
                <Text style={{ fontWeight: '800', color: theme.colors.primary }}>{a.score}/100</Text>
              </View>
              <ProgressBar
                progress={a.score / 100}
                color={a.score >= 70 ? theme.colors.tertiary : theme.colors.secondary}
                style={{ height: 5, borderRadius: 3, marginTop: 4 }}
              />
              <Text style={{ marginTop: 6, fontStyle: 'italic', fontSize: 13 }}>{a.feedback}</Text>
            </View>
          ))}
        </Card>

        <Button
          mode="contained"
          onPress={() => navigation.navigate('Main', { screen: 'Interview' })}
          style={{ marginTop: 8, borderRadius: 12 }}
          contentStyle={{ height: 50 }}
          icon="refresh"
          testID="results-tryagain-btn"
        >
          Try another track
        </Button>
        <Button
          mode="outlined"
          onPress={() => navigation.navigate('Main', { screen: 'Home' })}
          style={{ marginTop: 8, borderRadius: 12 }}
          contentStyle={{ height: 46 }}
          testID="results-home-btn"
        >
          Back to home
        </Button>
      </ScrollView>
    </SafeAreaView>
  );
}

function ScoreBar({
  label,
  value,
  color,
  icon,
}: {
  label: string;
  value: number;
  color: string;
  icon: keyof typeof Ionicons.glyphMap;
}) {
  return (
    <View style={{ marginVertical: 6 }}>
      <View style={styles.scoreBarTop}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Ionicons name={icon} size={16} color={color} />
          <Text style={{ fontWeight: '600' }}>{label}</Text>
        </View>
        <Text style={{ fontWeight: '800', color }}>{value}</Text>
      </View>
      <ProgressBar
        progress={value / 100}
        color={color}
        style={{ height: 8, borderRadius: 4, marginTop: 4 }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, paddingBottom: 32, gap: 14 },
  hero: { padding: 20, borderRadius: radius.xl, alignItems: 'flex-start' },
  heroTitle: { color: '#fff', fontSize: 22, fontWeight: '800', marginTop: 8 },
  heroSub: { color: 'rgba(255,255,255,0.95)', marginTop: 4 },
  overallWrap: { alignItems: 'center', marginVertical: 4 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  suggestionRow: { flexDirection: 'row', padding: 12, borderRadius: 10, marginTop: 6 },
  qaRow: {
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  qaScoreRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
  scoreBarTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
});
