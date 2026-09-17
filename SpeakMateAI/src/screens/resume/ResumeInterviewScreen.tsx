// Resume-driven Voice Mock Interview — pre-loaded with personalised questions from
// the user's parsed resume. Walks question-by-question, captures voice (Whisper)
// or typed answers, evaluates each via existing /interview/evaluate, shows running
// score, and surfaces final summary on completion.
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  TextInput as RNTextInput,
  Animated,
  Easing,
  Platform,
  StatusBar,
} from 'react-native';
import { Text } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useScreenInsets } from '@/hooks/useScreenInsets';
import * as Haptics from 'expo-haptics';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { RootStackParamList } from '@/navigation/types';
import { speechService } from '@/services/speechService';
import { aiService } from '@/services/aiService';
import { ResumeInterviewQuestion } from '@/types';
import EvaluatingProgress from '@/components/common/EvaluatingProgress';
import { radius, spacing } from '@/config/theme';

type Nav = NativeStackNavigationProp<RootStackParamList>;
type Phase = 'reading' | 'recording' | 'transcribing' | 'evaluating' | 'feedback' | 'done';

interface AnswerLog {
  question: string;
  answer: string;
  score: number;
  feedback: string;
  strengths: string[];
  improvements: string[];
  example: string;
}

export default function ResumeInterviewScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<RouteProp<RootStackParamList, 'ResumeInterview'>>();
  const { headerPaddingTop } = useScreenInsets();
  const { questions, targetRole, focusAreas } = route.params;

  const [idx, setIdx] = useState(0);
  const [phase, setPhase] = useState<Phase>('reading');
  const [transcript, setTranscript] = useState('');
  const [answers, setAnswers] = useState<AnswerLog[]>([]);
  const [error, setError] = useState<string | null>(null);

  const pulse = useRef(new Animated.Value(1)).current;
  const current = questions[idx];

  // Auto-read question aloud on idx change
  useEffect(() => {
    if (current && phase === 'reading') {
      speechService.speakWithAI(current.question).catch(() => speechService.speak(current.question));
    }
  }, [idx, current, phase]);

  useEffect(() => {
    if (phase === 'recording') {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulse, { toValue: 1.2, duration: 700, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
          Animated.timing(pulse, { toValue: 1, duration: 700, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        ])
      ).start();
    } else {
      pulse.stopAnimation(); pulse.setValue(1);
    }
  }, [phase, pulse]);

  const startRecording = useCallback(async () => {
    setError(null);
    try {
      await speechService.startRecording();
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
      setPhase('recording');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Mic permission denied');
    }
  }, []);

  const stopAndTranscribe = useCallback(async () => {
    try {
      const { uri } = await speechService.stopRecording();
      if (!uri) { setPhase('reading'); return; }
      setPhase('transcribing');
      const text = await speechService.transcribe(uri).catch(() => '');
      setTranscript(text);
      setPhase('reading');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Transcription failed');
      setPhase('reading');
    }
  }, []);

  const submitAnswer = useCallback(async () => {
    const ans = transcript.trim();
    if (!ans) { setError('Type or speak an answer first'); return; }
    setError(null); setPhase('evaluating');
    try {
      const evalResult = await aiService.evaluateInterviewAnswer(
        { id: `${idx}`, question: current.question, category: 'behavioural', difficulty: 'medium' },
        ans,
      );
      const log: AnswerLog = {
        question: current.question,
        answer: ans,
        score: evalResult.score,
        feedback: evalResult.feedback,
        strengths: evalResult.strengths,
        improvements: evalResult.improvements,
        example: evalResult.example,
      };
      setAnswers([...answers, log]);
      setPhase('feedback'); // NEW: show inline feedback before next question
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Evaluation failed');
      setPhase('reading');
    }
  }, [transcript, idx, current, answers]);

  // Called from inline feedback screen when user taps "Next question"
  const goToNextFromFeedback = useCallback(() => {
    setTranscript('');
    if (idx + 1 >= questions.length) {
      setPhase('done');
    } else {
      setIdx(idx + 1);
      setPhase('reading');
    }
  }, [idx, questions.length]);

  const skipQuestion = useCallback(() => {
    if (idx + 1 >= questions.length) {
      setPhase('done');
    } else {
      setTranscript(''); setIdx(idx + 1); setPhase('reading');
    }
  }, [idx, questions.length]);

  const avgScore = answers.length
    ? Math.round(answers.reduce((s, a) => s + a.score, 0) / answers.length)
    : 0;

  // Latest answer log (for the inline feedback screen)
  const lastAnswer = answers.length > 0 ? answers[answers.length - 1] : null;
  const isLastQuestion = idx + 1 >= questions.length;

  // ------- INLINE FEEDBACK SCREEN (after each answer) -------
  if (phase === 'feedback' && lastAnswer) {
    const scoreColor = lastAnswer.score >= 70 ? '#34D399' : lastAnswer.score >= 50 ? '#FACC15' : '#FCA5A5';
    return (
      <View style={{ flex: 1, backgroundColor: '#0A0418' }}>
        <LinearGradient colors={['#1F0E3D', '#0A0418', '#150828']} style={StyleSheet.absoluteFillObject} />
        <SafeAreaView style={{ flex: 1 }} edges={['left', 'right']}>
          <ScrollView contentContainerStyle={{ paddingBottom: 160 }} showsVerticalScrollIndicator={false}>
            <View style={[styles.header, { paddingTop: headerPaddingTop }]}>
              <View style={styles.iconBtn}>
                <Ionicons name="checkmark-circle" size={20} color="#34D399" />
              </View>
              <View style={{ flex: 1, marginLeft: spacing.md }}>
                <Text style={styles.title} numberOfLines={1}>Feedback</Text>
                <Text style={styles.subtitle} numberOfLines={1}>Question {idx + 1} of {questions.length}</Text>
              </View>
            </View>

            {/* Big score card */}
            <LinearGradient
              colors={lastAnswer.score >= 70 ? ['#34D399', '#22D3EE'] : lastAnswer.score >= 50 ? ['#FACC15', '#FF6B9D'] : ['#FCA5A5', '#F87171']}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
              style={styles.scoreCard}
            >
              <Text style={styles.scoreBig}>{lastAnswer.score}</Text>
              <Text style={styles.scoreLabel}>YOUR SCORE / 100</Text>
              <Text style={styles.scoreSub}>
                {lastAnswer.score >= 80 ? 'Excellent!' : lastAnswer.score >= 70 ? 'Great job' : lastAnswer.score >= 50 ? 'Good effort — can improve' : 'Needs more depth'}
              </Text>
            </LinearGradient>

            {/* Overall feedback */}
            <View style={styles.fbBlock}>
              <View style={styles.fbLabelRow}>
                <Ionicons name="bulb" size={16} color="#FACC15" />
                <Text style={styles.fbLabel}>Overall</Text>
              </View>
              <Text style={styles.fbBody}>{lastAnswer.feedback}</Text>
            </View>

            {/* Strengths */}
            {lastAnswer.strengths.length > 0 && (
              <View style={styles.fbBlock}>
                <View style={styles.fbLabelRow}>
                  <Ionicons name="thumbs-up" size={16} color="#34D399" />
                  <Text style={[styles.fbLabel, { color: '#34D399' }]}>What went well</Text>
                </View>
                {lastAnswer.strengths.map((s, i) => (
                  <View key={i} style={styles.bulletRow}>
                    <Text style={[styles.bulletDot, { color: '#34D399' }]}>•</Text>
                    <Text style={styles.bulletText}>{s}</Text>
                  </View>
                ))}
              </View>
            )}

            {/* Improvements */}
            {lastAnswer.improvements.length > 0 && (
              <View style={styles.fbBlock}>
                <View style={styles.fbLabelRow}>
                  <Ionicons name="trending-up" size={16} color="#22D3EE" />
                  <Text style={[styles.fbLabel, { color: '#22D3EE' }]}>How to improve</Text>
                </View>
                {lastAnswer.improvements.map((s, i) => (
                  <View key={i} style={styles.bulletRow}>
                    <Text style={[styles.bulletDot, { color: '#22D3EE' }]}>•</Text>
                    <Text style={styles.bulletText}>{s}</Text>
                  </View>
                ))}
              </View>
            )}

            {/* Example */}
            {lastAnswer.example ? (
              <View style={[styles.fbBlock, styles.exampleBlock]}>
                <View style={styles.fbLabelRow}>
                  <Ionicons name="sparkles" size={16} color="#A992FF" />
                  <Text style={[styles.fbLabel, { color: '#A992FF' }]}>Stronger example</Text>
                </View>
                <Text style={styles.exampleText}>“{lastAnswer.example}”</Text>
              </View>
            ) : null}

            <Pressable
              onPress={goToNextFromFeedback}
              style={[styles.doneBtn, { marginTop: spacing.xl }]}
              testID="resume-int-next-feedback-btn"
            >
              <LinearGradient colors={['#7C5CFF', '#A992FF']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.doneInner}>
                <Ionicons name={isLastQuestion ? 'trophy' : 'arrow-forward'} size={18} color="#FFFFFF" />
                <Text style={styles.doneText}>{isLastQuestion ? 'See final report' : 'Next question'}</Text>
              </LinearGradient>
            </Pressable>
          </ScrollView>
        </SafeAreaView>
      </View>
    );
  }

  // ------- DONE SCREEN -------
  if (phase === 'done') {
    return (
      <View style={{ flex: 1, backgroundColor: '#0A0418' }}>
        <LinearGradient colors={['#1F0E3D', '#0A0418', '#150828']} style={StyleSheet.absoluteFillObject} />
        <SafeAreaView style={{ flex: 1 }} edges={['left', 'right']}>
          <ScrollView contentContainerStyle={{ paddingBottom: 140 }}>
            <View style={[styles.header, { paddingTop: headerPaddingTop }]}>
              <Pressable onPress={() => navigation.goBack()} style={styles.iconBtn} testID="resume-int-back-btn">
                <Ionicons name="chevron-back" size={20} color="#F2EEFF" />
              </Pressable>
              <View style={{ flex: 1, marginLeft: spacing.md }}>
                <Text style={styles.title} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75}>Interview Complete 🎉</Text>
                <Text style={styles.subtitle} numberOfLines={1}>{answers.length} questions answered</Text>
              </View>
            </View>

            <LinearGradient
              colors={avgScore >= 70 ? ['#34D399', '#22D3EE'] : ['#FACC15', '#FF6B9D']}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
              style={styles.scoreCard}
            >
              <Text style={styles.scoreBig}>{avgScore}</Text>
              <Text style={styles.scoreLabel}>AVERAGE SCORE / 100</Text>
              <Text style={styles.scoreSub}>{targetRole}</Text>
            </LinearGradient>

            <Text style={styles.section}>Question-by-question</Text>
            {answers.map((a, i) => (
              <View key={i} style={styles.answerCard}>
                <View style={styles.answerHead}>
                  <Text style={styles.answerNum}>Q{i + 1}</Text>
                  <Text style={[styles.answerScore, { color: a.score >= 70 ? '#34D399' : a.score >= 50 ? '#FACC15' : '#FCA5A5' }]}>{a.score}/100</Text>
                </View>
                <Text style={styles.answerQ}>{a.question}</Text>
                <Text style={styles.answerA} numberOfLines={3}>“{a.answer}”</Text>
                <Text style={styles.answerFb}>💡 {a.feedback}</Text>
              </View>
            ))}

            <Pressable onPress={() => navigation.goBack()} style={styles.doneBtn} testID="resume-int-done-btn">
              <LinearGradient colors={['#7C5CFF', '#A992FF']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.doneInner}>
                <Ionicons name="checkmark-done" size={18} color="#FFFFFF" />
                <Text style={styles.doneText}>Back to Resume</Text>
              </LinearGradient>
            </Pressable>
          </ScrollView>
        </SafeAreaView>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#0A0418' }}>
      <LinearGradient colors={['#1F0E3D', '#0A0418', '#150828']} style={StyleSheet.absoluteFillObject} />
      <SafeAreaView style={{ flex: 1 }} edges={['left', 'right']}>
        <ScrollView contentContainerStyle={{ paddingBottom: 200 }}>
          {/* Header */}
          <View style={[styles.header, { paddingTop: headerPaddingTop }]}>
            <Pressable onPress={() => navigation.goBack()} style={styles.iconBtn} testID="resume-int-back-btn">
              <Ionicons name="close" size={20} color="#F2EEFF" />
            </Pressable>
            <View style={{ flex: 1, marginLeft: spacing.md }}>
              <Text style={styles.title} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75}>{targetRole} Mock</Text>
              <Text style={styles.subtitle} numberOfLines={1}>Question {idx + 1} of {questions.length}</Text>
            </View>
            <View style={styles.scorePill}>
              <Text style={styles.scorePillText}>Avg {avgScore}</Text>
            </View>
          </View>

          {/* Progress bar */}
          <View style={styles.progTrack}>
            <LinearGradient
              colors={['#7C5CFF', '#22D3EE']}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
              style={[styles.progFill, { width: `${((idx) / questions.length) * 100}%` }]}
            />
          </View>

          {error ? (
            <View style={styles.errorBox}>
              <Ionicons name="warning" size={14} color="#FCA5A5" />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          {/* Question card */}
          {current && (
            <View style={styles.qCard}>
              <View style={styles.qBadgeRow}>
                <View style={styles.qBadge}><Text style={styles.qBadgeText}>{current.category.toUpperCase()}</Text></View>
                <View style={styles.qBadge}><Text style={styles.qBadgeText}>{current.difficulty.toUpperCase()}</Text></View>
              </View>
              <Text style={styles.qText}>{current.question}</Text>
              <Pressable
                onPress={() => speechService.speakWithAI(current.question)}
                style={styles.listenBtn}
                testID="resume-int-listen-btn"
              >
                <Ionicons name="volume-high" size={14} color="#A992FF" />
                <Text style={styles.listenText}>Hear again</Text>
              </Pressable>
            </View>
          )}

          {/* Record + transcript */}
          <View style={styles.recordArea}>
            <Animated.View style={{ transform: [{ scale: pulse }] }}>
              <Pressable
                onPress={phase === 'recording' ? stopAndTranscribe : startRecording}
                disabled={phase === 'transcribing' || phase === 'evaluating'}
                testID="resume-int-mic-btn"
              >
                <LinearGradient
                  colors={phase === 'recording' ? ['#FF6B9D', '#7C5CFF'] : ['#7C5CFF', '#A992FF']}
                  start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                  style={[styles.recordBtn, (phase === 'transcribing' || phase === 'evaluating') && { opacity: 0.6 }]}
                >
                  <Ionicons name={phase === 'recording' ? 'stop' : 'mic'} size={36} color="#FFFFFF" />
                </LinearGradient>
              </Pressable>
            </Animated.View>
            <Text style={styles.caption}>
              {phase === 'recording' ? '🔴 Recording — tap to stop'
                : phase === 'transcribing' ? 'Transcribing…'
                : phase === 'evaluating' ? 'AI scoring your answer…'
                : 'Tap to record your answer'}
            </Text>
          </View>

          {/* Transcript editor */}
          <View style={styles.editorBox}>
            <Text style={styles.editorLabel}>Or type your answer</Text>
            <RNTextInput
              value={transcript}
              onChangeText={setTranscript}
              multiline
              placeholder="Your answer…"
              placeholderTextColor="rgba(242,238,255,0.35)"
              style={styles.editorInput}
              testID="resume-int-answer-input"
            />
          </View>

          {/* Actions */}
          <View style={styles.actionRow}>
            <Pressable onPress={skipQuestion} style={styles.skipBtn} testID="resume-int-skip-btn">
              <Text style={styles.skipText}>Skip</Text>
            </Pressable>
            <Pressable
              onPress={submitAnswer}
              disabled={!transcript.trim() || phase === 'evaluating'}
              style={[styles.submitBtn, (!transcript.trim() || phase === 'evaluating') && { opacity: 0.5 }]}
              testID="resume-int-submit-btn"
            >
              <LinearGradient colors={['#FACC15', '#FF6B9D']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.submitInner}>
                {phase === 'evaluating' ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <>
                    <Ionicons name="send" size={14} color="#FFFFFF" />
                    <Text style={styles.submitText}>Get feedback</Text>
                  </>
                )}
              </LinearGradient>
            </Pressable>
          </View>

          {phase === 'evaluating' && (
            <EvaluatingProgress durationMs={5000} testID="resume-int-eval-progress" />
          )}

          {focusAreas.length > 0 && (
            <View style={styles.focusCard}>
              <Text style={styles.focusTitle}>💡 Reminder · brush up on</Text>
              {focusAreas.slice(0, 3).map((f, i) => (
                <View key={i} style={{ flexDirection: 'row', marginTop: 3 }}>
                  <Text style={{ color: '#FACC15', marginRight: 6 }}>•</Text>
                  <Text style={styles.focusBody}>{f}</Text>
                </View>
              ))}
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.md },
  iconBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: 'rgba(255,255,255,0.06)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center' },
  title: { color: '#F2EEFF', fontSize: 18, fontWeight: '800', marginBottom: 4 },
  subtitle: { color: '#A992FF', fontSize: 12, fontWeight: '700', marginTop: 4, lineHeight: 16 },
  scorePill: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: radius.pill, backgroundColor: 'rgba(124,92,255,0.2)', borderWidth: 1, borderColor: 'rgba(124,92,255,0.4)' },
  scorePillText: { color: '#A992FF', fontSize: 11, fontWeight: '800' },

  progTrack: { marginHorizontal: spacing.lg, marginTop: spacing.sm, height: 5, backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 3, overflow: 'hidden' },
  progFill: { height: '100%', borderRadius: 3 },

  errorBox: { flexDirection: 'row', alignItems: 'center', gap: 6, marginHorizontal: spacing.lg, marginTop: spacing.sm, padding: spacing.sm, borderRadius: radius.md, backgroundColor: 'rgba(239,68,68,0.1)', borderWidth: 1, borderColor: 'rgba(239,68,68,0.3)' },
  errorText: { color: '#FCA5A5', fontSize: 12, flex: 1 },

  qCard: { marginHorizontal: spacing.lg, marginTop: spacing.lg, padding: spacing.lg, borderRadius: radius.xl, backgroundColor: 'rgba(124,92,255,0.1)', borderWidth: 1, borderColor: 'rgba(124,92,255,0.3)' },
  qBadgeRow: { flexDirection: 'row', gap: 6, marginBottom: spacing.sm },
  qBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: radius.pill, backgroundColor: 'rgba(124,92,255,0.25)', borderWidth: 1, borderColor: 'rgba(124,92,255,0.4)' },
  qBadgeText: { color: '#A992FF', fontSize: 9, fontWeight: '800', letterSpacing: 0.5 },
  qText: { color: '#F2EEFF', fontSize: 16, fontWeight: '700', lineHeight: 22 },
  listenBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 5, marginTop: spacing.sm, borderRadius: radius.pill, borderWidth: 1, borderColor: 'rgba(169,146,255,0.4)' },
  listenText: { color: '#A992FF', fontSize: 11, fontWeight: '700' },

  recordArea: { alignItems: 'center', marginTop: spacing.lg, gap: spacing.sm },
  recordBtn: { width: 90, height: 90, borderRadius: 45, alignItems: 'center', justifyContent: 'center', shadowColor: '#7C5CFF', shadowOpacity: 0.5, shadowRadius: 16, shadowOffset: { width: 0, height: 6 }, elevation: 10 },
  caption: { color: '#F2EEFF', fontSize: 13, fontWeight: '700' },

  editorBox: { marginHorizontal: spacing.lg, marginTop: spacing.lg, backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: radius.lg, padding: spacing.md, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
  editorLabel: { color: 'rgba(242,238,255,0.55)', fontSize: 11, fontWeight: '700', marginBottom: 6 },
  editorInput: { color: '#F2EEFF', fontSize: 14, minHeight: 80, textAlignVertical: 'top' },

  actionRow: { flexDirection: 'row', gap: spacing.sm, marginHorizontal: spacing.lg, marginTop: spacing.md },
  skipBtn: { paddingHorizontal: 18, paddingVertical: 12, borderRadius: radius.pill, borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)', backgroundColor: 'rgba(255,255,255,0.04)' },
  skipText: { color: 'rgba(242,238,255,0.7)', fontSize: 13, fontWeight: '700' },
  submitBtn: { flex: 1, borderRadius: radius.pill, overflow: 'hidden' },
  submitInner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 12 },
  submitText: { color: '#FFFFFF', fontWeight: '800', fontSize: 13 },

  focusCard: { marginHorizontal: spacing.lg, marginTop: spacing.lg, padding: spacing.md, borderRadius: radius.lg, backgroundColor: 'rgba(250,204,21,0.08)', borderWidth: 1, borderColor: 'rgba(250,204,21,0.25)' },
  focusTitle: { color: '#FACC15', fontSize: 11, fontWeight: '800', letterSpacing: 0.3 },
  focusBody: { color: '#F2EEFF', fontSize: 11, flex: 1, lineHeight: 15 },

  // Done screen
  scoreCard: { marginHorizontal: spacing.lg, marginTop: spacing.lg, padding: spacing.xl, borderRadius: radius.xl, alignItems: 'center' },
  scoreBig: { color: '#FFFFFF', fontSize: 56, fontWeight: '800' },
  scoreLabel: { color: 'rgba(255,255,255,0.85)', fontSize: 11, fontWeight: '800', letterSpacing: 1 },
  scoreSub: { color: 'rgba(255,255,255,0.95)', fontSize: 12, fontWeight: '700', marginTop: 6 },
  section: { color: '#F2EEFF', fontSize: 15, fontWeight: '800', marginTop: spacing.xl, marginBottom: spacing.md, paddingHorizontal: spacing.lg },
  answerCard: { marginHorizontal: spacing.lg, marginBottom: spacing.sm, padding: spacing.md, borderRadius: radius.lg, backgroundColor: 'rgba(255,255,255,0.04)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
  answerHead: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  answerNum: { color: '#A992FF', fontSize: 12, fontWeight: '800' },
  answerScore: { fontSize: 12, fontWeight: '800' },
  answerQ: { color: '#F2EEFF', fontSize: 13, fontWeight: '700', lineHeight: 18 },
  answerA: { color: 'rgba(242,238,255,0.7)', fontSize: 12, marginTop: 6, fontStyle: 'italic' },
  answerFb: { color: '#A992FF', fontSize: 11, marginTop: 6, lineHeight: 15 },

  doneBtn: { marginHorizontal: spacing.lg, marginTop: spacing.lg, borderRadius: radius.pill, overflow: 'hidden' },
  doneInner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14 },
  doneText: { color: '#FFFFFF', fontWeight: '800', fontSize: 14 },

  // Inline feedback screen (after each answer)
  fbBlock: { marginHorizontal: spacing.lg, marginTop: spacing.md, padding: spacing.md, borderRadius: radius.lg, backgroundColor: 'rgba(255,255,255,0.04)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
  fbLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: spacing.sm },
  fbLabel: { color: '#F2EEFF', fontSize: 12, fontWeight: '800', letterSpacing: 0.5, textTransform: 'uppercase' },
  fbBody: { color: '#F2EEFF', fontSize: 13, lineHeight: 19 },
  bulletRow: { flexDirection: 'row', marginTop: 4 },
  bulletDot: { fontSize: 15, marginRight: 8, lineHeight: 20 },
  bulletText: { color: '#F2EEFF', fontSize: 13, flex: 1, lineHeight: 19 },
  exampleBlock: { backgroundColor: 'rgba(124,92,255,0.08)', borderColor: 'rgba(124,92,255,0.25)' },
  exampleText: { color: '#F2EEFF', fontSize: 13, fontStyle: 'italic', lineHeight: 19 },
});
