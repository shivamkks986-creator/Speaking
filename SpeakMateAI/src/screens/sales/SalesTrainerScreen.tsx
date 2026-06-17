// Sales / Counselling Trainer — Indian-market roleplay practice.
// Flow: scenario picker → multi-turn chat with AI customer (Hinglish, tough objections)
// → after 6 turns, final 5-axis report (Empathy/Persuasion/ObjectionHandling/ProductKnowledge/Closing)
// + sample winning pitch + missed opportunities.
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  TextInput as RNTextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Text } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { RootStackParamList } from '@/navigation/types';
import { aiService, QuotaExceededError } from '@/services/aiService';
import { SalesScenario, SalesSessionReport, SalesTurnMessage } from '@/types';
import { radius, spacing } from '@/config/theme';

type Nav = NativeStackNavigationProp<RootStackParamList>;
type Phase = 'picker' | 'chat' | 'scoring' | 'report';

const INDUSTRY_COLOR: Record<string, [string, string]> = {
  EdTech: ['#7C5CFF', '#A992FF'],
  Insurance: ['#22D3EE', '#7C5CFF'],
  'Real Estate': ['#FACC15', '#FF6B9D'],
  'B2B SaaS': ['#34D399', '#22D3EE'],
  'College Admission': ['#FF7A6B', '#FACC15'],
};
const INDUSTRY_ICON: Record<string, keyof typeof Ionicons.glyphMap> = {
  EdTech: 'school',
  Insurance: 'shield-checkmark',
  'Real Estate': 'home',
  'B2B SaaS': 'cube',
  'College Admission': 'library',
};

export default function SalesTrainerScreen() {
  const navigation = useNavigation<Nav>();

  const [phase, setPhase] = useState<Phase>('picker');
  const [scenarios, setScenarios] = useState<SalesScenario[]>([]);
  const [activeScenario, setActiveScenario] = useState<SalesScenario | null>(null);
  const [messages, setMessages] = useState<SalesTurnMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [report, setReport] = useState<SalesSessionReport | null>(null);
  const [converted, setConverted] = useState(false);

  const scrollRef = useRef<ScrollView | null>(null);
  const TARGET_TURNS = 6;

  // Load scenarios on mount
  useEffect(() => {
    aiService.listSalesScenarios().then(setScenarios).catch(() => {
      setError('Could not load scenarios. Check your connection.');
    });
  }, []);

  const startScenario = useCallback(async (sc: SalesScenario) => {
    setActiveScenario(sc); setMessages([]); setDraft(''); setError(null);
    setPhase('chat'); setBusy(true);
    try {
      const opening = await aiService.salesTurn(sc.id, [], null, TARGET_TURNS);
      setMessages([{ role: 'customer', text: opening.customer_reply }]);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not start scenario');
      setPhase('picker');
    } finally {
      setBusy(false);
    }
  }, []);

  const sendMessage = useCallback(async () => {
    const text = draft.trim();
    if (!text || !activeScenario || busy) return;
    setDraft(''); setError(null); setBusy(true);
    const newUserMsg: SalesTurnMessage = { role: 'user', text };
    const newHistory = [...messages, newUserMsg];
    setMessages(newHistory);
    try {
      const response = await aiService.salesTurn(
        activeScenario.id,
        newHistory.map((m) => ({ role: m.role, text: m.text })),
        text,
        TARGET_TURNS,
      );
      const aiMsg: SalesTurnMessage = {
        role: 'customer',
        text: response.customer_reply,
        scores: response.scores || undefined,
        feedback: response.feedback || undefined,
        objection_raised: response.objection_raised || undefined,
      };
      setMessages([...newHistory, aiMsg]);
      Haptics.selectionAsync().catch(() => {});
      if (response.should_end) {
        setConverted(response.converted);
        // small delay so user reads the closing line before transitioning
        setTimeout(() => finalizeSession([...newHistory, aiMsg], response.converted), 1200);
      }
    } catch (e) {
      if (e instanceof QuotaExceededError) {
        setError(`Daily free limit reached (${e.used}/${e.limit}). Upgrade for unlimited.`);
      } else {
        setError(e instanceof Error ? e.message : 'Send failed');
      }
    } finally {
      setBusy(false);
    }
  }, [draft, activeScenario, busy, messages]);

  const finalizeSession = useCallback(async (finalMsgs: SalesTurnMessage[], didConvert: boolean) => {
    if (!activeScenario) return;
    setPhase('scoring');
    try {
      const r = await aiService.salesScoreSession(
        activeScenario.id,
        finalMsgs.map((m) => ({ role: m.role, text: m.text })),
        didConvert,
      );
      setReport(r); setPhase('report');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not generate report');
      setPhase('chat');
    }
  }, [activeScenario]);

  const reset = useCallback(() => {
    setPhase('picker'); setActiveScenario(null); setMessages([]);
    setReport(null); setConverted(false); setError(null);
  }, []);

  useEffect(() => {
    // auto-scroll chat to bottom
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 80);
  }, [messages.length]);

  // ------------ RENDER ------------
  return (
    <View style={{ flex: 1, backgroundColor: '#0A0418' }}>
      <LinearGradient colors={['#1F0E3D', '#0A0418', '#150828']} style={StyleSheet.absoluteFillObject} />
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          {/* Header */}
          <View style={styles.header}>
            <Pressable
              onPress={() => (phase === 'chat' || phase === 'report') ? reset() : navigation.goBack()}
              style={styles.iconBtn}
              testID="sales-back-btn"
            >
              <Ionicons name="chevron-back" size={20} color="#F2EEFF" />
            </Pressable>
            <View style={{ flex: 1, marginLeft: spacing.md }}>
              <Text style={styles.title}>Sales & Counselling Trainer</Text>
              <Text style={styles.subtitle}>
                {phase === 'picker' ? 'Pick a roleplay scenario' :
                 phase === 'chat' ? `${activeScenario?.industry} · turn ${messages.filter(m => m.role === 'user').length}/${TARGET_TURNS}` :
                 phase === 'scoring' ? 'Generating your report…' :
                 'Your performance report'}
              </Text>
            </View>
          </View>

          {error ? (
            <View style={styles.errorBox}>
              <Ionicons name="warning" size={14} color="#FCA5A5" />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          {phase === 'picker' && (
            <ScrollView contentContainerStyle={{ paddingBottom: 140 }}>
              <Text style={styles.section}>Choose your scenario</Text>
              {scenarios.length === 0 ? (
                <View style={{ alignItems: 'center', padding: spacing.xl }}>
                  <ActivityIndicator color="#A992FF" />
                </View>
              ) : scenarios.map((sc) => {
                const colors = INDUSTRY_COLOR[sc.industry] || ['#7C5CFF', '#A992FF'] as [string, string];
                const icon = INDUSTRY_ICON[sc.industry] || 'briefcase';
                return (
                  <Pressable
                    key={sc.id}
                    onPress={() => startScenario(sc)}
                    style={styles.scenarioCard}
                    testID={`sales-scenario-${sc.id}`}
                  >
                    <LinearGradient colors={colors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.scenarioGradient}>
                      <View style={styles.scenarioHead}>
                        <View style={styles.scenarioIcon}>
                          <Ionicons name={icon} size={20} color="#FFFFFF" />
                        </View>
                        <Text style={styles.scenarioIndustry}>{sc.industry.toUpperCase()}</Text>
                      </View>
                      <Text style={styles.scenarioTitle}>{sc.title}</Text>
                      <Text style={styles.scenarioCustomer}>👤 {sc.customer}</Text>
                      <View style={styles.scenarioGoalRow}>
                        <Ionicons name="flag" size={12} color="#FFFFFF" />
                        <Text style={styles.scenarioGoal}>{sc.goal}</Text>
                      </View>
                    </LinearGradient>
                  </Pressable>
                );
              })}
            </ScrollView>
          )}

          {(phase === 'chat' || phase === 'scoring') && (
            <>
              <ScrollView ref={scrollRef} contentContainerStyle={{ padding: spacing.lg, paddingBottom: 24 }}>
                {/* Scenario context card */}
                {activeScenario && (
                  <View style={styles.contextCard}>
                    <Text style={styles.contextTitle}>{activeScenario.title}</Text>
                    <Text style={styles.contextBody}>🎯 Goal: {activeScenario.goal}</Text>
                  </View>
                )}
                {messages.map((m, i) => (
                  <MessageBubble key={i} msg={m} />
                ))}
                {busy && (
                  <View style={[styles.bubble, styles.bubbleAI, { paddingVertical: 10 }]}>
                    <ActivityIndicator color="#A992FF" size="small" />
                  </View>
                )}
                {phase === 'scoring' && (
                  <View style={{ alignItems: 'center', padding: spacing.xl }}>
                    <ActivityIndicator color="#FACC15" />
                    <Text style={{ color: '#FACC15', fontWeight: '800', marginTop: spacing.sm }}>Generating coaching report…</Text>
                  </View>
                )}
              </ScrollView>

              {phase === 'chat' && (
                <View style={styles.inputBar}>
                  <RNTextInput
                    value={draft}
                    onChangeText={setDraft}
                    placeholder="Type your sales pitch / response…"
                    placeholderTextColor="rgba(242,238,255,0.35)"
                    multiline
                    style={styles.inputField}
                    testID="sales-input"
                  />
                  <Pressable
                    onPress={sendMessage}
                    disabled={!draft.trim() || busy}
                    style={({ pressed }) => [styles.sendBtn, (!draft.trim() || busy) && { opacity: 0.4 }, pressed && { opacity: 0.7 }]}
                    testID="sales-send-btn"
                  >
                    <Ionicons name="send" size={18} color="#FFFFFF" />
                  </Pressable>
                </View>
              )}
            </>
          )}

          {phase === 'report' && report && activeScenario && (
            <ScrollView contentContainerStyle={{ paddingBottom: 140 }}>
              <SalesReport report={report} converted={converted} onRetry={reset} />
            </ScrollView>
          )}
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

function MessageBubble({ msg }: { msg: SalesTurnMessage }) {
  const isUser = msg.role === 'user';
  return (
    <View style={{ alignItems: isUser ? 'flex-end' : 'flex-start', marginBottom: spacing.sm }}>
      {!isUser && (
        <Text style={styles.bubbleLabel}>👤 Customer</Text>
      )}
      <View style={[styles.bubble, isUser ? styles.bubbleUser : styles.bubbleAI]}>
        <Text style={[styles.bubbleText, isUser && { color: '#FFFFFF' }]}>{msg.text}</Text>
      </View>
      {msg.objection_raised && !isUser ? (
        <View style={styles.objectionChip}>
          <Ionicons name="warning" size={11} color="#FACC15" />
          <Text style={styles.objectionText}>OBJECTION: {msg.objection_raised}</Text>
        </View>
      ) : null}
      {msg.feedback && !isUser ? (
        <Text style={styles.coachNote}>💡 Coach: {msg.feedback}</Text>
      ) : null}
    </View>
  );
}

function SalesReport({ report, converted, onRetry }: { report: SalesSessionReport; converted: boolean; onRetry: () => void }) {
  return (
    <View style={{ paddingHorizontal: spacing.lg }}>
      {/* Outcome */}
      <LinearGradient
        colors={converted ? ['#34D399', '#22D3EE'] : ['#FF7A6B', '#FACC15']}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        style={styles.outcomeCard}
      >
        <Ionicons name={converted ? 'trophy' : 'sad'} size={28} color="#FFFFFF" />
        <View style={{ flex: 1 }}>
          <Text style={styles.outcomeLabel}>{converted ? 'CONVERTED 🎉' : 'NOT CONVERTED'}</Text>
          <Text style={styles.outcomeBody}>{report.outcome_summary}</Text>
        </View>
      </LinearGradient>

      {/* Overall + axes */}
      <View style={styles.overallWrap}>
        <View style={styles.overallRing}>
          <Text style={[styles.overallScore, { color: colorFor(report.overallScore) }]}>{report.overallScore}</Text>
          <Text style={styles.overallLabel}>OVERALL</Text>
        </View>
        <View style={{ flex: 1, gap: 8 }}>
          <ScoreBar label="Empathy"            value={report.empathyScore}    color="#34D399" icon="heart" />
          <ScoreBar label="Persuasion"         value={report.persuasionScore} color="#7C5CFF" icon="flame" />
          <ScoreBar label="Objection Handling" value={report.objectionScore}  color="#FACC15" icon="shield-checkmark" />
          <ScoreBar label="Product Knowledge"  value={report.productScore}    color="#22D3EE" icon="bulb" />
          <ScoreBar label="Closing"            value={report.closingScore}    color="#FF6B9D" icon="checkmark-done" />
        </View>
      </View>

      <FeedbackBlock title="✅ Strengths" items={report.strengths} color="#34D399" />
      <FeedbackBlock title="🛠 Improvements" items={report.improvements} color="#FACC15" />
      {report.key_objections_handled.length > 0 && (
        <FeedbackBlock title="🎯 Objections you handled well" items={report.key_objections_handled} color="#22D3EE" />
      )}
      {report.missed_opportunities.length > 0 && (
        <FeedbackBlock title="❌ Missed opportunities" items={report.missed_opportunities} color="#FCA5A5" />
      )}

      {!!report.sample_winning_pitch && (
        <View style={[styles.feedbackCard, { borderColor: 'rgba(124,92,255,0.4)', backgroundColor: 'rgba(124,92,255,0.1)' }]}>
          <View style={styles.feedbackCardHead}>
            <Ionicons name="star" size={16} color="#A992FF" />
            <Text style={[styles.feedbackCardTitle, { color: '#A992FF' }]}>Expert winning pitch</Text>
          </View>
          <Text style={styles.feedbackBody}>{report.sample_winning_pitch}</Text>
        </View>
      )}

      <Pressable onPress={onRetry} style={styles.retryBtn} testID="sales-retry-btn">
        <LinearGradient colors={['#7C5CFF', '#A992FF']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.retryInner}>
          <Ionicons name="refresh" size={16} color="#FFFFFF" />
          <Text style={styles.retryText}>Try another scenario</Text>
        </LinearGradient>
      </Pressable>
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

function FeedbackBlock({ title, items, color }: { title: string; items: string[]; color: string }) {
  if (!items?.length) return null;
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
  title: { color: '#F2EEFF', fontSize: 18, fontWeight: '800' },
  subtitle: { color: '#A992FF', fontSize: 12, fontWeight: '700', marginTop: 2 },

  errorBox: { flexDirection: 'row', alignItems: 'center', gap: 6, marginHorizontal: spacing.lg, marginTop: spacing.sm, padding: spacing.sm, borderRadius: radius.md, backgroundColor: 'rgba(239,68,68,0.1)', borderWidth: 1, borderColor: 'rgba(239,68,68,0.3)' },
  errorText: { color: '#FCA5A5', fontSize: 12, flex: 1 },

  section: { color: '#F2EEFF', fontSize: 14, fontWeight: '800', marginTop: spacing.lg, marginBottom: spacing.md, paddingHorizontal: spacing.lg },

  scenarioCard: { marginHorizontal: spacing.lg, marginBottom: spacing.md, borderRadius: radius.xl, overflow: 'hidden' },
  scenarioGradient: { padding: spacing.lg, gap: 6 },
  scenarioHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  scenarioIcon: { width: 36, height: 36, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.22)', alignItems: 'center', justifyContent: 'center' },
  scenarioIndustry: { color: 'rgba(255,255,255,0.85)', fontSize: 10, fontWeight: '800', letterSpacing: 1 },
  scenarioTitle: { color: '#FFFFFF', fontSize: 15, fontWeight: '800', marginTop: 4 },
  scenarioCustomer: { color: 'rgba(255,255,255,0.9)', fontSize: 12, marginTop: 4, lineHeight: 16, fontStyle: 'italic' },
  scenarioGoalRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 6, paddingTop: 6, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.2)' },
  scenarioGoal: { color: '#FFFFFF', fontSize: 11, fontWeight: '700', flex: 1 },

  contextCard: { padding: spacing.md, borderRadius: radius.lg, backgroundColor: 'rgba(124,92,255,0.1)', borderWidth: 1, borderColor: 'rgba(124,92,255,0.3)', marginBottom: spacing.md },
  contextTitle: { color: '#A992FF', fontSize: 13, fontWeight: '800' },
  contextBody: { color: 'rgba(242,238,255,0.8)', fontSize: 11, marginTop: 4 },

  bubble: { maxWidth: '85%', paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: radius.lg },
  bubbleUser: { backgroundColor: '#7C5CFF', borderBottomRightRadius: 4 },
  bubbleAI: { backgroundColor: 'rgba(255,255,255,0.06)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', borderBottomLeftRadius: 4 },
  bubbleText: { color: '#F2EEFF', fontSize: 14, lineHeight: 19 },
  bubbleLabel: { color: 'rgba(242,238,255,0.5)', fontSize: 10, fontWeight: '700', marginBottom: 3 },
  objectionChip: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.pill, backgroundColor: 'rgba(250,204,21,0.15)', borderWidth: 1, borderColor: 'rgba(250,204,21,0.4)', alignSelf: 'flex-start' },
  objectionText: { color: '#FACC15', fontSize: 10, fontWeight: '800', letterSpacing: 0.3 },
  coachNote: { color: '#A992FF', fontSize: 11, marginTop: 4, fontStyle: 'italic', maxWidth: '90%' },

  inputBar: { flexDirection: 'row', alignItems: 'flex-end', gap: spacing.sm, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.06)', backgroundColor: 'rgba(10,4,24,0.9)' },
  inputField: { flex: 1, color: '#F2EEFF', fontSize: 14, backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: radius.lg, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, maxHeight: 100, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  sendBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#7C5CFF', alignItems: 'center', justifyContent: 'center' },

  outcomeCard: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.lg, marginHorizontal: spacing.lg, marginTop: spacing.md, borderRadius: radius.xl },
  outcomeLabel: { color: '#FFFFFF', fontWeight: '800', fontSize: 13, letterSpacing: 1 },
  outcomeBody: { color: 'rgba(255,255,255,0.95)', fontSize: 12, marginTop: 3, lineHeight: 17 },

  overallWrap: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginHorizontal: spacing.lg, marginTop: spacing.lg },
  overallRing: { width: 100, height: 100, borderRadius: 50, borderWidth: 5, borderColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.04)' },
  overallScore: { fontSize: 32, fontWeight: '800' },
  overallLabel: { color: 'rgba(242,238,255,0.55)', fontSize: 9, fontWeight: '800', letterSpacing: 1, marginTop: -2 },
  scoreBarHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 3 },
  scoreBarLabel: { color: '#F2EEFF', fontSize: 11, fontWeight: '700' },
  scoreBarValue: { fontSize: 11, fontWeight: '800' },
  scoreBarTrack: { height: 5, backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 3, overflow: 'hidden' },
  scoreBarFill: { height: '100%', borderRadius: 3 },

  feedbackCard: { marginHorizontal: 0, marginTop: spacing.md, padding: spacing.md, borderRadius: radius.lg, borderWidth: 1 },
  feedbackCardHead: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  feedbackCardTitle: { fontSize: 12, fontWeight: '800', letterSpacing: 0.3 },
  feedbackBody: { color: '#F2EEFF', fontSize: 13, lineHeight: 19, flex: 1 },

  retryBtn: { marginTop: spacing.lg, borderRadius: radius.pill, overflow: 'hidden' },
  retryInner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14 },
  retryText: { color: '#FFFFFF', fontWeight: '800', fontSize: 14 },
});
