import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Text, Button, useTheme, ProgressBar } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { RootStackParamList } from '@/navigation/types';
import Card from '@/components/common/Card';
import ScoreRing from '@/components/feature/ScoreRing';
import ShareScoreCard from '@/components/feature/ShareScoreCard';
import { radius } from '@/config/theme';

type Route = RouteProp<RootStackParamList, 'SpeakingScore'>;
type Nav = NativeStackNavigationProp<RootStackParamList>;

export default function SpeakingScoreScreen() {
  const theme = useTheme();
  const navigation = useNavigation<Nav>();
  const { score } = useRoute<Route>().params;

  const tips = buildTips(score.pronunciation, score.fluency, score.grammar);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <ScrollView contentContainerStyle={styles.content}>
        <LinearGradient
          colors={[theme.colors.primary, theme.colors.secondary]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.hero}
        >
          <Ionicons name="mic" size={32} color="#fff" />
          <Text style={styles.heroTitle}>Speaking Score</Text>
          <Text style={styles.heroSub}>Detailed breakdown of your session</Text>
        </LinearGradient>

        <View style={styles.ringWrap}>
          <ScoreRing score={score.overall} size={170} label="OVERALL" sublabel="out of 100" />
        </View>

        <Card>
          <Text variant="titleMedium" style={{ fontWeight: '700', marginBottom: 12 }}>
            Sub-scores
          </Text>
          <ScoreBar label="Pronunciation" value={score.pronunciation} color={theme.colors.primary} icon="megaphone" />
          <ScoreBar label="Fluency" value={score.fluency} color={theme.colors.secondary} icon="flash" />
          <ScoreBar label="Grammar" value={score.grammar} color={theme.colors.tertiary} icon="book" />
        </Card>

        <Card>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
            <Ionicons name="chatbox-ellipses" size={20} color={theme.colors.primary} />
            <Text variant="titleMedium" style={{ fontWeight: '700', marginLeft: 8 }}>
              AI Feedback
            </Text>
          </View>
          <Text style={{ lineHeight: 22 }}>{score.feedback}</Text>
        </Card>

        <Card>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
            <Ionicons name="bulb" size={20} color={theme.colors.secondary} />
            <Text variant="titleMedium" style={{ fontWeight: '700', marginLeft: 8 }}>
              Quick wins to improve
            </Text>
          </View>
          {tips.map((tip, i) => (
            <View
              key={i}
              style={[styles.tipRow, { backgroundColor: theme.colors.secondaryContainer }]}
            >
              <Text style={{ color: theme.colors.onSecondaryContainer, fontWeight: '800', marginRight: 6 }}>
                {i + 1}.
              </Text>
              <Text style={{ color: theme.colors.onSecondaryContainer, flex: 1 }}>{tip}</Text>
            </View>
          ))}
        </Card>

        {/* Viral share */}
        <ShareScoreCard
          title="Speaking Score"
          score={Math.round(score.overall)}
          subtitle="Practice session"
          breakdown={[
            { label: 'Pronunciation', value: Math.round(score.pronunciation) },
            { label: 'Fluency', value: Math.round(score.fluency) },
            { label: 'Grammar', value: Math.round(score.grammar) },
          ]}
        />

        <Button
          mode="contained"
          icon="refresh"
          onPress={() => navigation.replace('DailyChallenge')}
          style={{ marginTop: 8, borderRadius: 12 }}
          contentStyle={{ height: 50 }}
          testID="ss-retry-btn"
        >
          Try again
        </Button>
        <Button
          mode="outlined"
          onPress={() => navigation.navigate('Main', { screen: 'Speaking' })}
          style={{ marginTop: 8, borderRadius: 12 }}
          contentStyle={{ height: 46 }}
          testID="ss-back-btn"
        >
          Back to speaking
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
        <Text style={{ fontWeight: '800', color }}>{value}/100</Text>
      </View>
      <ProgressBar progress={value / 100} color={color} style={{ height: 8, borderRadius: 4, marginTop: 4 }} />
    </View>
  );
}

function buildTips(pron: number, flu: number, gra: number): string[] {
  const out: string[] = [];
  if (pron < 75) out.push('Practise the day\'s pronunciation drills to sharpen specific sounds.');
  if (flu < 75) out.push('Use linking words (so, because, however) to reduce pauses.');
  if (gra < 80) out.push('Review subject-verb agreement and common tense mistakes.');
  if (pron >= 85 && flu >= 85) out.push('You\'re sounding natural! Try a longer prompt for more challenge.');
  if (out.length === 0) out.push('Solid all-round! Record yourself again to lock in this level.');
  return out;
}

const styles = StyleSheet.create({
  content: { padding: 16, paddingBottom: 32, gap: 14 },
  hero: { padding: 20, borderRadius: radius.xl, alignItems: 'flex-start' },
  heroTitle: { color: '#fff', fontSize: 22, fontWeight: '800', marginTop: 8 },
  heroSub: { color: 'rgba(255,255,255,0.95)', marginTop: 4 },
  ringWrap: { alignItems: 'center', marginVertical: 8 },
  scoreBarTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  tipRow: { flexDirection: 'row', padding: 12, borderRadius: 10, marginTop: 6 },
});
