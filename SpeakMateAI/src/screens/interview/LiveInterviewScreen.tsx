// Live AI Interview — voice-driven back-and-forth with real-time 6-axis scoring
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { View, StyleSheet, Pressable, ScrollView, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Text, ActivityIndicator } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import * as Haptics from 'expo-haptics';

import { RootStackParamList } from '@/navigation/types';
import { useProgress } from '@/contexts/ProgressContext';
import { useGamification } from '@/contexts/GamificationContext';
import { useCompanion } from '@/contexts/CompanionContext';
import { speechService } from '@/services/speechService';
import { COMPANIONS, getCompanion } from '@/config/companions';
import { getTrackMeta } from '@/data/interviewTracks';
import { InterviewResult } from '@/types';
import CompanionAvatar from '@/components/feature/CompanionAvatar';
import VoiceMicButton from '@/components/feature/VoiceMicButton';
import { radius, spacing } from '@/config/theme';

type Nav = NativeStackNavigationProp<RootStackParamList>;
type Rt = RouteProp<RootStackParamList, 'LiveInterview'>;

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL || '';
const AI = BACKEND_URL ? `${BACKEND_URL.replace(/\/$/, '')}/api/ai` : '';

interface LiveScores {
  communication: number;
  fluency: number;
  confidence: number;
  grammar: number;
  relevance: number;
  professionalism: number;
}

interface LiveResponse {
  scores: LiveScores | null;
  feedback: string | null;
  filler_words: string[];
  weak_points: string[];
  better_version: string | null;
  next_question: string;
  should_end: boolean;
  question_number: number;
}

interface QA {
  question: string;
  answer: string;
  scores: LiveScores;
  feedback: string;
  fillers: string[];
  weakPoints: string[];
  betterVersion: string;
}

type Phase = 'starting' | 'speaking' | 'idle' | 'listening' | 'transcribing' | 'thinking' | 'done';

export default function LiveInterviewScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Rt>();
  const { selectCompanion } = useCompanion();
  const { recordActivity, recordInterviewScore } = useProgress();
  const { awardAction, checkBadges } = useGamification();

  const track = route.params?.track || 'hr';
  const targetQuestions = route.params?.targetQuestions || 5;
  const difficulty = route.params?.difficulty || 'intermediate';
  const meta = getTrackMeta(track);
  const interviewer = getCompanion(meta.interviewer);

  const [phase, setPhase] = useState<Phase>('starting');
  const [currentQuestion, setCurrentQuestion] = useState('');
  const [history, setHistory] = useState<QA[]>([]);
  const [latestFeedback, setLatestFeedback] = useState<LiveResponse | null>(null);
  const startedRef = useRef(Date.now());

  useEffect(() => {
    selectCompanion(meta.interviewer);
    startInterview();
    return () => {
      speechService.stopAudio();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const startInterview = useCallback(async () => {
    setPhase('starting');
    try {
      const res = await fetch(`${AI}/interview/live`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ track, difficulty, history: [], target_questions: targetQuestions }),
      });
      const data = (await res.json()) as LiveResponse;
      setCurrentQuestion(data.next_question);
      setPhase('speaking');
      await speechService.speakWithAI(data.next_question, { companionId: meta.interviewer, speed: 0.95 });
      setPhase('idle');
    } catch {
      setPhase('idle');
    }
  }, [track, targetQuestions, meta.interviewer]);

  const onMic = async () => {
    if (phase === 'speaking') {
      await speechService.stopAudio();
      setPhase('idle');
      return;
    }
    if (phase === 'listening') {
      // stop & transcribe
      try {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        const { uri, durationMillis } = await speechService.stopRecording();
        if (!uri || durationMillis < 1500) {
          setPhase('idle');
          return;
        }
        setPhase('transcribing');
        const text = await speechService.transcribe(uri);
        if (!text) {
          setPhase('idle');
          return;
        }
        await submitAnswer(text);
      } catch {
        setPhase('idle');
      }
      return;
    }
    // idle → start recording
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      await speechService.startRecording();
      setPhase('listening');
    } catch (e) {
      Alert.alert('Microphone', 'Could not start recording. Check permissions.');
    }
  };

  const submitAnswer = async (answer: string) => {
    setPhase('thinking');
    try {
      const res = await fetch(`${AI}/interview/live`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          track,
          history: history.map((h) => ({ question: h.question, answer: h.answer })),
          last_question: currentQuestion,
          last_answer: answer,
          target_questions: targetQuestions, difficulty,
        }),
      });
      const data = (await res.json()) as LiveResponse;
      setLatestFeedback(data);
      const newQa: QA = {
        question: currentQuestion,
        answer,
        scores: data.scores || { communication: 0, fluency: 0, confidence: 0, grammar: 0, relevance: 0, professionalism: 0 },
        feedback: data.feedback || '',
        fillers: data.filler_words,
        weakPoints: data.weak_points,
        betterVersion: data.better_version || '',
      };
      const newHistory = [...history, newQa];
      setHistory(newHistory);
      awardAction('INTERVIEW_QUESTION').catch(() => {});
      if (data.should_end) {
        finalize(newHistory);
        return;
      }
      setCurrentQuestion(data.next_question);
      setPhase('speaking');
      await speechService.speakWithAI(data.next_question, { companionId: meta.interviewer, speed: 0.95 });
      setPhase('idle');
    } catch {
      setPhase('idle');
    }
  };

  const finalize = async (allQa: QA[]) => {
    setPhase('done');
    const avg = (k: keyof LiveScores) =>
      allQa.length ? Math.round(allQa.reduce((s, a) => s + (a.scores[k] || 0), 0) / allQa.length) : 0;
    const overall = Math.round((avg('communication') + avg('fluency') + avg('confidence') + avg('grammar') + avg('relevance') + avg('professionalism')) / 6);
    const result: InterviewResult = {
      track,
      overallScore: overall,
      communicationScore: avg('communication'),
      fluencyScore: avg('fluency'),
      confidenceScore: avg('confidence'),
      grammarScore: avg('grammar'),
      relevanceScore: avg('relevance'),
      professionalismScore: avg('professionalism'),
      contentScore: avg('relevance'),
      strengths: allQa.flatMap((a) => a.feedback ? [a.feedback.split('.')[0]] : []).slice(0, 3),
      suggestions: Array.from(new Set(allQa.flatMap((a) => a.weakPoints))).slice(0, 4),
      answers: allQa.map((a, i) => ({
        questionId: `live-${i}`,
        question: a.question,
        answer: a.answer,
        score: Math.round((a.scores.communication + a.scores.fluency + a.scores.confidence + a.scores.grammar + a.scores.relevance + a.scores.professionalism) / 6),
        feedback: a.feedback,
      })),
      completedAt: Date.now(),
    };
    await recordActivity(Math.max(2, allQa.length * 2), 'interview');
    await recordInterviewScore(overall);
    await awardAction('INTERVIEW_SESSION_COMPLETE');
    if (overall >= 90) await awardAction('PERFECT_SCORE_BONUS');
    await checkBadges({ interviewsCount: 1, bestInterviewScore: overall });
    navigation.replace('InterviewResults', { result });
  };

  const phaseLabel: Record<Phase, string> = {
    starting: 'Connecting...',
    speaking: `${interviewer.name} is asking`,
    idle: 'Tap mic to answer',
    listening: 'Recording... tap to send',
    transcribing: 'Transcribing...',
    thinking: 'Scoring your answer...',
    done: 'Interview complete',
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#0A0418' }}>
      <LinearGradient colors={[`${interviewer.accent}55`, '#0A0418', '#1F0E3D']} style={StyleSheet.absoluteFillObject} />
      <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
        <View style={styles.header}>
          <Pressable
            onPress={() => {
              Alert.alert('End interview?', 'Your progress so far will be lost.', [
                { text: 'Cancel', style: 'cancel' },
                { text: 'End', style: 'destructive', onPress: () => navigation.goBack() },
              ]);
            }}
            style={styles.endBtn}
            testID="live-end-btn"
          >
            <Ionicons name="close" size={22} color="#F2EEFF" />
          </Pressable>
          <View style={styles.progressPill}>
            <Text style={styles.progressText}>
              Q{Math.min(history.length + 1, targetQuestions)} / {targetQuestions}
            </Text>
          </View>
          <View style={{ width: 36 }} />
        </View>

        <View style={styles.intvCenter}>
          <CompanionAvatar
            companion={interviewer}
            size={120}
            showRing
            state={phase === 'listening' ? 'listening' : phase === 'speaking' ? 'speaking' : phase === 'thinking' || phase === 'transcribing' ? 'thinking' : 'idle'}
          />
          <Text style={styles.intName}>{interviewer.name}</Text>
          <Text style={styles.intRole}>{meta.title} Interviewer</Text>
        </View>

        <View style={styles.qCard}>
          <Text style={styles.qLabel}>QUESTION</Text>
          <Text style={styles.qText}>{currentQuestion || 'Loading...'}</Text>
          <View style={styles.statePill}>
            <View style={[styles.dot, { backgroundColor: phase === 'idle' ? '#34D399' : phase === 'listening' ? '#22D3EE' : '#FACC15' }]} />
            <Text style={styles.stateText}>{phaseLabel[phase]}</Text>
          </View>
        </View>

        {latestFeedback?.scores ? (
          <ScrollView style={{ maxHeight: 180 }} contentContainerStyle={{ paddingHorizontal: spacing.lg }}>
            <Text style={styles.fbHead}>Last answer scored:</Text>
            <View style={styles.scoreGrid}>
              <MiniScore label="Comm" v={latestFeedback.scores.communication} />
              <MiniScore label="Fluency" v={latestFeedback.scores.fluency} />
              <MiniScore label="Confidence" v={latestFeedback.scores.confidence} />
              <MiniScore label="Grammar" v={latestFeedback.scores.grammar} />
              <MiniScore label="Relevance" v={latestFeedback.scores.relevance} />
              <MiniScore label="Prof" v={latestFeedback.scores.professionalism} />
            </View>
            {latestFeedback.filler_words.length > 0 && (
              <Text style={styles.fillerText}>
                Filler words: {latestFeedback.filler_words.map((f) => `"${f}"`).join(', ')}
              </Text>
            )}
            {latestFeedback.feedback && (
              <Text style={styles.fbText}>{latestFeedback.feedback}</Text>
            )}
          </ScrollView>
        ) : null}

        <View style={styles.bottom}>
          {phase === 'starting' || phase === 'thinking' || phase === 'transcribing' ? (
            <ActivityIndicator color="#A992FF" size="large" />
          ) : (
            <VoiceMicButton onPress={onMic} recording={phase === 'listening'} state={phase === 'listening' ? 'listening' : phase === 'speaking' ? 'speaking' : 'idle'} />
          )}
        </View>
      </SafeAreaView>
    </View>
  );
}

function MiniScore({ label, v }: { label: string; v: number }) {
  const color = v >= 80 ? '#34D399' : v >= 60 ? '#FACC15' : '#FF6B9D';
  return (
    <View style={styles.miniScore}>
      <Text style={[styles.miniVal, { color }]}>{v}</Text>
      <Text style={styles.miniLbl}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  endBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.08)' },
  progressPill: { backgroundColor: 'rgba(124,92,255,0.18)', paddingHorizontal: 14, paddingVertical: 6, borderRadius: radius.pill, borderWidth: 1, borderColor: 'rgba(124,92,255,0.4)' },
  progressText: { color: '#A992FF', fontWeight: '800', fontSize: 12 },
  intvCenter: { alignItems: 'center', marginTop: spacing.md },
  intName: { color: '#F2EEFF', fontSize: 22, fontWeight: '800', marginTop: spacing.md },
  intRole: { color: 'rgba(242,238,255,0.7)', fontSize: 12 },
  qCard: { margin: spacing.lg, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: radius.xl, padding: spacing.lg, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
  qLabel: { color: 'rgba(242,238,255,0.5)', fontSize: 10, fontWeight: '800', letterSpacing: 1 },
  qText: { color: '#F2EEFF', fontSize: 16, fontWeight: '600', marginTop: 6, lineHeight: 22 },
  statePill: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', backgroundColor: 'rgba(0,0,0,0.25)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.pill, marginTop: 10 },
  dot: { width: 7, height: 7, borderRadius: 4 },
  stateText: { color: '#F2EEFF', fontSize: 11, fontWeight: '700' },
  fbHead: { color: 'rgba(242,238,255,0.7)', fontSize: 11, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 },
  scoreGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 8 },
  miniScore: { width: '31.5%', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 10, paddingVertical: 8, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
  miniVal: { fontSize: 18, fontWeight: '800' },
  miniLbl: { color: 'rgba(242,238,255,0.6)', fontSize: 10, marginTop: 2 },
  fillerText: { color: '#FACC15', fontSize: 11, marginTop: 4 },
  fbText: { color: '#F2EEFF', fontSize: 12, lineHeight: 18, marginTop: 4 },
  bottom: { alignItems: 'center', paddingHorizontal: spacing.lg, paddingBottom: spacing.md, marginTop: 'auto' },
});
