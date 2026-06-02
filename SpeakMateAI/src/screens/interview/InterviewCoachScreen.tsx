import React from 'react';
import { View, StyleSheet, Pressable, ScrollView } from 'react-native';
import { Text, useTheme, Appbar } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { RootStackParamList } from '@/navigation/types';
import { INTERVIEW_TRACKS } from '@/data/interviewTracks';
import { useProgress } from '@/contexts/ProgressContext';
import { useAuth } from '@/contexts/AuthContext';
import { aiService } from '@/services/aiService';
import Card from '@/components/common/Card';
import ReadinessCard from '@/components/feature/ReadinessCard';
import PremiumBadge from '@/components/feature/PremiumBadge';
import { radius } from '@/config/theme';

type Nav = NativeStackNavigationProp<RootStackParamList>;

export default function InterviewCoachScreen() {
  const theme = useTheme();
  const navigation = useNavigation<Nav>();
  const { stats } = useProgress();
  const { user } = useAuth();

  const readiness = aiService.computeInterviewReadiness({
    interviewsCount: stats.interviewsCount,
    bestInterviewScore: stats.bestInterviewScore,
    streak: stats.streak,
    speakingScores: stats.speakingScores,
  });

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.background }} edges={['top']}>
      <Appbar.Header style={{ backgroundColor: theme.colors.surface }} elevated>
        <Appbar.Content title="AI Interview Coach" subtitle="Practise · Score · Improve" />
      </Appbar.Header>

      <ScrollView contentContainerStyle={styles.content}>
        <ReadinessCard
          score={readiness}
          interviewsCount={stats.interviewsCount}
          bestScore={stats.bestInterviewScore}
          onPress={() => navigation.navigate('Main', { screen: 'Progress' })}
        />

        <Text variant="titleMedium" style={styles.sectionTitle}>
          Choose your track
        </Text>

        {INTERVIEW_TRACKS.map((track, idx) => {
          const locked = idx === 2 && !user?.isPremium; // Technical = premium
          return (
            <Pressable
              key={track.id}
              onPress={() => {
                if (locked) {
                  navigation.navigate('Premium');
                  return;
                }
                navigation.navigate('InterviewSession', { track: track.id });
              }}
              testID={`coach-track-${track.id}`}
            >
              <LinearGradient
                colors={track.colors}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.trackCard}
              >
                <View style={styles.trackIconBox}>
                  <Ionicons name={track.icon} size={28} color="#fff" />
                </View>
                <View style={{ flex: 1 }}>
                  <View style={styles.titleRow}>
                    <Text style={styles.trackTitle}>{track.title}</Text>
                    {locked ? (
                      <View style={styles.lockedTag}>
                        <Ionicons name="lock-closed" size={10} color="#fff" />
                        <Text style={styles.lockedText}>PREMIUM</Text>
                      </View>
                    ) : null}
                  </View>
                  <Text style={styles.trackDesc}>{track.description}</Text>
                  <View style={styles.metaRow}>
                    <View style={styles.metaPill}>
                      <Ionicons name="time-outline" size={12} color="#fff" />
                      <Text style={styles.metaText}>{track.duration}</Text>
                    </View>
                    <View style={styles.metaPill}>
                      <Ionicons name="help-circle-outline" size={12} color="#fff" />
                      <Text style={styles.metaText}>{track.questions.length} Qs</Text>
                    </View>
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={22} color="#fff" />
              </LinearGradient>
            </Pressable>
          );
        })}

        <Text variant="titleMedium" style={styles.sectionTitle}>
          Tips
        </Text>
        <Card>
          <TipRow icon="git-branch-outline" text="Use the STAR framework: Situation, Task, Action, Result." />
          <TipRow icon="happy-outline" text="Smile while answering — your voice carries warmth." />
          <TipRow icon="time-outline" text="Aim for 60–90 second answers. Be specific, not generic." />
          <TipRow icon="repeat-outline" text="Practise the same question 3× before moving on." last />
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

function TipRow({
  icon,
  text,
  last,
}: {
  icon: keyof typeof import('@expo/vector-icons').Ionicons.glyphMap;
  text: string;
  last?: boolean;
}) {
  const theme = useTheme();
  return (
    <View style={[styles.tipRow, last ? null : styles.tipDivider]}>
      <Ionicons name={icon} size={18} color={theme.colors.primary} />
      <Text style={{ flex: 1, marginLeft: 10 }}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, gap: 14 },
  sectionTitle: { fontWeight: '700', marginTop: 8 },
  trackCard: {
    borderRadius: radius.lg,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  trackIconBox: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: 'rgba(255,255,255,0.22)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  trackTitle: { color: '#fff', fontSize: 17, fontWeight: '800' },
  trackDesc: { color: 'rgba(255,255,255,0.9)', fontSize: 13, marginTop: 2 },
  metaRow: { flexDirection: 'row', marginTop: 8, gap: 8 },
  metaPill: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.22)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    alignItems: 'center',
    gap: 4,
  },
  metaText: { color: '#fff', fontSize: 11, fontWeight: '600' },
  lockedTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.35)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    gap: 3,
  },
  lockedText: { color: '#fff', fontSize: 9, fontWeight: '800', letterSpacing: 0.4 },
  tipRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10 },
  tipDivider: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: 'rgba(0,0,0,0.08)' },
});
