import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, StyleSheet, Animated, Easing, Pressable, Alert, ScrollView } from 'react-native';
import { Text, Button, useTheme, TextInput, ProgressBar, Appbar } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { RootStackParamList } from '@/navigation/types';
import { speechService } from '@/services/speechService';
import { aiService } from '@/services/aiService';
import { useProgress } from '@/contexts/ProgressContext';
import { SpeakingScore } from '@/types';
import Card from '@/components/common/Card';
import { todayKey } from '@/utils/helpers';
import { radius } from '@/config/theme';

type Nav = NativeStackNavigationProp<RootStackParamList>;

const PROMPTS = [
  'Describe your favourite weekend activity.',
  'Tell me about your last vacation.',
  'What are your career goals for the next year?',
  'Talk about a movie you recently watched.',
  'Describe your hometown to a tourist.',
];

type Phase = 'idle' | 'recording' | 'processing' | 'result';

export default function SpeakingPracticeScreen() {
  const theme = useTheme();
  const navigation = useNavigation<Nav>();
  const { recordActivity, recordSpeakingScore, stats } = useProgress();
  const [phase, setPhase] = useState<Phase>('idle');
  const [transcript, setTranscript] = useState('');
  const [duration, setDuration] = useState(0);
  const [score, setScore] = useState<SpeakingScore | null>(null);
  const [prompt, setPrompt] = useState(PROMPTS[0]);
  const [error, setError] = useState<string | null>(null);
  const pulse = useRef(new Animated.Value(1)).current;
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startRef = useRef<number>(0);

  useEffect(() => {
    if (phase === 'recording') {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulse, {
            toValue: 1.25,
            duration: 700,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(pulse, {
            toValue: 1,
            duration: 700,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      pulse.stopAnimation();
      pulse.setValue(1);
    }
  }, [phase, pulse]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const newPrompt = () => {
    const next = PROMPTS[Math.floor(Math.random() * PROMPTS.length)];
    setPrompt(next);
    setScore(null);
    setTranscript('');
    setPhase('idle');
  };

  const startRecording = useCallback(async () => {
    setError(null);
    try {
      await speechService.startRecording();
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
      setPhase('recording');
      setDuration(0);
      startRef.current = Date.now();
      timerRef.current = setInterval(() => {
        setDuration(Math.floor((Date.now() - startRef.current) / 1000));
      }, 250);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Could not access microphone';
      setError(msg);
    }
  }, []);

  const stopRecording = useCallback(async () => {
    if (timerRef.current) clearInterval(timerRef.current);
    try {
      const { durationMillis } = await speechService.stopRecording();
      const sec = Math.max(1, Math.round(durationMillis / 1000));
      setDuration(sec);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      setPhase('processing');
      // In a real app: send audio to STT. Here, we use the user's typed transcript fallback.
      const sample =
        transcript.trim() ||
        'I usually spend my weekends with family. We watch movies and sometimes go out for dinner.';
      const result = await aiService.scoreSpeaking(sample, sec);
      setScore(result);
      setPhase('result');
      recordActivity(Math.max(1, Math.round(sec / 60)), 'speaking').catch(() => {});
      recordSpeakingScore(result.overall).catch(() => {});
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Failed to process recording';
      setError(msg);
      setPhase('idle');
    }
  }, [transcript, recordActivity, recordSpeakingScore]);

  const onPlaybackPrompt = () => {
    speechService.speak(prompt);
  };

  const tryAgain = () => {
    setScore(null);
    setTranscript('');
    setPhase('idle');
    setDuration(0);
  };

  const colorForScore = (n: number) => {
    if (n >= 85) return theme.colors.tertiary;
    if (n >= 70) return theme.colors.primary;
    if (n >= 55) return '#F59E0B';
    return theme.colors.error;
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.background }} edges={['top']}>
      <Appbar.Header style={{ backgroundColor: theme.colors.surface }} elevated>
        <Appbar.Content title="Speaking Practice" subtitle="Record · Analyse · Improve" />
        <Appbar.Action icon="shuffle" onPress={newPrompt} testID="speak-new-prompt" />
      </Appbar.Header>

      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <View style={styles.shortcutsRow}>
          <Pressable
            onPress={() => navigation.navigate('DailyChallenge')}
            style={{ flex: 1 }}
            testID="speak-daily-challenge-btn"
          >
            <LinearGradient
              colors={['#FF7A6B', '#FFA396']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.shortcut}
            >
              <Ionicons name="flash" size={22} color="#fff" />
              <View style={{ flex: 1, marginLeft: 8 }}>
                <Text style={styles.shortcutTitle}>Daily Challenge</Text>
                <Text style={styles.shortcutSub}>
                  {stats.dailyChallengeCompletedDate === todayKey()
                    ? '✓ Done today'
                    : `Streak ${stats.dailyChallengeStreak}🔥`}
                </Text>
              </View>
            </LinearGradient>
          </Pressable>
          <Pressable
            onPress={() => navigation.navigate('PronunciationPractice')}
            style={{ flex: 1 }}
            testID="speak-pronunciation-btn"
          >
            <LinearGradient
              colors={['#34D399', '#6EE7B7']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.shortcut}
            >
              <Ionicons name="megaphone" size={22} color="#fff" />
              <View style={{ flex: 1, marginLeft: 8 }}>
                <Text style={styles.shortcutTitle}>Pronunciation</Text>
                <Text style={styles.shortcutSub}>3 daily drills</Text>
              </View>
            </LinearGradient>
          </Pressable>
        </View>

        <View style={styles.container}>
        <Card>
          <Text variant="labelMedium" style={{ color: theme.colors.primary, fontWeight: '700' }}>
            PROMPT
          </Text>
          <Text variant="titleMedium" style={{ marginTop: 6, lineHeight: 24 }}>
            {prompt}
          </Text>
          <Button
            mode="text"
            icon="volume-high"
            onPress={onPlaybackPrompt}
            style={{ alignSelf: 'flex-start', marginTop: 6 }}
            testID="speak-listen-prompt"
          >
            Listen
          </Button>
        </Card>

        <View style={styles.recordArea}>
          <Animated.View style={{ transform: [{ scale: pulse }] }}>
            <Pressable
              onPress={phase === 'recording' ? stopRecording : startRecording}
              disabled={phase === 'processing'}
              testID="speak-record-btn"
              style={[
                styles.recordBtn,
                {
                  backgroundColor:
                    phase === 'recording' ? theme.colors.error : theme.colors.primary,
                  opacity: phase === 'processing' ? 0.6 : 1,
                },
              ]}
            >
              <Ionicons
                name={phase === 'recording' ? 'stop' : 'mic'}
                size={48}
                color="#fff"
              />
            </Pressable>
          </Animated.View>
          <Text style={{ marginTop: 10, color: theme.colors.onSurfaceVariant }}>
            {phase === 'recording'
              ? `Recording… ${duration}s`
              : phase === 'processing'
                ? 'Analysing…'
                : phase === 'result'
                  ? 'Done!'
                  : 'Tap to record (15–30s)'}
          </Text>
        </View>

        {phase !== 'result' ? (
          <TextInput
            mode="outlined"
            label="Optional: type what you said"
            value={transcript}
            onChangeText={setTranscript}
            multiline
            numberOfLines={3}
            style={{ marginTop: 8 }}
            testID="speak-transcript-input"
          />
        ) : null}

        {error ? (
          <Text style={{ color: theme.colors.error, marginTop: 8 }}>{error}</Text>
        ) : null}

        {phase === 'result' && score ? (
          <Card style={{ marginTop: 16 }}>
            <View style={styles.scoreHeader}>
              <Text variant="titleMedium" style={{ fontWeight: '700' }}>
                Your Score
              </Text>
              <Text
                style={[styles.overall, { color: colorForScore(score.overall) }]}
              >
                {score.overall}
              </Text>
            </View>

            <ScoreRow label="Pronunciation" value={score.pronunciation} color={theme.colors.primary} />
            <ScoreRow label="Fluency" value={score.fluency} color={theme.colors.secondary} />
            <ScoreRow label="Grammar" value={score.grammar} color={theme.colors.tertiary} />

            <View
              style={[
                styles.feedbackBox,
                { backgroundColor: theme.colors.primaryContainer },
              ]}
            >
              <Text style={{ color: theme.colors.onPrimaryContainer }}>{score.feedback}</Text>
            </View>

            <Button
              mode="contained"
              onPress={tryAgain}
              icon="refresh"
              style={{ marginTop: 12, borderRadius: 12 }}
              testID="speak-tryagain-btn"
            >
              Try again
            </Button>
          </Card>
        ) : null}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function ScoreRow({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <View style={{ marginTop: 10 }}>
      <View style={styles.scoreRowTop}>
        <Text>{label}</Text>
        <Text style={{ fontWeight: '700' }}>{value}/100</Text>
      </View>
      <ProgressBar progress={value / 100} color={color} style={styles.progress} />
    </View>
  );
}

const styles = StyleSheet.create({
  scrollContent: { paddingBottom: 32 },
  shortcutsRow: { flexDirection: 'row', gap: 10, padding: 16, paddingBottom: 0 },
  shortcut: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: radius.lg,
    minHeight: 60,
  },
  shortcutTitle: { color: '#fff', fontWeight: '800', fontSize: 13 },
  shortcutSub: { color: 'rgba(255,255,255,0.85)', fontSize: 11, marginTop: 1 },
  container: { padding: 16, flex: 1 },
  recordArea: {
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 12,
  },
  recordBtn: {
    width: 110,
    height: 110,
    borderRadius: 55,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  scoreHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  overall: { fontSize: 32, fontWeight: '800' },
  scoreRowTop: { flexDirection: 'row', justifyContent: 'space-between' },
  progress: { marginTop: 4, height: 8, borderRadius: 4 },
  feedbackBox: { marginTop: 12, padding: 12, borderRadius: radius.md },
});
