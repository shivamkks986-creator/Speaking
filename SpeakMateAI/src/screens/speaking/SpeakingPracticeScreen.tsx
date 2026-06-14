// Speaking Practice — premium redesign with streak/XP header, gamified challenge card,
// live recording UX, full AI feedback report, vocabulary builder, quick actions,
// XP celebration, premium upsell and weekly performance chart.
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  StyleSheet,
  Animated,
  Easing,
  Pressable,
  ScrollView,
  Dimensions,
  TextInput as RNTextInput,
} from 'react-native';
import { Text } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { RootStackParamList } from '@/navigation/types';
import { speechService } from '@/services/speechService';
import { aiService, QuotaExceededError } from '@/services/aiService';
import { useProgress } from '@/contexts/ProgressContext';
import { useGamification } from '@/contexts/GamificationContext';
import { useAuth } from '@/contexts/AuthContext';
import { SpeakingScore } from '@/types';
import { getLevelByXp, getNextLevel, XP_REWARDS } from '@/config/levels';
import { radius, spacing } from '@/config/theme';

type Nav = NativeStackNavigationProp<RootStackParamList>;
type Phase = 'idle' | 'recording' | 'processing' | 'result';
type Difficulty = 'Beginner' | 'Intermediate' | 'Advanced';

const SCREEN_WIDTH = Dimensions.get('window').width;
const DAILY_GOAL_MIN = 10;

interface Challenge {
  category: string;
  prompt: string;
  difficulty: Difficulty;
  durationSec: number;
  icon: keyof typeof Ionicons.glyphMap;
  gradient: readonly [string, string];
}

const CHALLENGES: Challenge[] = [
  { category: 'Travel English',     prompt: 'Describe your last vacation in detail.',                    difficulty: 'Intermediate', durationSec: 30, icon: 'airplane',  gradient: ['#22D3EE', '#7C5CFF'] },
  { category: 'Career',             prompt: 'What are your career goals for the next year?',             difficulty: 'Advanced',     durationSec: 45, icon: 'rocket',    gradient: ['#FACC15', '#FF6B9D'] },
  { category: 'Daily Life',         prompt: 'Describe your favourite weekend activity.',                 difficulty: 'Beginner',     durationSec: 30, icon: 'sunny',     gradient: ['#FF7A6B', '#FFA396'] },
  { category: 'Entertainment',      prompt: 'Talk about a movie you recently watched.',                  difficulty: 'Intermediate', durationSec: 30, icon: 'film',      gradient: ['#A992FF', '#7C5CFF'] },
  { category: 'Hometown',           prompt: 'Describe your hometown to a tourist.',                      difficulty: 'Beginner',     durationSec: 30, icon: 'home',      gradient: ['#34D399', '#22D3EE'] },
  { category: 'Opinion',            prompt: 'Share your opinion on remote work vs office work.',         difficulty: 'Advanced',     durationSec: 45, icon: 'briefcase', gradient: ['#FF6B9D', '#FACC15'] },
];

const STOP_WORDS = new Set([
  'the','and','that','have','for','not','with','you','this','but','his','from','they','say',
  'her','she','will','one','all','would','there','their','what','out','about','who','get',
  'which','when','your','can','said','were','your','was','are','has','been','had','our',
  'just','very','some','more','such','then','than','also','very','many','much','only','any',
  'into','because','these','those','where','here','really','being','make','made',
]);

function extractVocab(text: string): { word: string; meaning: string }[] {
  if (!text) return [];
  const words = (text.match(/\b[a-zA-Z][a-zA-Z'-]{4,}\b/g) || [])
    .map((w) => w.toLowerCase())
    .filter((w, i, arr) => arr.indexOf(w) === i)            // unique
    .filter((w) => !STOP_WORDS.has(w))
    .sort((a, b) => b.length - a.length)                    // prefer longer words
    .slice(0, 3);
  return words.map((w) => ({ word: w, meaning: 'Tap to hear pronunciation' }));
}

function todayWeekIndex(): number {
  const d = new Date().getDay();
  return d === 0 ? 6 : d - 1; // Mon=0..Sun=6
}

export default function SpeakingPracticeScreen() {
  const navigation = useNavigation<Nav>();
  const { user } = useAuth();
  const { recordActivity, recordSpeakingScore, stats } = useProgress();
  const gam = useGamification();
  const { awardAction, checkBadges } = gam;

  const [phase, setPhase] = useState<Phase>('idle');
  const [transcript, setTranscript] = useState('');
  const [duration, setDuration] = useState(0);
  const [score, setScore] = useState<SpeakingScore | null>(null);
  const [challenge, setChallenge] = useState<Challenge>(CHALLENGES[0]);
  const [error, setError] = useState<string | null>(null);
  const [xpEarned, setXpEarned] = useState(0);

  const pulse = useRef(new Animated.Value(1)).current;
  const wave1 = useRef(new Animated.Value(0)).current;
  const wave2 = useRef(new Animated.Value(0)).current;
  const wave3 = useRef(new Animated.Value(0)).current;
  const xpScale = useRef(new Animated.Value(0)).current;

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startRef = useRef<number>(0);

  // Daily stats
  const todayMinutes = stats.weeklyMinutes[todayWeekIndex()] || 0;
  const goalProgress = Math.min(1, todayMinutes / DAILY_GOAL_MIN);

  // XP earned today — approximated from per-action rewards × today's counts.
  // We just show "+XP" reward animation on result. The full daily total stays in stats.
  const currentLevel = useMemo(() => getLevelByXp(gam.state.xp), [gam.state.xp]);
  const nextLevel = useMemo(() => getNextLevel(gam.state.xp), [gam.state.xp]);
  const levelProgress = nextLevel
    ? Math.min(1, (gam.state.xp - currentLevel.minXp) / Math.max(1, nextLevel.minXp - currentLevel.minXp))
    : 1;

  // -------- Animations --------
  useEffect(() => {
    if (phase === 'recording') {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulse, { toValue: 1.25, duration: 700, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
          Animated.timing(pulse, { toValue: 1,    duration: 700, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        ])
      ).start();
      // Three waveform bars with offset timings — pseudo "live" feedback.
      const makeWave = (val: Animated.Value, delay: number) =>
        Animated.loop(
          Animated.sequence([
            Animated.delay(delay),
            Animated.timing(val, { toValue: 1, duration: 350, easing: Easing.inOut(Easing.ease), useNativeDriver: false }),
            Animated.timing(val, { toValue: 0, duration: 350, easing: Easing.inOut(Easing.ease), useNativeDriver: false }),
          ])
        );
      makeWave(wave1, 0).start();
      makeWave(wave2, 120).start();
      makeWave(wave3, 240).start();
    } else {
      pulse.stopAnimation(); pulse.setValue(1);
      wave1.stopAnimation(); wave1.setValue(0);
      wave2.stopAnimation(); wave2.setValue(0);
      wave3.stopAnimation(); wave3.setValue(0);
    }
  }, [phase, pulse, wave1, wave2, wave3]);

  useEffect(() => {
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, []);

  // Bounce XP badge when result lands.
  useEffect(() => {
    if (xpEarned > 0) {
      xpScale.setValue(0);
      Animated.spring(xpScale, { toValue: 1, damping: 8, stiffness: 120, useNativeDriver: true }).start();
    }
  }, [xpEarned, xpScale]);

  // -------- Handlers --------
  const newChallenge = () => {
    const next = CHALLENGES[Math.floor(Math.random() * CHALLENGES.length)];
    setChallenge(next);
    resetAll();
  };

  const resetAll = () => {
    setScore(null); setTranscript(''); setPhase('idle'); setDuration(0); setError(null); setXpEarned(0);
  };

  const startRecording = useCallback(async () => {
    setError(null);
    try {
      await speechService.startRecording();
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
      setPhase('recording'); setDuration(0); startRef.current = Date.now();
      timerRef.current = setInterval(() => {
        setDuration(Math.floor((Date.now() - startRef.current) / 1000));
      }, 250);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Could not access microphone');
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
      const sample = transcript.trim() ||
        'I usually spend my weekends with family. We watch movies and sometimes go out for dinner.';
      const result = await aiService.scoreSpeaking(sample, sec, challenge.prompt);
      setScore(result);
      setPhase('result');
      // XP reward — scale by overall score.
      const earned = XP_REWARDS.SPEAKING_SESSION + Math.floor(result.overall / 10);
      setXpEarned(earned);
      recordActivity(Math.max(1, Math.round(sec / 60)), 'speaking').catch(() => {});
      recordSpeakingScore(result.overall).catch(() => {});
      awardAction('SPEAKING_SESSION').catch(() => {});
      if (result.overall >= 90) awardAction('PERFECT_SCORE_BONUS').catch(() => {});
      checkBadges({
        speakingSessions: stats.speakingScores.length + 1,
        bestSpeakingScore: Math.max(stats.bestSpeakingScore, result.overall),
        streak: stats.streak,
      }).catch(() => {});
    } catch (e: unknown) {
      if (e instanceof QuotaExceededError) {
        setError(`Daily free limit reached (${e.used}/${e.limit}). Upgrade to Premium for unlimited speaking practice.`);
      } else {
        setError(e instanceof Error ? e.message : 'Failed to process recording');
      }
      setPhase('idle');
    }
  }, [transcript, challenge, recordActivity, recordSpeakingScore, awardAction, checkBadges, stats]);

  const wordCount = transcript.trim().split(/\s+/).filter(Boolean).length;

  const vocab = useMemo(
    () => (score?.suggested ? extractVocab(score.suggested) : []),
    [score?.suggested]
  );

  // -------- UI --------
  return (
    <View style={{ flex: 1, backgroundColor: '#0A0418' }}>
      <LinearGradient colors={['#1F0E3D', '#0A0418', '#150828']} style={StyleSheet.absoluteFillObject} />
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        <ScrollView contentContainerStyle={{ paddingBottom: 140 }} showsVerticalScrollIndicator={false}>
          {/* ============ HEADER ============ */}
          <View style={styles.header}>
            <View>
              <Text style={styles.headerTitle}>Speaking Practice</Text>
              <Text style={styles.headerSub}>{getMotivationalNudge(stats.streak, todayMinutes)}</Text>
            </View>
            <Pressable onPress={newChallenge} style={styles.iconBtn} testID="speak-shuffle-btn">
              <Ionicons name="shuffle" size={18} color="#F2EEFF" />
            </Pressable>
          </View>

          {/* Stat pills */}
          <View style={styles.statsRow}>
            <StatPill icon="flame" color="#FF7A6B" label="Streak" value={`${stats.streak} day${stats.streak === 1 ? '' : 's'}`} />
            <StatPill icon="star" color="#FACC15" label="XP today" value={`+${xpEarned}`} />
            <StatPill icon="locate" color="#34D399" label="Goal" value={`${todayMinutes}/${DAILY_GOAL_MIN} min`} />
          </View>

          {/* Goal progress bar */}
          <View style={styles.goalBarWrap}>
            <View style={styles.goalBarTrack}>
              <LinearGradient
                colors={goalProgress >= 1 ? ['#34D399', '#22D3EE'] : ['#7C5CFF', '#A992FF']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={[styles.goalBarFill, { width: `${goalProgress * 100}%` }]}
              />
            </View>
          </View>

          {/* ============ CHALLENGE CARD ============ */}
          <LinearGradient
            colors={challenge.gradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.challengeCard}
          >
            <View style={styles.challengeIconWrap}>
              <Ionicons name={challenge.icon} size={28} color="#FFFFFF" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.challengeLabel}>TODAY'S CHALLENGE</Text>
              <Text style={styles.challengeCat}>{challenge.category}</Text>
              <Text style={styles.challengePrompt}>"{challenge.prompt}"</Text>
              <View style={styles.badgeRow}>
                <View style={styles.badge}>
                  <Ionicons name="barbell" size={11} color="#FFFFFF" />
                  <Text style={styles.badgeText}>{challenge.difficulty}</Text>
                </View>
                <View style={styles.badge}>
                  <Ionicons name="time" size={11} color="#FFFFFF" />
                  <Text style={styles.badgeText}>{challenge.durationSec}s</Text>
                </View>
                <Pressable
                  onPress={() => speechService.speak(challenge.prompt)}
                  style={[styles.badge, { backgroundColor: 'rgba(0,0,0,0.3)' }]}
                  testID="speak-listen-prompt"
                >
                  <Ionicons name="volume-high" size={11} color="#FFFFFF" />
                  <Text style={styles.badgeText}>Listen</Text>
                </Pressable>
              </View>
            </View>
          </LinearGradient>

          {/* ============ RECORDING AREA ============ */}
          <View style={styles.recordArea}>
            {/* Waveform bars (visible while recording) */}
            {phase === 'recording' && (
              <View style={styles.waveform}>
                {[wave1, wave2, wave3, wave1, wave2, wave3, wave1].map((w, i) => {
                  const height = w.interpolate({ inputRange: [0, 1], outputRange: [12, 48 - (i % 3) * 4] });
                  return <Animated.View key={i} style={[styles.waveBar, { height }]} />;
                })}
              </View>
            )}

            <Animated.View style={{ transform: [{ scale: pulse }] }}>
              <Pressable
                onPress={phase === 'recording' ? stopRecording : startRecording}
                disabled={phase === 'processing'}
                testID="speak-record-btn"
                style={styles.recordPressable}
              >
                <LinearGradient
                  colors={phase === 'recording' ? ['#FF6B9D', '#7C5CFF'] : ['#7C5CFF', '#A992FF']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={[styles.recordBtn, phase === 'processing' && { opacity: 0.6 }]}
                >
                  <Ionicons
                    name={phase === 'recording' ? 'stop' : 'mic'}
                    size={44}
                    color="#FFFFFF"
                  />
                </LinearGradient>
              </Pressable>
            </Animated.View>

            <Text style={styles.recordCaption}>
              {phase === 'recording'
                ? `🔴 Recording  ·  ${duration}s  ·  ${wordCount} words`
                : phase === 'processing'
                  ? 'Analysing your speech…'
                  : phase === 'result'
                    ? '✓ Done — see your report below'
                    : 'Tap to Start Speaking'}
            </Text>
            {phase === 'idle' && (
              <Text style={styles.recordHint}>
                Aim for {challenge.durationSec} seconds · Speak clearly
              </Text>
            )}
          </View>

          {/* Optional transcript input (only when not in result) */}
          {phase !== 'result' && (
            <View style={styles.transcriptBox}>
              <Text style={styles.transcriptLabel}>Optional: type what you said (for accuracy)</Text>
              <RNTextInput
                value={transcript}
                onChangeText={setTranscript}
                multiline
                placeholder="I usually spend my weekends…"
                placeholderTextColor="rgba(242,238,255,0.35)"
                style={styles.transcriptInput}
                testID="speak-transcript-input"
              />
            </View>
          )}

          {error ? (
            <View style={styles.errorBox}>
              <Ionicons name="warning" size={14} color="#FCA5A5" />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          {/* ============ AI FEEDBACK REPORT ============ */}
          {phase === 'result' && score ? (
            <>
              {/* XP earned celebration */}
              <Animated.View style={[styles.xpCelebrate, { transform: [{ scale: xpScale }] }]}>
                <LinearGradient
                  colors={['#FACC15', '#FF6B9D']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.xpCelebrateInner}
                >
                  <Ionicons name="trophy" size={20} color="#FFFFFF" />
                  <Text style={styles.xpCelebrateText}>+{xpEarned} XP earned!</Text>
                  <Text style={styles.xpCelebrateLevel}>
                    {currentLevel.badge} Lvl {currentLevel.id} · {Math.round(levelProgress * 100)}%
                  </Text>
                </LinearGradient>
              </Animated.View>

              <Text style={styles.section}>Your AI Report</Text>

              {/* Overall ring */}
              <View style={styles.overallWrap}>
                <View style={styles.overallRing}>
                  <Text style={[styles.overallScore, { color: colorFor(score.overall) }]}>
                    {score.overall}
                  </Text>
                  <Text style={styles.overallLabel}>OVERALL</Text>
                </View>
                <View style={{ flex: 1, gap: 8 }}>
                  <ScoreBar label="Grammar"       value={score.grammar}       color="#34D399" icon="checkmark-done" />
                  <ScoreBar label="Pronunciation" value={score.pronunciation} color="#FACC15" icon="megaphone" />
                  <ScoreBar label="Fluency"       value={score.fluency}       color="#7C5CFF" icon="pulse" />
                  <ScoreBar label="Vocabulary"    value={score.vocabulary ?? Math.max(50, score.overall - 5)} color="#22D3EE" icon="book" />
                </View>
              </View>

              {/* Mistake analysis */}
              {score.mistakes && score.mistakes.length > 0 ? (
                <View style={[styles.feedbackCard, { borderColor: 'rgba(239,68,68,0.3)', backgroundColor: 'rgba(239,68,68,0.08)' }]}>
                  <View style={styles.feedbackCardHead}>
                    <Ionicons name="close-circle" size={16} color="#FCA5A5" />
                    <Text style={[styles.feedbackCardTitle, { color: '#FCA5A5' }]}>
                      Mistakes ({score.mistakes.length})
                    </Text>
                  </View>
                  {score.mistakes.map((m, i) => (
                    <View key={i} style={{ flexDirection: 'row', marginTop: 4 }}>
                      <Text style={{ color: '#FCA5A5', marginRight: 6 }}>•</Text>
                      <Text style={styles.feedbackBody}>{m}</Text>
                    </View>
                  ))}
                </View>
              ) : null}

              {score.corrected ? (
                <View style={[styles.feedbackCard, { borderColor: 'rgba(52,211,153,0.3)', backgroundColor: 'rgba(52,211,153,0.08)' }]}>
                  <View style={styles.feedbackCardHead}>
                    <Ionicons name="checkmark-circle" size={16} color="#34D399" />
                    <Text style={[styles.feedbackCardTitle, { color: '#34D399' }]}>Corrected version</Text>
                  </View>
                  <Text style={styles.feedbackBody}>{score.corrected}</Text>
                </View>
              ) : null}

              {score.suggested ? (
                <View style={[styles.feedbackCard, { borderColor: 'rgba(124,92,255,0.35)', backgroundColor: 'rgba(124,92,255,0.1)' }]}>
                  <View style={styles.feedbackCardHead}>
                    <Ionicons name="star" size={16} color="#A992FF" />
                    <Text style={[styles.feedbackCardTitle, { color: '#A992FF' }]}>Native-speaker version</Text>
                  </View>
                  <Text style={styles.feedbackBody}>{score.suggested}</Text>
                  <Pressable
                    onPress={() => speechService.speak(score.suggested || '')}
                    style={styles.smallPlayBtn}
                    testID="speak-play-suggested"
                  >
                    <Ionicons name="volume-high" size={12} color="#A992FF" />
                    <Text style={styles.smallPlayText}>Listen</Text>
                  </Pressable>
                </View>
              ) : null}

              {/* Vocabulary builder */}
              {vocab.length > 0 && (
                <>
                  <Text style={styles.section}>📚 New Vocabulary</Text>
                  <View style={styles.vocabRow}>
                    {vocab.map((v) => (
                      <View key={v.word} style={styles.vocabCard}>
                        <Text style={styles.vocabWord}>{v.word}</Text>
                        <Pressable
                          onPress={() => speechService.speak(v.word)}
                          style={styles.vocabPlay}
                          testID={`vocab-play-${v.word}`}
                        >
                          <Ionicons name="volume-high" size={12} color="#A992FF" />
                        </Pressable>
                      </View>
                    ))}
                  </View>
                </>
              )}

              {/* Quick Actions */}
              <Text style={styles.section}>What's next?</Text>
              <View style={styles.actionGrid}>
                <ActionTile icon="refresh" label="Practice Again" gradient={['#7C5CFF', '#A992FF']} onPress={resetAll} testID="action-practice-again" />
                <ActionTile icon="shuffle" label="New Challenge"  gradient={['#FACC15', '#FF6B9D']} onPress={newChallenge} testID="action-new-challenge" />
                <ActionTile icon="flash"   label="Daily Challenge" gradient={['#FF7A6B', '#FFA396']} onPress={() => navigation.navigate('DailyChallenge')} testID="action-daily-challenge" />
                <ActionTile icon="briefcase" label="Interview"    gradient={['#22D3EE', '#7C5CFF']} onPress={() => navigation.navigate('Main', { screen: 'Interview' } as never)} testID="action-interview" />
                <ActionTile icon="megaphone" label="Pronunciation" gradient={['#34D399', '#22D3EE']} onPress={() => navigation.navigate('PronunciationPractice')} testID="action-pronunciation" />
                <ActionTile icon="library" label="Flashcards"      gradient={['#A992FF', '#7C5CFF']} onPress={() => navigation.navigate('Flashcards')} testID="action-flashcards" />
              </View>

              {/* Premium upsell — only for free users */}
              {!user?.isPremium && (
                <Pressable
                  onPress={() => navigation.navigate('Premium')}
                  style={styles.premiumCard}
                  testID="speaking-premium-upsell"
                >
                  <LinearGradient
                    colors={['rgba(250,204,21,0.18)', 'rgba(124,92,255,0.18)']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.premiumInner}
                  >
                    <Ionicons name="diamond" size={26} color="#FACC15" />
                    <View style={{ flex: 1, marginLeft: spacing.md }}>
                      <Text style={styles.premiumTitle}>Unlock Pro Analysis</Text>
                      <Text style={styles.premiumSub}>Accent score · IELTS band prediction · phoneme-level pronunciation</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={18} color="#F2EEFF" />
                  </LinearGradient>
                </Pressable>
              )}
            </>
          ) : null}

          {/* ============ WEEKLY CHART ============ */}
          <Text style={styles.section}>This week</Text>
          <View style={styles.weeklyChart}>
            {stats.weeklyMinutes.map((m, i) => {
              const isToday = i === todayWeekIndex();
              const heightPct = Math.max(6, Math.min(100, (m / Math.max(15, ...stats.weeklyMinutes)) * 100));
              return (
                <View key={i} style={styles.weeklyCol}>
                  <View style={styles.weeklyBarTrack}>
                    <LinearGradient
                      colors={isToday ? ['#FACC15', '#FF6B9D'] : ['#7C5CFF', '#A992FF']}
                      start={{ x: 0, y: 1 }}
                      end={{ x: 0, y: 0 }}
                      style={[styles.weeklyBarFill, { height: `${heightPct}%` }]}
                    />
                  </View>
                  <Text style={[styles.weeklyLabel, isToday && { color: '#FACC15', fontWeight: '800' }]}>
                    {['M', 'T', 'W', 'T', 'F', 'S', 'S'][i]}
                  </Text>
                </View>
              );
            })}
          </View>

          {/* Speaking tip card */}
          <View style={styles.tipCard}>
            <Ionicons name="bulb" size={16} color="#FACC15" />
            <Text style={styles.tipText}>
              <Text style={{ fontWeight: '800', color: '#FACC15' }}>Tip:</Text>{' '}
              Slow down on tricky words. Native-like pace is ~120 words/min, not faster.
            </Text>
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

// ------- Helpers / sub-components -------

function getMotivationalNudge(streak: number, todayMin: number): string {
  if (streak === 0 && todayMin === 0) return 'Speak for 2 minutes to start your streak 🔥';
  if (todayMin >= DAILY_GOAL_MIN) return "Goal done — bonus XP awaits if you continue 🎉";
  if (streak >= 7) return `🔥 ${streak}-day streak — you're unstoppable!`;
  if (streak >= 1) return `Day ${streak} streak. Aaj bhi practice karo!`;
  return 'Premium learners practise daily. Be one.';
}

function colorFor(n: number) {
  if (n >= 85) return '#34D399';
  if (n >= 70) return '#7C5CFF';
  if (n >= 55) return '#FACC15';
  return '#FCA5A5';
}

function StatPill({ icon, color, label, value }: { icon: keyof typeof Ionicons.glyphMap; color: string; label: string; value: string }) {
  return (
    <View style={styles.statPill}>
      <Ionicons name={icon} size={14} color={color} />
      <View>
        <Text style={styles.statLabel}>{label}</Text>
        <Text style={styles.statValue}>{value}</Text>
      </View>
    </View>
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

function ActionTile({ icon, label, gradient, onPress, testID }: { icon: keyof typeof Ionicons.glyphMap; label: string; gradient: readonly [string, string]; onPress: () => void; testID?: string }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.actionTile, pressed && { opacity: 0.7 }]} testID={testID}>
      <LinearGradient colors={gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.actionIcon}>
        <Ionicons name={icon} size={18} color="#FFFFFF" />
      </LinearGradient>
      <Text style={styles.actionLabel} numberOfLines={1}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  // Header
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.sm },
  headerTitle: { color: '#F2EEFF', fontSize: 22, fontWeight: '800' },
  headerSub: { color: '#A992FF', fontSize: 12, fontWeight: '700', marginTop: 2 },
  iconBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.06)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },

  // Stats
  statsRow: { flexDirection: 'row', paddingHorizontal: spacing.lg, gap: spacing.sm },
  statPill: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: 'rgba(255,255,255,0.04)', paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: radius.lg, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
  statLabel: { color: 'rgba(242,238,255,0.55)', fontSize: 9, fontWeight: '700', letterSpacing: 0.5 },
  statValue: { color: '#F2EEFF', fontSize: 12, fontWeight: '800' },
  goalBarWrap: { paddingHorizontal: spacing.lg, marginTop: spacing.sm },
  goalBarTrack: { height: 6, backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: radius.pill, overflow: 'hidden' },
  goalBarFill: { height: '100%' },

  // Challenge card
  challengeCard: { flexDirection: 'row', alignItems: 'flex-start', padding: spacing.lg, marginHorizontal: spacing.lg, marginTop: spacing.lg, borderRadius: radius.xxl, gap: spacing.md, shadowColor: '#7C5CFF', shadowOpacity: 0.4, shadowRadius: 16, shadowOffset: { width: 0, height: 8 }, elevation: 8 },
  challengeIconWrap: { width: 50, height: 50, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.22)', alignItems: 'center', justifyContent: 'center' },
  challengeLabel: { color: 'rgba(255,255,255,0.7)', fontSize: 10, fontWeight: '800', letterSpacing: 1 },
  challengeCat: { color: '#FFFFFF', fontSize: 17, fontWeight: '800', marginTop: 2 },
  challengePrompt: { color: 'rgba(255,255,255,0.92)', fontSize: 13, fontStyle: 'italic', marginTop: 6, lineHeight: 19 },
  badgeRow: { flexDirection: 'row', gap: 6, marginTop: spacing.sm },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(0,0,0,0.22)', paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.pill },
  badgeText: { color: '#FFFFFF', fontSize: 10, fontWeight: '700' },

  // Record area
  recordArea: { alignItems: 'center', marginTop: spacing.xl, marginBottom: spacing.md, gap: spacing.sm },
  waveform: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, height: 48, marginBottom: 4 },
  waveBar: { width: 4, borderRadius: 2, backgroundColor: '#FF6B9D' },
  recordPressable: { borderRadius: 60 },
  recordBtn: { width: 120, height: 120, borderRadius: 60, alignItems: 'center', justifyContent: 'center', shadowColor: '#7C5CFF', shadowOpacity: 0.6, shadowRadius: 20, shadowOffset: { width: 0, height: 8 }, elevation: 12 },
  recordCaption: { color: '#F2EEFF', fontSize: 14, fontWeight: '700' },
  recordHint: { color: 'rgba(242,238,255,0.5)', fontSize: 11, fontStyle: 'italic' },

  // Transcript
  transcriptBox: { marginHorizontal: spacing.lg, backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: radius.lg, padding: spacing.md, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
  transcriptLabel: { color: 'rgba(242,238,255,0.55)', fontSize: 11, fontWeight: '700', marginBottom: 6 },
  transcriptInput: { color: '#F2EEFF', fontSize: 14, minHeight: 56, textAlignVertical: 'top' },

  // Error
  errorBox: { flexDirection: 'row', alignItems: 'center', gap: 6, marginHorizontal: spacing.lg, marginTop: spacing.sm, padding: spacing.sm, borderRadius: radius.md, backgroundColor: 'rgba(239,68,68,0.1)', borderWidth: 1, borderColor: 'rgba(239,68,68,0.3)' },
  errorText: { color: '#FCA5A5', fontSize: 12, flex: 1 },

  // XP celebration
  xpCelebrate: { marginHorizontal: spacing.lg, marginTop: spacing.lg },
  xpCelebrateInner: { padding: spacing.md, borderRadius: radius.xl, alignItems: 'center', gap: 4 },
  xpCelebrateText: { color: '#FFFFFF', fontSize: 16, fontWeight: '800' },
  xpCelebrateLevel: { color: 'rgba(255,255,255,0.85)', fontSize: 11, fontWeight: '700' },

  section: { color: '#F2EEFF', fontSize: 15, fontWeight: '800', marginTop: spacing.xl, marginBottom: spacing.md, paddingHorizontal: spacing.lg },

  // Overall + scores
  overallWrap: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginHorizontal: spacing.lg },
  overallRing: { width: 100, height: 100, borderRadius: 50, borderWidth: 5, borderColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.04)' },
  overallScore: { fontSize: 32, fontWeight: '800' },
  overallLabel: { color: 'rgba(242,238,255,0.55)', fontSize: 9, fontWeight: '800', letterSpacing: 1, marginTop: -2 },
  scoreBarHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  scoreBarLabel: { color: '#F2EEFF', fontSize: 12, fontWeight: '700' },
  scoreBarValue: { fontSize: 12, fontWeight: '800' },
  scoreBarTrack: { height: 5, backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 3, overflow: 'hidden' },
  scoreBarFill: { height: '100%', borderRadius: 3 },

  // Feedback cards
  feedbackCard: { marginHorizontal: spacing.lg, marginTop: spacing.md, padding: spacing.md, borderRadius: radius.lg, borderWidth: 1 },
  feedbackCardHead: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
  feedbackCardTitle: { fontSize: 12, fontWeight: '800', letterSpacing: 0.3 },
  feedbackBody: { color: '#F2EEFF', fontSize: 13, lineHeight: 19 },
  smallPlayBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 3, marginTop: 8, borderRadius: radius.pill, borderWidth: 1, borderColor: 'rgba(169,146,255,0.4)' },
  smallPlayText: { color: '#A992FF', fontSize: 10, fontWeight: '800' },

  // Vocab
  vocabRow: { flexDirection: 'row', gap: spacing.sm, paddingHorizontal: spacing.lg },
  vocabCard: { flex: 1, backgroundColor: 'rgba(124,92,255,0.1)', borderRadius: radius.lg, padding: spacing.sm, borderWidth: 1, borderColor: 'rgba(124,92,255,0.3)', alignItems: 'center', gap: 6 },
  vocabWord: { color: '#F2EEFF', fontSize: 13, fontWeight: '800' },
  vocabPlay: { width: 24, height: 24, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.06)', alignItems: 'center', justifyContent: 'center' },

  // Action grid
  actionGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, paddingHorizontal: spacing.lg },
  actionTile: { width: (SCREEN_WIDTH - spacing.lg * 2 - spacing.sm * 2) / 3, backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: radius.lg, padding: spacing.sm, alignItems: 'center', gap: 6, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)' },
  actionIcon: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  actionLabel: { color: '#F2EEFF', fontSize: 10, fontWeight: '800', textAlign: 'center' },

  // Premium
  premiumCard: { marginHorizontal: spacing.lg, marginTop: spacing.lg, borderRadius: radius.xl, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(250,204,21,0.3)' },
  premiumInner: { flexDirection: 'row', alignItems: 'center', padding: spacing.md },
  premiumTitle: { color: '#F2EEFF', fontSize: 14, fontWeight: '800' },
  premiumSub: { color: 'rgba(242,238,255,0.65)', fontSize: 11, marginTop: 2, lineHeight: 16 },

  // Weekly chart
  weeklyChart: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', height: 100, paddingHorizontal: spacing.lg, gap: 4 },
  weeklyCol: { flex: 1, alignItems: 'center', height: '100%' },
  weeklyBarTrack: { flex: 1, width: '100%', backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 6, justifyContent: 'flex-end', overflow: 'hidden' },
  weeklyBarFill: { width: '100%', borderRadius: 6 },
  weeklyLabel: { color: 'rgba(242,238,255,0.5)', fontSize: 10, fontWeight: '700', marginTop: 4 },

  // Tip
  tipCard: { flexDirection: 'row', alignItems: 'center', gap: 8, marginHorizontal: spacing.lg, marginTop: spacing.lg, padding: spacing.md, borderRadius: radius.lg, backgroundColor: 'rgba(250,204,21,0.08)', borderWidth: 1, borderColor: 'rgba(250,204,21,0.2)' },
  tipText: { color: '#F2EEFF', fontSize: 12, flex: 1, lineHeight: 18 },
});
