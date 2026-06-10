import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, StyleSheet, Animated, Easing, Pressable, ScrollView } from 'react-native';
import { Text, Button, useTheme, Appbar, ProgressBar } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { RootStackParamList } from '@/navigation/types';
import { getDailyChallenge } from '@/data/dailyChallenges';
import { speechService } from '@/services/speechService';
import { aiService } from '@/services/aiService';
import { useProgress } from '@/contexts/ProgressContext';
import { useGamification } from '@/contexts/GamificationContext';
import Card from '@/components/common/Card';
import { todayKey } from '@/utils/helpers';
import { radius } from '@/config/theme';

type Nav = NativeStackNavigationProp<RootStackParamList>;
type Phase = 'idle' | 'recording' | 'scoring' | 'done';

export default function DailyChallengeScreen() {
  const theme = useTheme();
  const navigation = useNavigation<Nav>();
  const { recordSpeakingScore, recordActivity, recordDailyChallenge, stats } = useProgress();
  const { awardAction, checkBadges } = useGamification();
  const challenge = getDailyChallenge();
  const completedToday = stats.dailyChallengeCompletedDate === todayKey();

  const [phase, setPhase] = useState<Phase>('idle');
  const [elapsed, setElapsed] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const pulse = useRef(new Animated.Value(1)).current;
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startRef = useRef(0);

  useEffect(() => {
    if (phase === 'recording') {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulse, { toValue: 1.3, duration: 700, useNativeDriver: true, easing: Easing.inOut(Easing.ease) }),
          Animated.timing(pulse, { toValue: 1, duration: 700, useNativeDriver: true, easing: Easing.inOut(Easing.ease) }),
        ])
      ).start();
    } else {
      pulse.stopAnimation();
      pulse.setValue(1);
    }
  }, [phase, pulse]);

  useEffect(() => () => { if (timerRef.current) clearInterval(timerRef.current); }, []);

  const start = useCallback(async () => {
    setError(null);
    try {
      await speechService.startRecording();
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
      setPhase('recording');
      setElapsed(0);
      startRef.current = Date.now();
      timerRef.current = setInterval(() => {
        const sec = Math.floor((Date.now() - startRef.current) / 1000);
        setElapsed(sec);
        if (sec >= challenge.durationSec) stop();
      }, 250);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Microphone error');
    }
  }, [challenge.durationSec]);

  const stop = useCallback(async () => {
    if (timerRef.current) clearInterval(timerRef.current);
    setPhase('scoring');
    try {
      const { durationMillis } = await speechService.stopRecording();
      const sec = Math.max(5, Math.round(durationMillis / 1000));
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      const sample =
        'This is my response to today\'s challenge. I tried to use clear language and stay within the time.';
      const score = await aiService.scoreSpeaking(sample, sec);
      await recordSpeakingScore(score.overall);
      await recordActivity(Math.max(1, Math.round(sec / 60)), 'speaking');
      await recordDailyChallenge();
      await awardAction('DAILY_CHALLENGE');
      await awardAction('SPEAKING_SESSION');
      await checkBadges({ streak: stats.streak, dailyChallengeStreak: stats.dailyChallengeStreak + 1, bestSpeakingScore: Math.max(stats.bestSpeakingScore, score.overall) });
      setPhase('done');
      navigation.replace('SpeakingScore', { score, challengeId: challenge.id });
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Could not score');
      setPhase('idle');
    }
  }, [recordSpeakingScore, recordActivity, recordDailyChallenge, awardAction, checkBadges, navigation, challenge.id, stats]);

  const progress = Math.min(1, elapsed / challenge.durationSec);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.background }} edges={['top']}>
      <Appbar.Header style={{ backgroundColor: theme.colors.surface }} elevated>
        <Appbar.BackAction onPress={() => navigation.goBack()} />
        <Appbar.Content title="Daily Challenge" subtitle={`Streak: ${stats.dailyChallengeStreak} 🔥`} />
      </Appbar.Header>

      <ScrollView contentContainerStyle={styles.content}>
        <LinearGradient
          colors={['#FF7A6B', '#FFA396']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.hero}
        >
          <Text style={styles.tag}>TODAY'S CHALLENGE · {challenge.focus.toUpperCase()}</Text>
          <Text style={styles.heroTitle}>{challenge.title}</Text>
          <Text style={styles.prompt}>{challenge.prompt}</Text>
          <View style={styles.metaRow}>
            <View style={styles.metaPill}>
              <Ionicons name="time" size={14} color="#fff" />
              <Text style={styles.metaText}>{challenge.durationSec}s</Text>
            </View>
            {completedToday ? (
              <View style={[styles.metaPill, { backgroundColor: 'rgba(255,255,255,0.35)' }]}>
                <Ionicons name="checkmark-circle" size={14} color="#fff" />
                <Text style={styles.metaText}>Completed today</Text>
              </View>
            ) : null}
          </View>
        </LinearGradient>

        <Card>
          <Text variant="titleSmall" style={{ fontWeight: '700' }}>How it works</Text>
          <View style={{ marginTop: 8, gap: 6 }}>
            {[
              'Read the prompt carefully.',
              'Tap the mic, then start speaking.',
              'Recording stops automatically at the timer.',
              'Get your score & detailed feedback.',
            ].map((step, i) => (
              <View key={i} style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
                <Text style={{ color: theme.colors.primary, fontWeight: '800', width: 22 }}>{i + 1}.</Text>
                <Text style={{ flex: 1 }}>{step}</Text>
              </View>
            ))}
          </View>
        </Card>

        <Button mode="text" icon="volume-high" onPress={() => speechService.speak(challenge.prompt)} testID="dc-listen-btn">
          Listen to prompt
        </Button>

        <View style={styles.recordArea}>
          <Animated.View style={{ transform: [{ scale: pulse }] }}>
            <Pressable
              onPress={phase === 'recording' ? stop : start}
              disabled={phase === 'scoring'}
              testID="dc-record-btn"
              style={[
                styles.recordBtn,
                { backgroundColor: phase === 'recording' ? theme.colors.error : '#FF7A6B' },
              ]}
            >
              <Ionicons name={phase === 'recording' ? 'stop' : 'mic'} size={48} color="#fff" />
            </Pressable>
          </Animated.View>

          {phase === 'recording' ? (
            <View style={styles.timerWrap}>
              <Text style={[styles.timerText, { color: theme.colors.onSurface }]}>
                {elapsed}s / {challenge.durationSec}s
              </Text>
              <ProgressBar progress={progress} color={theme.colors.error} style={styles.timerBar} />
            </View>
          ) : (
            <Text style={{ marginTop: 12, color: theme.colors.onSurfaceVariant }}>
              {phase === 'scoring' ? 'Scoring your response…' : 'Tap to start recording'}
            </Text>
          )}
        </View>

        {error ? <Text style={{ color: theme.colors.error, textAlign: 'center' }}>{error}</Text> : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, gap: 14 },
  hero: { borderRadius: radius.xl, padding: 20 },
  tag: { color: 'rgba(255,255,255,0.85)', fontSize: 11, fontWeight: '800', letterSpacing: 1 },
  heroTitle: { color: '#fff', fontSize: 22, fontWeight: '800', marginTop: 6 },
  prompt: { color: 'rgba(255,255,255,0.95)', marginTop: 8, lineHeight: 22, fontSize: 15 },
  metaRow: { flexDirection: 'row', gap: 8, marginTop: 12 },
  metaPill: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.22)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    alignItems: 'center',
    gap: 4,
  },
  metaText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  recordArea: { alignItems: 'center', marginTop: 12 },
  recordBtn: {
    width: 110,
    height: 110,
    borderRadius: 55,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 6,
  },
  timerWrap: { marginTop: 12, alignSelf: 'stretch', paddingHorizontal: 16 },
  timerText: { textAlign: 'center', fontWeight: '700' },
  timerBar: { height: 6, borderRadius: 3, marginTop: 6 },
});
