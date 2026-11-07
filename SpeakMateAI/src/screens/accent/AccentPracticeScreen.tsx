// Accent practice for one mode — lessons, listen & repeat, recorded sentence practice with AI feedback.
import React, { useCallback, useState } from 'react';
import { View, StyleSheet, ScrollView, Pressable } from 'react-native';
import { Text } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { RootStackParamList } from '@/navigation/types';
import { getAccent } from '@/data/accentContent';
import { practiceService, AccentResult } from '@/services/practiceService';
import { QuotaExceededError } from '@/services/aiService';
import { speechService } from '@/services/speechService';
import { useVoiceRecorder } from '@/hooks/useVoiceRecorder';
import { PracticeRecorder, ScoreBar } from '@/components/feature/PracticeRecorder';
import { useScreenInsets } from '@/hooks/useScreenInsets';
import { radius, spacing } from '@/config/theme';

type Tab = 'lessons' | 'practice';

export default function AccentPracticeScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { params } = useRoute<RouteProp<RootStackParamList, 'AccentPractice'>>();
  const { headerPaddingTop } = useScreenInsets();
  const mode = getAccent(params.accent);
  const rec = useVoiceRecorder(30);

  const [tab, setTab] = useState<Tab>('practice');
  const [idx, setIdx] = useState(0);
  const [result, setResult] = useState<AccentResult | null>(null);
  const [evaluating, setEvaluating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [quotaHit, setQuotaHit] = useState(false);
  const sentence = mode.sentences[idx];

  const say = useCallback((text: string, rate = 0.85) => speechService.speak(text, { language: mode.voiceLang, rate }), [mode.voiceLang]);

  const start = useCallback(async () => {
    setError(null); setResult(null);
    try { await rec.start(); } catch (e) {
      setError(e instanceof Error && /permission/i.test(e.message)
        ? 'Microphone permission is needed. Enable it in Settings → Apps → SpeakMate AI → Permissions.'
        : 'Could not start recording. Please try again.');
    }
  }, [rec]);

  const stop = useCallback(async () => {
    try {
      const { text, sec } = await rec.stop();
      if (!text) { setError('We could not hear you. Speak clearly, close to the phone, and try again.'); return; }
      setEvaluating(true);
      setResult(await practiceService.evaluateAccent(mode.id, sentence, text, sec));
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    } catch (e) {
      if (e instanceof QuotaExceededError) { setQuotaHit(true); setError('You have used today\'s free accent attempts. Upgrade to Premium for unlimited practice.'); }
      else setError('AI feedback is unavailable right now. Check your internet and try again.');
    } finally {
      setEvaluating(false);
    }
  }, [rec, mode.id, sentence]);

  const next = () => { setIdx((i) => (i + 1) % mode.sentences.length); setResult(null); setError(null); };

  return (
    <View style={{ flex: 1, backgroundColor: '#0A0418' }}>
      <LinearGradient colors={['#1F0E3D', '#0A0418', '#150828']} style={StyleSheet.absoluteFillObject} />
      <ScrollView contentContainerStyle={{ paddingBottom: 100, paddingTop: headerPaddingTop }}>
        <View style={styles.header}>
          <Pressable onPress={() => navigation.goBack()} style={styles.iconBtn} testID="accent-practice-back-btn">
            <Ionicons name="chevron-back" size={20} color="#F2EEFF" />
          </Pressable>
          <Text style={[styles.title, { marginLeft: spacing.md }]} testID="accent-practice-title">{mode.label}</Text>
        </View>

        <View style={styles.tabs}>
          {(['practice', 'lessons'] as Tab[]).map((t) => (
            <Pressable key={t} onPress={() => setTab(t)} style={[styles.tab, tab === t && { backgroundColor: mode.color }]} testID={`accent-tab-${t}`}>
              <Text style={[styles.tabText, tab === t && { color: '#0A0418' }]}>{t === 'practice' ? 'Listen & Speak' : 'Lessons'}</Text>
            </Pressable>
          ))}
        </View>

        {tab === 'lessons' ? mode.lessons.map((l, i) => (
          <View key={l.title} style={styles.card} testID={`accent-lesson-${i}`}>
            <Text style={[styles.cardTitle, { color: mode.color }]}>{l.title}</Text>
            <Text style={styles.body}>{l.tip}</Text>
            <View style={styles.chips}>
              {l.examples.map((ex) => (
                <Pressable key={ex} onPress={() => say(ex.replace(/\(.*\)/, ''), 0.7)} style={styles.chip} testID={`accent-lesson-${i}-example-${ex}`}>
                  <Ionicons name="volume-medium" size={12} color={mode.color} />
                  <Text style={styles.chipText}>{ex}</Text>
                </Pressable>
              ))}
            </View>
          </View>
        )) : (
          <>
            <View style={styles.card}>
              <Text style={styles.kicker}>SENTENCE {idx + 1} / {mode.sentences.length}</Text>
              <Text style={styles.sentence} testID="accent-sentence">{sentence}</Text>
              <View style={styles.row}>
                <Pressable onPress={() => say(sentence)} style={styles.chip} testID="accent-listen-btn">
                  <Ionicons name="volume-high" size={14} color={mode.color} /><Text style={styles.chipText}>Listen</Text>
                </Pressable>
                <Pressable onPress={() => say(sentence, 0.55)} style={styles.chip} testID="accent-listen-slow-btn">
                  <Ionicons name="speedometer" size={14} color={mode.color} /><Text style={styles.chipText}>Slow</Text>
                </Pressable>
                <Pressable onPress={next} style={styles.chip} testID="accent-next-btn">
                  <Ionicons name="play-skip-forward" size={14} color={mode.color} /><Text style={styles.chipText}>Next</Text>
                </Pressable>
              </View>
              <PracticeRecorder phase={rec.phase} evaluating={evaluating} seconds={rec.seconds} onStart={start} onStop={stop} testID="accent-record-btn" />
            </View>

            {error ? (
              <View style={styles.card}>
                <Text style={styles.error} testID="accent-error">{error}</Text>
                {quotaHit ? (
                  <Pressable onPress={() => navigation.navigate('Premium')} style={[styles.chip, { marginTop: 8 }]} testID="accent-upgrade-btn">
                    <Text style={styles.chipText}>See Premium</Text>
                  </Pressable>
                ) : null}
              </View>
            ) : null}

            {result ? <AccentResultCard r={result} color={mode.color} /> : null}
          </>
        )}
      </ScrollView>
    </View>
  );
}

function AccentResultCard({ r, color }: { r: AccentResult; color: string }) {
  return (
    <View style={styles.card} testID="accent-result">
      <Text style={styles.kicker}>PRONUNCIATION SCORE</Text>
      <Text style={[styles.score, { color }]} testID="accent-result-score">{r.score}<Text style={styles.scoreOf}>/100</Text></Text>
      <ScoreBar label="Words recognised" value={r.word_match} testID="accent-result-match" />
      <ScoreBar label="Clarity" value={r.clarity} />
      <ScoreBar label="Fluency" value={r.fluency} />
      <ScoreBar label="Intonation (estimated)" value={r.intonation} />
      <Text style={styles.dim}>Pace: {r.words_per_minute} words/min · We heard: “{r.transcript}”</Text>
      {r.mistakes.length ? <Text style={[styles.cardTitle, { color, marginTop: 12 }]}>Fix these</Text> : null}
      {r.mistakes.map((m, i) => (
        <View key={i} style={{ marginTop: 6 }} testID={`accent-mistake-${i}`}>
          <Text style={styles.body}><Text style={{ color: '#FF6B9D' }}>{m.heard}</Text>  →  <Text style={{ color: '#34D399' }}>{m.expected}</Text></Text>
          {m.tip ? <Text style={styles.dim}>{m.tip}</Text> : null}
        </View>
      ))}
      {r.intonation_tip ? <Text style={[styles.body, { marginTop: 10 }]}>Intonation: {r.intonation_tip}</Text> : null}
      {r.corrected_examples.map((ex) => <Text key={ex} style={styles.dim}>• {ex}</Text>)}
      {r.feedback ? <Text style={[styles.body, { marginTop: 10 }]}>{r.feedback}</Text> : null}
      {r.remaining_today >= 0 ? <Text style={styles.dim}>Free attempts left today: {r.remaining_today}</Text> : null}
      <Text style={styles.note}>{r.method_note}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.lg, paddingBottom: spacing.md },
  iconBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: 'rgba(255,255,255,0.06)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center' },
  title: { color: '#F2EEFF', fontSize: 20, fontWeight: '800' },
  tabs: { flexDirection: 'row', gap: 8, paddingHorizontal: spacing.lg, marginBottom: spacing.md },
  tab: { flex: 1, paddingVertical: 10, borderRadius: radius.pill, borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)', alignItems: 'center' },
  tabText: { color: '#F2EEFF', fontWeight: '800', fontSize: 13 },
  card: { marginHorizontal: spacing.lg, marginBottom: spacing.md, padding: spacing.md, borderRadius: radius.lg, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', backgroundColor: 'rgba(255,255,255,0.04)' },
  cardTitle: { fontSize: 14, fontWeight: '800', marginBottom: 4 },
  kicker: { color: 'rgba(242,238,255,0.6)', fontSize: 10, fontWeight: '800', letterSpacing: 0.5 },
  sentence: { color: '#F2EEFF', fontSize: 20, fontWeight: '800', marginTop: 6, lineHeight: 28 },
  row: { flexDirection: 'row', gap: 8, marginTop: 12, flexWrap: 'wrap' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 7, borderRadius: radius.pill, backgroundColor: 'rgba(255,255,255,0.06)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)', alignSelf: 'flex-start' },
  chipText: { color: '#F2EEFF', fontSize: 12, fontWeight: '700' },
  body: { color: '#F2EEFF', fontSize: 14, lineHeight: 20 },
  dim: { color: 'rgba(242,238,255,0.65)', fontSize: 12, marginTop: 6, lineHeight: 17 },
  error: { color: '#FCA5A5', fontSize: 13 },
  score: { fontSize: 44, fontWeight: '900', marginTop: 4 },
  scoreOf: { fontSize: 18, color: 'rgba(242,238,255,0.5)' },
  note: { color: 'rgba(242,238,255,0.45)', fontSize: 11, fontStyle: 'italic', marginTop: 12, lineHeight: 15 },
});
