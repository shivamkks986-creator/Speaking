// "Tell Me About Yourself" Trainer — voice-first self-introduction practice.
// Records the user (max 90s), transcribes via Whisper, scores via Claude on
// 6 dimensions (Structure/Clarity/Confidence/Relevance/Impact + Overall),
// detects filler words, missing PPF elements, and returns a polished version.
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  StyleSheet,
  Animated,
  Easing,
  Pressable,
  ScrollView,
  TextInput as RNTextInput,
  Platform,
  StatusBar,
} from 'react-native';
import { Text } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { RootStackParamList } from '@/navigation/types';
import { speechService } from '@/services/speechService';
import { aiService, QuotaExceededError } from '@/services/aiService';
import { TmayEvaluation } from '@/types';
import { useProgress } from '@/contexts/ProgressContext';
import { radius, spacing } from '@/config/theme';

type Nav = NativeStackNavigationProp<RootStackParamList>;
type Phase = 'idle' | 'recording' | 'transcribing' | 'evaluating' | 'result';

const TARGET_SECONDS = 60;
const ROLE_PRESETS = [
  'Software Engineer (Fresher)',
  'Sales Executive',
  'Customer Support',
  'Data Analyst',
  'Business Analyst',
  'General / Any role',
];

export default function TmayTrainerScreen() {
  const navigation = useNavigation<Nav>();
  const insets = useSafeAreaInsets();
  const { recordActivity } = useProgress();

  const [phase, setPhase] = useState<Phase>('idle');
  const [transcript, setTranscript] = useState('');
  const [duration, setDuration] = useState(0);
  const [evaluation, setEvaluation] = useState<TmayEvaluation | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [roleTarget, setRoleTarget] = useState<string>(ROLE_PRESETS[0]);

  const pulse = useRef(new Animated.Value(1)).current;
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startRef = useRef(0);

  useEffect(() => {
    if (phase === 'recording') {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulse, { toValue: 1.2, duration: 700, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
          Animated.timing(pulse, { toValue: 1, duration: 700, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        ])
      ).start();
    } else {
      pulse.stopAnimation();
      pulse.setValue(1);
    }
  }, [phase, pulse]);

  useEffect(() => () => { if (timerRef.current) clearInterval(timerRef.current); }, []);

  const reset = useCallback(() => {
    setPhase('idle'); setEvaluation(null); setTranscript(''); setDuration(0); setError(null);
  }, []);

  const startRecording = useCallback(async () => {
    setError(null);
    try {
      await speechService.startRecording();
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
      setPhase('recording'); setDuration(0); startRef.current = Date.now();
      timerRef.current = setInterval(() => {
        const sec = Math.floor((Date.now() - startRef.current) / 1000);
        setDuration(sec);
        // auto-stop at 90s to keep transcripts bounded
        if (sec >= 90) stopRecording();
      }, 250);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Mic permission denied');
    }
  }, []);

  const stopRecording = useCallback(async () => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    try {
      const { uri, durationMillis } = await speechService.stopRecording();
      const sec = Math.max(1, Math.round(durationMillis / 1000));
      setDuration(sec);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});

      let finalText = transcript.trim();
      if (uri && !finalText) {
        setPhase('transcribing');
        finalText = await speechService.transcribe(uri).catch(() => '');
        setTranscript(finalText);
      }
      if (!finalText || finalText.length < 10) {
        setError('We could not catch what you said. Try typing your intro below and tap Evaluate.');
        setPhase('idle');
        return;
      }
      setPhase('evaluating');
      const result = await aiService.evaluateTmay(finalText, sec, roleTarget, 'fresher');
      setEvaluation(result);
      setPhase('result');
      recordActivity(Math.max(1, Math.round(sec / 60)), 'speaking').catch(() => {});
    } catch (e) {
      if (e instanceof QuotaExceededError) {
        setError(`Daily free limit reached (${e.used}/${e.limit}). Upgrade to Premium for unlimited TMAY practice.`);
      } else {
        setError(e instanceof Error ? e.message : 'Failed to evaluate intro');
      }
      setPhase('idle');
    }
  }, [transcript, roleTarget, recordActivity]);

  const evaluateTyped = useCallback(async () => {
    setError(null);
    if (transcript.trim().length < 20) {
      setError('Type at least 20 characters or record your intro first.');
      return;
    }
    try {
      setPhase('evaluating');
      const result = await aiService.evaluateTmay(transcript.trim(), duration || 45, roleTarget, 'fresher');
      setEvaluation(result);
      setPhase('result');
    } catch (e) {
      if (e instanceof QuotaExceededError) {
        setError(`Daily free limit reached (${e.used}/${e.limit}). Upgrade for unlimited.`);
      } else {
        setError(e instanceof Error ? e.message : 'Failed to evaluate intro');
      }
      setPhase('idle');
    }
  }, [transcript, duration, roleTarget]);

  const targetProgress = Math.min(1, duration / TARGET_SECONDS);

  return (
    <View style={{ flex: 1, backgroundColor: '#0A0418' }}>
      <LinearGradient colors={['#1F0E3D', '#0A0418', '#150828']} style={StyleSheet.absoluteFillObject} />
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        <ScrollView contentContainerStyle={{ paddingBottom: 140 }} showsVerticalScrollIndicator={false}>
          {/* Header */}
          <View style={styles.header}>
            <Pressable onPress={() => navigation.goBack()} style={styles.iconBtn} testID="tmay-back-btn">
              <Ionicons name="chevron-back" size={20} color="#F2EEFF" />
            </Pressable>
            <View style={{ flex: 1, marginLeft: spacing.md }}>
              <Text style={styles.title}>Tell Me About Yourself</Text>
              <Text style={styles.subtitle}>60-second self-intro coach · PPF framework</Text>
            </View>
          </View>

          {/* Role selector */}
          <Text style={styles.section}>Target Role</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.rolesRow}>
            {ROLE_PRESETS.map((r) => {
              const active = r === roleTarget;
              return (
                <Pressable
                  key={r}
                  onPress={() => setRoleTarget(r)}
                  style={[styles.rolePill, active && styles.rolePillActive]}
                  testID={`tmay-role-${r}`}
                >
                  <Text style={[styles.rolePillText, active && { color: '#0A0418' }]}>{r}</Text>
                </Pressable>
              );
            })}
          </ScrollView>

          {/* Framework hint card */}
          <LinearGradient
            colors={['rgba(124,92,255,0.18)', 'rgba(34,211,238,0.1)']}
            style={styles.frameCard}
          >
            <Text style={styles.frameTitle}>The 60-second formula</Text>
            <View style={styles.frameRow}>
              <FrameStep n="1" label="Past" tint="#FACC15" body="Background, education, key strength" />
              <FrameStep n="2" label="Present" tint="#34D399" body="Current focus, skills, project" />
              <FrameStep n="3" label="Future" tint="#22D3EE" body="Why this role · career goal" />
            </View>
          </LinearGradient>

          {/* Record button */}
          <View style={styles.recordArea}>
            <Animated.View style={{ transform: [{ scale: pulse }] }}>
              <Pressable
                onPress={phase === 'recording' ? stopRecording : startRecording}
                disabled={phase === 'transcribing' || phase === 'evaluating'}
                testID="tmay-record-btn"
              >
                <LinearGradient
                  colors={phase === 'recording' ? ['#FF6B9D', '#7C5CFF'] : ['#7C5CFF', '#A992FF']}
                  start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                  style={[styles.recordBtn, (phase === 'transcribing' || phase === 'evaluating') && { opacity: 0.6 }]}
                >
                  <Ionicons
                    name={phase === 'recording' ? 'stop' : 'mic'}
                    size={44} color="#FFFFFF"
                  />
                </LinearGradient>
              </Pressable>
            </Animated.View>
            <Text style={styles.caption}>
              {phase === 'recording'
                ? `🔴 Recording · ${duration}s / 60s target`
                : phase === 'transcribing'
                  ? 'Transcribing your voice…'
                  : phase === 'evaluating'
                    ? 'AI is grading your intro…'
                    : phase === 'result'
                      ? '✓ Done — see your report below'
                      : 'Tap to start — aim for 60 seconds'}
            </Text>

            {phase === 'recording' && (
              <View style={styles.progTrack}>
                <LinearGradient
                  colors={targetProgress >= 1 ? ['#34D399', '#22D3EE'] : ['#FACC15', '#FF6B9D']}
                  start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                  style={[styles.progFill, { width: `${targetProgress * 100}%` }]}
                />
              </View>
            )}
          </View>

          {/* Transcript editor (only when not result) */}
          {phase !== 'result' && (
            <View style={styles.editorBox}>
              <Text style={styles.editorLabel}>Or type your intro · then tap Evaluate</Text>
              <RNTextInput
                value={transcript}
                onChangeText={setTranscript}
                multiline
                placeholder="Hi, I'm Riya, a final-year B.Tech student passionate about backend systems..."
                placeholderTextColor="rgba(242,238,255,0.35)"
                style={styles.editorInput}
                testID="tmay-transcript-input"
              />
              {transcript.trim().length >= 20 && phase !== 'evaluating' && (
                <Pressable onPress={evaluateTyped} style={styles.evalBtn} testID="tmay-evaluate-btn">
                  <Ionicons name="sparkles" size={14} color="#0A0418" />
                  <Text style={styles.evalBtnText}>Evaluate this intro</Text>
                </Pressable>
              )}
            </View>
          )}

          {error ? (
            <View style={styles.errorBox}>
              <Ionicons name="warning" size={14} color="#FCA5A5" />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          {/* RESULT */}
          {phase === 'result' && evaluation ? <TmayReport evaluation={evaluation} onRetry={reset} /> : null}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

// ---------- subcomponents ----------

function FrameStep({ n, label, tint, body }: { n: string; label: string; tint: string; body: string }) {
  return (
    <View style={styles.frameStep}>
      <View style={[styles.frameNum, { backgroundColor: tint }]}>
        <Text style={styles.frameNumText}>{n}</Text>
      </View>
      <Text style={styles.frameLabel}>{label}</Text>
      <Text style={styles.frameBody}>{body}</Text>
    </View>
  );
}

function TmayReport({ evaluation, onRetry }: { evaluation: TmayEvaluation; onRetry: () => void }) {
  const overallColor = useMemo(() => colorFor(evaluation.overall), [evaluation.overall]);
  return (
    <>
      <Text style={styles.section}>Your AI Report</Text>

      {/* Overall ring + axes */}
      <View style={styles.overallWrap}>
        <View style={styles.overallRing}>
          <Text style={[styles.overallScore, { color: overallColor }]}>{evaluation.overall}</Text>
          <Text style={styles.overallLabel}>OVERALL</Text>
        </View>
        <View style={{ flex: 1, gap: 8 }}>
          <ScoreBar label="Structure"  value={evaluation.structure}  color="#7C5CFF" icon="grid" />
          <ScoreBar label="Clarity"    value={evaluation.clarity}    color="#22D3EE" icon="sparkles" />
          <ScoreBar label="Confidence" value={evaluation.confidence} color="#FACC15" icon="flash" />
          <ScoreBar label="Relevance"  value={evaluation.relevance}  color="#34D399" icon="checkmark-done" />
          <ScoreBar label="Impact"     value={evaluation.impact}     color="#FF6B9D" icon="megaphone" />
        </View>
      </View>

      {/* PPF coverage */}
      <View style={styles.ppfRow}>
        <PpfChip label="Hook"    on={evaluation.has_hook} />
        <PpfChip label="Past"    on={evaluation.has_past} />
        <PpfChip label="Present" on={evaluation.has_present} />
        <PpfChip label="Future"  on={evaluation.has_future} />
      </View>

      {/* Strengths / Weaknesses */}
      {evaluation.strengths.length > 0 && (
        <FeedbackList title={`✅ Strengths (${evaluation.strengths.length})`} items={evaluation.strengths} color="#34D399" />
      )}
      {evaluation.weaknesses.length > 0 && (
        <FeedbackList title={`🛠 Weaknesses (${evaluation.weaknesses.length})`} items={evaluation.weaknesses} color="#FCA5A5" />
      )}
      {evaluation.missing_elements.length > 0 && (
        <FeedbackList title="❌ Missing elements" items={evaluation.missing_elements} color="#FACC15" />
      )}
      {evaluation.filler_words.length > 0 && (
        <View style={styles.fillerCard}>
          <Text style={styles.fillerTitle}>Filler words detected</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 6 }}>
            {evaluation.filler_words.map((f) => (
              <View key={f} style={styles.fillerPill}><Text style={styles.fillerPillText}>{f}</Text></View>
            ))}
          </View>
        </View>
      )}

      {/* Polished version */}
      {!!evaluation.polished_version && (
        <View style={[styles.feedbackCard, { borderColor: 'rgba(124,92,255,0.4)', backgroundColor: 'rgba(124,92,255,0.1)' }]}>
          <View style={styles.feedbackCardHead}>
            <Ionicons name="star" size={16} color="#A992FF" />
            <Text style={[styles.feedbackCardTitle, { color: '#A992FF' }]}>Native-style polished version</Text>
          </View>
          <Text style={styles.feedbackBody}>{evaluation.polished_version}</Text>
          <Pressable
            onPress={() => speechService.speakWithAI(evaluation.polished_version)}
            style={styles.smallPlayBtn}
            testID="tmay-play-polished"
          >
            <Ionicons name="volume-high" size={12} color="#A992FF" />
            <Text style={styles.smallPlayText}>Listen</Text>
          </Pressable>
        </View>
      )}

      {/* Next goal */}
      {!!evaluation.next_goal && (
        <View style={[styles.feedbackCard, { borderColor: 'rgba(250,204,21,0.4)', backgroundColor: 'rgba(250,204,21,0.1)' }]}>
          <View style={styles.feedbackCardHead}>
            <Ionicons name="rocket" size={16} color="#FACC15" />
            <Text style={[styles.feedbackCardTitle, { color: '#FACC15' }]}>Your next focus</Text>
          </View>
          <Text style={styles.feedbackBody}>{evaluation.next_goal}</Text>
        </View>
      )}

      {/* Summary */}
      {!!evaluation.feedback && (
        <View style={[styles.feedbackCard, { borderColor: 'rgba(255,255,255,0.1)' }]}>
          <Text style={styles.feedbackBody}>{evaluation.feedback}</Text>
        </View>
      )}

      <Pressable onPress={onRetry} style={styles.retryBtn} testID="tmay-retry-btn">
        <LinearGradient colors={['#7C5CFF', '#A992FF']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.retryInner}>
          <Ionicons name="refresh" size={16} color="#FFFFFF" />
          <Text style={styles.retryText}>Practise again</Text>
        </LinearGradient>
      </Pressable>
    </>
  );
}

function ScoreBar({ label, value, color, icon }: { label: string; value: number; color: string; icon: keyof typeof Ionicons.glyphMap }) {
  return (
    <View>
      <View style={styles.scoreBarHead}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Ionicons name={icon} size={12} color={color} />
          <Text style={styles.scoreBarLabel}>{label}</Text>
        </View>
        <Text style={[styles.scoreBarValue, { color }]}>{value}%</Text>
      </View>
      <View style={styles.scoreBarTrack}>
        <View style={[styles.scoreBarFill, { width: `${Math.max(0, Math.min(100, value))}%`, backgroundColor: color }]} />
      </View>
    </View>
  );
}

function PpfChip({ label, on }: { label: string; on: boolean }) {
  return (
    <View style={[styles.ppfChip, on ? styles.ppfChipOn : styles.ppfChipOff]}>
      <Ionicons name={on ? 'checkmark-circle' : 'close-circle'} size={14} color={on ? '#34D399' : '#FCA5A5'} />
      <Text style={[styles.ppfChipText, { color: on ? '#34D399' : '#FCA5A5' }]}>{label}</Text>
    </View>
  );
}

function FeedbackList({ title, items, color }: { title: string; items: string[]; color: string }) {
  return (
    <View style={[styles.feedbackCard, { borderColor: `${color}40`, backgroundColor: `${color}15` }]}>
      <Text style={[styles.feedbackCardTitle, { color }]}>{title}</Text>
      {items.map((it, i) => (
        <View key={i} style={{ flexDirection: 'row', marginTop: 4 }}>
          <Text style={{ color, marginRight: 6 }}>•</Text>
          <Text style={styles.feedbackBody}>{it}</Text>
        </View>
      ))}
    </View>
  );
}

function colorFor(n: number) {
  if (n >= 85) return '#34D399';
  if (n >= 70) return '#7C5CFF';
  if (n >= 55) return '#FACC15';
  return '#FCA5A5';
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.sm },
  iconBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: 'rgba(255,255,255,0.06)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center' },
  title: { color: '#F2EEFF', fontSize: 20, fontWeight: '800' },
  subtitle: { color: '#A992FF', fontSize: 12, fontWeight: '700', marginTop: 2 },

  section: { color: '#F2EEFF', fontSize: 14, fontWeight: '800', marginTop: spacing.lg, marginBottom: spacing.sm, paddingHorizontal: spacing.lg },
  rolesRow: { paddingHorizontal: spacing.lg, gap: spacing.sm, paddingVertical: 4 },
  rolePill: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: radius.pill, borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)', backgroundColor: 'rgba(255,255,255,0.04)' },
  rolePillActive: { backgroundColor: '#A992FF', borderColor: '#A992FF' },
  rolePillText: { color: '#F2EEFF', fontSize: 12, fontWeight: '700' },

  frameCard: { marginHorizontal: spacing.lg, marginTop: spacing.md, padding: spacing.md, borderRadius: radius.xl, borderWidth: 1, borderColor: 'rgba(124,92,255,0.3)' },
  frameTitle: { color: '#F2EEFF', fontSize: 13, fontWeight: '800', marginBottom: spacing.sm },
  frameRow: { flexDirection: 'row', gap: spacing.sm },
  frameStep: { flex: 1, padding: spacing.sm, borderRadius: radius.md, backgroundColor: 'rgba(0,0,0,0.25)' },
  frameNum: { width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  frameNumText: { color: '#0A0418', fontWeight: '800', fontSize: 12 },
  frameLabel: { color: '#F2EEFF', fontSize: 13, fontWeight: '800', marginTop: 6 },
  frameBody: { color: 'rgba(242,238,255,0.7)', fontSize: 10, marginTop: 2, lineHeight: 14 },

  recordArea: { alignItems: 'center', marginTop: spacing.xl, gap: spacing.sm, paddingHorizontal: spacing.lg },
  recordBtn: { width: 120, height: 120, borderRadius: 60, alignItems: 'center', justifyContent: 'center', shadowColor: '#7C5CFF', shadowOpacity: 0.6, shadowRadius: 20, shadowOffset: { width: 0, height: 8 }, elevation: 12 },
  caption: { color: '#F2EEFF', fontSize: 14, fontWeight: '700', textAlign: 'center' },
  progTrack: { width: '100%', height: 6, backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 3, overflow: 'hidden', marginTop: spacing.sm },
  progFill: { height: '100%' },

  editorBox: { marginHorizontal: spacing.lg, marginTop: spacing.lg, backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: radius.lg, padding: spacing.md, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
  editorLabel: { color: 'rgba(242,238,255,0.55)', fontSize: 11, fontWeight: '700', marginBottom: 6 },
  editorInput: { color: '#F2EEFF', fontSize: 14, minHeight: 80, textAlignVertical: 'top' },
  evalBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, alignSelf: 'flex-end', marginTop: spacing.sm, paddingHorizontal: 14, paddingVertical: 8, borderRadius: radius.pill, backgroundColor: '#FACC15' },
  evalBtnText: { color: '#0A0418', fontWeight: '800', fontSize: 12 },

  errorBox: { flexDirection: 'row', alignItems: 'center', gap: 6, marginHorizontal: spacing.lg, marginTop: spacing.sm, padding: spacing.sm, borderRadius: radius.md, backgroundColor: 'rgba(239,68,68,0.1)', borderWidth: 1, borderColor: 'rgba(239,68,68,0.3)' },
  errorText: { color: '#FCA5A5', fontSize: 12, flex: 1 },

  overallWrap: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginHorizontal: spacing.lg, marginTop: spacing.sm },
  overallRing: { width: 100, height: 100, borderRadius: 50, borderWidth: 5, borderColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.04)' },
  overallScore: { fontSize: 32, fontWeight: '800' },
  overallLabel: { color: 'rgba(242,238,255,0.55)', fontSize: 9, fontWeight: '800', letterSpacing: 1, marginTop: -2 },
  scoreBarHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 3 },
  scoreBarLabel: { color: '#F2EEFF', fontSize: 11, fontWeight: '700' },
  scoreBarValue: { fontSize: 11, fontWeight: '800' },
  scoreBarTrack: { height: 5, backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 3, overflow: 'hidden' },
  scoreBarFill: { height: '100%', borderRadius: 3 },

  ppfRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginHorizontal: spacing.lg, marginTop: spacing.lg },
  ppfChip: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 5, borderRadius: radius.pill, borderWidth: 1 },
  ppfChipOn: { backgroundColor: 'rgba(52,211,153,0.1)', borderColor: 'rgba(52,211,153,0.3)' },
  ppfChipOff: { backgroundColor: 'rgba(252,165,165,0.08)', borderColor: 'rgba(252,165,165,0.3)' },
  ppfChipText: { fontSize: 11, fontWeight: '800' },

  feedbackCard: { marginHorizontal: spacing.lg, marginTop: spacing.md, padding: spacing.md, borderRadius: radius.lg, borderWidth: 1 },
  feedbackCardHead: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  feedbackCardTitle: { fontSize: 12, fontWeight: '800', letterSpacing: 0.3 },
  feedbackBody: { color: '#F2EEFF', fontSize: 13, lineHeight: 19 },
  smallPlayBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 3, marginTop: 8, borderRadius: radius.pill, borderWidth: 1, borderColor: 'rgba(169,146,255,0.4)' },
  smallPlayText: { color: '#A992FF', fontSize: 10, fontWeight: '800' },

  fillerCard: { marginHorizontal: spacing.lg, marginTop: spacing.md, padding: spacing.md, borderRadius: radius.lg, borderWidth: 1, borderColor: 'rgba(255,123,107,0.3)', backgroundColor: 'rgba(255,123,107,0.08)' },
  fillerTitle: { color: '#FF7A6B', fontSize: 12, fontWeight: '800' },
  fillerPill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.pill, backgroundColor: 'rgba(255,123,107,0.2)', borderWidth: 1, borderColor: 'rgba(255,123,107,0.4)' },
  fillerPillText: { color: '#FFB4A8', fontSize: 11, fontWeight: '700' },

  retryBtn: { marginHorizontal: spacing.lg, marginTop: spacing.lg, borderRadius: radius.pill, overflow: 'hidden' },
  retryInner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14 },
  retryText: { color: '#FFFFFF', fontWeight: '800', fontSize: 14 },
});
