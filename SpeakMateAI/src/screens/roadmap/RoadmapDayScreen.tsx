// Roadmap day — fixed lesson, objective, reading, speaking practice (real AI score) and completion.
import React, { useCallback, useState } from 'react';
import { View, StyleSheet, ScrollView, Pressable, ActivityIndicator } from 'react-native';
import { Text } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';

import { RootStackParamList } from '@/navigation/types';
import { getCurriculumDay } from '@/data/roadmapCurriculum';
import { practiceService } from '@/services/practiceService';
import { QuotaExceededError } from '@/services/aiService';
import { speechService } from '@/services/speechService';
import { useVoiceRecorder } from '@/hooks/useVoiceRecorder';
import { PracticeRecorder, ScoreBar } from '@/components/feature/PracticeRecorder';
import { useScreenInsets } from '@/hooks/useScreenInsets';
import { SpeakingScore } from '@/types';
import { radius, spacing } from '@/config/theme';

export default function RoadmapDayScreen() {
  const navigation = useNavigation();
  const { params } = useRoute<RouteProp<RootStackParamList, 'RoadmapDay'>>();
  const { headerPaddingTop } = useScreenInsets();
  const plan = params.day;
  const c = getCurriculumDay(plan.day);
  const rec = useVoiceRecorder(90);

  const [result, setResult] = useState<SpeakingScore | null>(null);
  const [transcript, setTranscript] = useState('');
  const [evaluating, setEvaluating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [completed, setCompleted] = useState(params.completed);
  const [error, setError] = useState<string | null>(null);

  const start = useCallback(async () => {
    setError(null);
    try { await rec.start(); } catch (e) {
      setError(e instanceof Error && /permission/i.test(e.message)
        ? 'Microphone permission is needed. Enable it in Settings → Apps → SpeakMate AI → Permissions.'
        : 'Could not start recording. Please try again.');
    }
  }, [rec]);

  const stop = useCallback(async () => {
    try {
      const { text, sec } = await rec.stop();
      if (text.split(/\s+/).length < 3) { setError('We could not hear enough. Speak a little longer and try again.'); return; }
      setTranscript(text);
      setEvaluating(true);
      setResult(await practiceService.scoreSpeaking(text, sec, c.speakingPrompt));
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    } catch (e) {
      setError(e instanceof QuotaExceededError
        ? 'Daily free AI scoring limit reached. You can still complete the day, or upgrade to Premium.'
        : 'AI scoring is unavailable right now. Check your internet and try again.');
    } finally {
      setEvaluating(false);
    }
  }, [rec, c.speakingPrompt]);

  const complete = useCallback(async () => {
    setSaving(true); setError(null);
    try {
      await practiceService.completeDay(plan.day, result?.overall);
      setCompleted(true);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      navigation.goBack();
    } catch (e) {
      setError(e instanceof Error && e.message === 'day_locked'
        ? 'Finish the previous day first.' : 'Could not save progress. Check your internet and try again.');
    } finally {
      setSaving(false);
    }
  }, [plan.day, result, navigation]);

  return (
    <View style={{ flex: 1, backgroundColor: '#0A0418' }}>
      <LinearGradient colors={['#1F0E3D', '#0A0418', '#150828']} style={StyleSheet.absoluteFillObject} />
      <ScrollView contentContainerStyle={{ paddingBottom: 120, paddingTop: headerPaddingTop }}>
        <View style={styles.header}>
          <Pressable onPress={() => navigation.goBack()} style={styles.iconBtn} testID="roadmap-day-back-btn">
            <Ionicons name="chevron-back" size={20} color="#F2EEFF" />
          </Pressable>
          <View style={{ flex: 1, marginLeft: spacing.md }}>
            <Text style={styles.kicker}>DAY {plan.day} OF 30{completed ? ' · COMPLETED' : ''}</Text>
            <Text style={styles.title} testID="roadmap-day-title">{c.title}</Text>
          </View>
        </View>

        <Section icon="flag" color="#34D399" title="Objective"><Text style={styles.body}>{c.objective}</Text></Section>
        <Section icon="school" color="#A992FF" title="Lesson"><Text style={styles.body}>{c.lesson}</Text></Section>
        <Section icon="book" color="#22D3EE" title="Read aloud">
          <Text style={[styles.body, styles.quote]}>{c.reading}</Text>
          <Pressable onPress={() => speechService.speak(c.reading, { rate: 0.85 })} style={styles.listenBtn} testID="roadmap-day-listen-btn">
            <Ionicons name="volume-high" size={14} color="#22D3EE" />
            <Text style={styles.listenText}>Listen first</Text>
          </Pressable>
        </Section>
        {plan.tasks?.length ? (
          <Section icon="sparkles" color="#FACC15" title="Your personalised tasks">
            {plan.tasks.map((t, i) => <Text key={i} style={styles.body}>{i + 1}. {t}</Text>)}
          </Section>
        ) : null}
        <Section icon="construct" color="#FF7A6B" title="Practical activity"><Text style={styles.body}>{c.activity}</Text></Section>

        <Section icon="mic" color="#FF6B9D" title="Speaking exercise">
          <Text style={styles.body}>{c.speakingPrompt}</Text>
          <PracticeRecorder phase={rec.phase} evaluating={evaluating} seconds={rec.seconds} onStart={start} onStop={stop} testID="roadmap-day-record-btn" />
          {typeof params.bestScore === 'number' && !result ? (
            <Text style={styles.dim}>Your best score for this day: {params.bestScore}/100</Text>
          ) : null}
        </Section>

        {error ? <Text style={styles.error} testID="roadmap-day-error">{error}</Text> : null}

        {result ? (
          <Section icon="analytics" color="#34D399" title={`AI score: ${result.overall}/100`}>
            <ScoreBar label="Fluency" value={result.fluency} />
            <ScoreBar label="Grammar" value={result.grammar} />
            <ScoreBar label="Vocabulary" value={result.vocabulary ?? 0} />
            <Text style={[styles.body, { marginTop: 10 }]} testID="roadmap-day-feedback">{result.feedback}</Text>
            {result.corrected ? <Text style={styles.dim}>Better version: {result.corrected}</Text> : null}
            <Text style={styles.dim}>You said: “{transcript}”</Text>
          </Section>
        ) : null}

        <Pressable onPress={complete} disabled={saving || completed} style={[styles.cta, (saving || completed) && { opacity: 0.6 }]} testID="roadmap-day-complete-btn">
          <LinearGradient colors={['#34D399', '#22D3EE']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.ctaInner}>
            {saving ? <ActivityIndicator color="#0A0418" /> : (
              <Text style={styles.ctaText}>{completed ? 'Day completed' : 'Mark day as complete'}</Text>
            )}
          </LinearGradient>
        </Pressable>
      </ScrollView>
    </View>
  );
}

function Section({ icon, color, title, children }: { icon: keyof typeof Ionicons.glyphMap; color: string; title: string; children: React.ReactNode }) {
  return (
    <View style={styles.card}>
      <View style={styles.cardHead}>
        <Ionicons name={icon} size={15} color={color} />
        <Text style={[styles.cardTitle, { color }]}>{title}</Text>
      </View>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.lg, paddingBottom: spacing.md },
  iconBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: 'rgba(255,255,255,0.06)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center' },
  kicker: { color: '#A992FF', fontSize: 11, fontWeight: '800', letterSpacing: 0.5 },
  title: { color: '#F2EEFF', fontSize: 20, fontWeight: '800', marginTop: 2 },
  card: { marginHorizontal: spacing.lg, marginBottom: spacing.md, padding: spacing.md, borderRadius: radius.lg, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', backgroundColor: 'rgba(255,255,255,0.04)' },
  cardHead: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
  cardTitle: { fontSize: 12, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.5 },
  body: { color: '#F2EEFF', fontSize: 14, lineHeight: 21 },
  quote: { fontStyle: 'italic', color: 'rgba(242,238,255,0.9)' },
  listenBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', marginTop: 10, paddingHorizontal: 12, paddingVertical: 6, borderRadius: radius.pill, borderWidth: 1, borderColor: 'rgba(34,211,238,0.4)' },
  listenText: { color: '#22D3EE', fontWeight: '800', fontSize: 12 },
  dim: { color: 'rgba(242,238,255,0.6)', fontSize: 12, marginTop: 8, lineHeight: 17 },
  error: { color: '#FCA5A5', fontSize: 13, marginHorizontal: spacing.lg, marginBottom: spacing.md },
  cta: { marginHorizontal: spacing.lg, marginTop: spacing.md, borderRadius: radius.pill, overflow: 'hidden' },
  ctaInner: { paddingVertical: 16, alignItems: 'center' },
  ctaText: { color: '#0A0418', fontWeight: '800', fontSize: 15 },
});
