// AI Tutor — Modern chat with companion avatar, typing indicator, reactions, dark theme
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  TextInput as RNTextInput,
  ScrollView,
  Alert,
  Modal,
} from 'react-native';
import { Text, ActivityIndicator } from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import * as Clipboard from 'expo-clipboard';
import FadeInView from '@/components/common/FadeInView';

import { ChatMessage } from '@/types';
import { aiService, QuotaExceededError } from '@/services/aiService';
import { speechService } from '@/services/speechService';
import { useProgress } from '@/contexts/ProgressContext';
import { useCompanion } from '@/contexts/CompanionContext';
import { useGamification } from '@/contexts/GamificationContext';
import { useUserQuota } from '@/hooks/useUserQuota';
import { randomId } from '@/utils/helpers';
import CompanionAvatar from '@/components/feature/CompanionAvatar';
import { radius, spacing } from '@/config/theme';

export default function AITutorScreen() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  // AITutorScreen lives inside MainTabNavigator, so the bottom tab bar overlays it.
  // We add this height as bottom padding to the input bar so nothing is hidden.
  const tabBarHeight = useBottomTabBarHeight();
  const { recordActivity } = useProgress();
  const { companion } = useCompanion();
  const { awardAction } = useGamification();
  const { quota, refresh: refreshQuota } = useUserQuota();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [thinking, setThinking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPaywall, setShowPaywall] = useState(false);
  const listRef = useRef<FlatList<ChatMessage>>(null);

  // Reset chat session when companion changes
  useEffect(() => {
    aiService.resetTutorSession?.();
    setMessages([]);
  }, [companion.id]);

  const onSend = useCallback(async (overrideText?: string, agent?: string) => {
    const text = (overrideText ?? input).trim();
    if (!text || thinking) return;
    const userMsg: ChatMessage = {
      id: randomId(),
      role: 'user',
      text,
      timestamp: Date.now(),
    };
    // Capture history BEFORE adding the new user message so we send the last 6 turns of context.
    const historyForApi = messages.slice(-6).map((m) => ({ role: m.role, text: m.text }));
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setThinking(true);
    setError(null);
    try {
      const reply = await aiService.chat(text, companion.id, companion.systemPrompt, historyForApi, agent);
      setMessages((prev) => [...prev, reply]);
      recordActivity(1, 'chat').catch(() => {});
      awardAction('CHAT_MESSAGE').catch(() => {});
      refreshQuota();
      requestAnimationFrame(() => listRef.current?.scrollToEnd({ animated: true }));
    } catch (e) {
      if (e instanceof QuotaExceededError) {
        setShowPaywall(true);
        // Strip the user message we just added, since the call didn't happen.
        setMessages((prev) => prev.filter((m) => m.id !== userMsg.id));
        refreshQuota();
      } else {
        setError('Could not reach the AI tutor. Try again.');
      }
    } finally {
      setThinking(false);
    }
  }, [input, thinking, recordActivity, awardAction, companion.id, companion.systemPrompt, messages, refreshQuota]);

  const onClear = useCallback(() => {
    setMessages([]);
    setError(null);
    aiService.resetTutorSession?.();
  }, []);

  const onLongPressMessage = useCallback((msg: ChatMessage) => {
    Alert.alert(
      'Message options',
      undefined,
      [
        { text: 'Copy', onPress: () => Clipboard.setStringAsync(msg.text) },
        { text: 'Speak', onPress: () => speechService.speakWithAI(msg.text, { companionId: companion.id }) },
        ...(msg.role === 'ai'
          ? [{ text: 'Regenerate', onPress: () => {
              // Remove last AI reply and resend the previous user message
              const lastUserIdx = [...messages].reverse().findIndex((m) => m.role === 'user');
              if (lastUserIdx < 0) return;
              const realIdx = messages.length - 1 - lastUserIdx;
              const lastUser = messages[realIdx];
              setMessages((prev) => prev.slice(0, realIdx + 1));
              onSend(lastUser.text);
            } }]
          : []),
        { text: 'Cancel', style: 'cancel' as const },
      ]
    );
  }, [companion.id, messages, onSend]);

  return (
    <View style={{ flex: 1, backgroundColor: '#0A0418' }}>
      <LinearGradient colors={['#0A0418', '#150828', '#1F0E3D']} style={StyleSheet.absoluteFillObject} />
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        {/* Header */}
        <View style={[styles.header, { paddingTop: Math.max(insets.top, 12) + 8 }]}>
          <Pressable onPress={() => navigation.navigate('Companions' as never)} style={{ flexDirection: 'row', alignItems: 'center' }} testID="tutor-switch-companion-btn">
            <CompanionAvatar companion={companion} size={40} />
            <View style={{ marginLeft: spacing.md }}>
              <Text style={styles.headerName}>{companion.name}</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <View style={[styles.dot, { backgroundColor: '#34D399' }]} />
                <Text style={styles.headerSub}>{companion.role}</Text>
              </View>
            </View>
          </Pressable>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Pressable
              onPress={() => navigation.navigate('VoiceCall' as never)}
              style={styles.iconCircle}
              testID="tutor-voice-call-btn"
            >
              <Ionicons name="call" size={18} color="#F2EEFF" />
            </Pressable>
            {messages.length > 0 && (
              <Pressable onPress={onClear} style={styles.iconCircle} testID="tutor-clear-btn">
                <Ionicons name="trash" size={18} color="#F2EEFF" />
              </Pressable>
            )}
          </View>
        </View>

        {/* Quota chip — only for free users, shows remaining daily calls */}
        {quota && !quota.is_premium && quota.limit > 0 && (
          <Pressable
            onPress={() => quota.remaining < 5 && setShowPaywall(true)}
            style={[styles.quotaChip, quota.remaining < 5 && styles.quotaChipWarn]}
            testID="tutor-quota-chip"
          >
            <Ionicons
              name={quota.remaining < 5 ? 'warning' : 'flash'}
              size={12}
              color={quota.remaining < 5 ? '#FACC15' : '#A992FF'}
            />
            <Text style={[styles.quotaChipText, quota.remaining < 5 && { color: '#FACC15' }]}>
              {quota.remaining > 0
                ? `${quota.remaining}/${quota.limit} free AI calls left today`
                : 'Daily free limit reached — upgrade for unlimited'}
            </Text>
            {quota.remaining < 5 && <Ionicons name="diamond" size={12} color="#FACC15" />}
          </Pressable>
        )}

        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}
        >
          {messages.length === 0 ? (
            <ScrollView contentContainerStyle={styles.welcome} keyboardShouldPersistTaps="handled">
              <CompanionAvatar companion={companion} size={72} showRing />
              <Text style={styles.welcomeTitle}>{companion.greeting}</Text>
              <Text style={styles.welcomeSub}>
                Tap any action below or type a message — I'll teach, correct or challenge you.
              </Text>
              <View style={styles.actionGrid}>
                {QUICK_ACTIONS.map((q) => (
                  <Pressable
                    key={q.id}
                    onPress={() => {
                      if (q.autoSend) {
                        onSend(q.prompt, q.id);
                      } else {
                        setInput(q.prompt);
                      }
                    }}
                    style={({ pressed }) => [styles.actionTile, pressed && { opacity: 0.7 }]}
                    testID={`tutor-action-${q.id}`}
                  >
                    <LinearGradient
                      colors={q.gradient}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={styles.actionIcon}
                    >
                      <Ionicons name={q.icon} size={20} color="#FFFFFF" />
                    </LinearGradient>
                    <Text style={styles.actionLabel} numberOfLines={1}>{q.label}</Text>
                    <Text style={styles.actionSub} numberOfLines={1}>{q.sub}</Text>
                  </Pressable>
                ))}
              </View>
            </ScrollView>
          ) : (
            <FlatList
              ref={listRef}
              data={messages}
              keyExtractor={(m) => m.id}
              renderItem={({ item, index }) => (
                <Bubble msg={item} companion={companion} index={index} onLongPress={onLongPressMessage} onUseFollowup={(t) => onSend(t)} />
              )}
              contentContainerStyle={styles.list}
              onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
            />
          )}

          {thinking && (
            <FadeInView duration={200} style={styles.thinkingRow}>
              <CompanionAvatar companion={companion} size={28} />
              <View style={styles.typingBubble}>
                <View style={styles.typingDot} />
                <View style={styles.typingDot} />
                <View style={styles.typingDot} />
              </View>
            </FadeInView>
          )}

          {error && (
            <View style={styles.errorBar}>
              <Text style={{ color: '#FF6B6B', fontSize: 13 }}>{error}</Text>
            </View>
          )}

          {/* Quick action chips at bottom — only when chat has messages (grid handles empty state) */}
          {messages.length > 0 && (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.quickRow}
              keyboardShouldPersistTaps="handled"
            >
              {QUICK_ACTIONS.map((q) => (
                <Pressable
                  key={q.id}
                  onPress={() => {
                    if (q.autoSend) onSend(q.prompt, q.id);
                    else setInput(q.prompt);
                  }}
                  disabled={thinking}
                  style={({ pressed }) => [styles.quickChip, pressed && { opacity: 0.6 }]}
                  testID={`tutor-quick-${q.id}`}
                >
                  <Ionicons name={q.icon} size={14} color="#A992FF" />
                  <Text style={styles.quickChipText}>{q.label}</Text>
                </Pressable>
              ))}
            </ScrollView>
          )}

          <View style={[styles.inputBar, { paddingBottom: spacing.md, marginBottom: tabBarHeight }]}>
            <RNTextInput
              placeholder="Type or speak in English / Hindi…"
              placeholderTextColor="rgba(242,238,255,0.4)"
              value={input}
              onChangeText={setInput}
              multiline
              style={styles.input}
              testID="tutor-input"
            />
            <Pressable
              onPress={() => onSend()}
              disabled={!input.trim() || thinking}
              style={[styles.sendBtn, !input.trim() && { opacity: 0.4 }]}
              testID="tutor-send-btn"
            >
              <LinearGradient colors={companion.gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.sendBg}>
                {thinking ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Ionicons name="send" size={18} color="#FFFFFF" />
                )}
              </LinearGradient>
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>

      {/* Soft paywall — shown when free daily quota is exhausted */}
      <Modal visible={showPaywall} transparent animationType="fade" onRequestClose={() => setShowPaywall(false)}>
        <View style={styles.paywallBackdrop}>
          <View style={styles.paywallCard}>
            <LinearGradient
              colors={['#FACC15', '#FF6B9D', '#7C5CFF']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.paywallIconWrap}
            >
              <Ionicons name="diamond" size={32} color="#FFFFFF" />
            </LinearGradient>
            <Text style={styles.paywallTitle}>You're loving SpeakMate!</Text>
            <Text style={styles.paywallBody}>
              Daily free limit reached ({quota?.used}/{quota?.limit}). Upgrade to{' '}
              <Text style={{ fontWeight: '800', color: '#FACC15' }}>Premium</Text> for unlimited AI
              tutor, speaking practice and interview coaching.
            </Text>
            <View style={styles.paywallActions}>
              <Pressable onPress={() => setShowPaywall(false)} style={styles.paywallSecondary} testID="paywall-later">
                <Text style={styles.paywallSecondaryText}>Maybe later</Text>
              </Pressable>
              <Pressable
                onPress={() => {
                  setShowPaywall(false);
                  navigation.navigate('Premium' as never);
                }}
                testID="paywall-upgrade"
              >
                <LinearGradient
                  colors={['#FACC15', '#FF6B9D']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.paywallPrimary}
                >
                  <Text style={styles.paywallPrimaryText}>Upgrade to Premium</Text>
                </LinearGradient>
              </Pressable>
            </View>
            <Text style={styles.paywallNote}>Free quota resets at 12 AM IST · No card needed for trial</Text>
          </View>
        </View>
      </Modal>
    </View>
  );
}

// Quick-action tiles — each calls a specialized backend agent for single-task, no-filler responses.
const QUICK_ACTIONS: {
  id: string;
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  sub: string;
  gradient: readonly [string, string];
  prompt: string;
  autoSend?: boolean;
}[] = [
  { id: 'fix_grammar',        icon: 'construct',  label: 'Fix Grammar',     sub: 'Paste any sentence',  gradient: ['#FF6B9D', '#FACC15'] as const, prompt: 'Fix the grammar of: ' },
  { id: 'improve_sentence',   icon: 'sparkles',   label: 'Improve It',      sub: 'Sound natural',       gradient: ['#7C5CFF', '#A992FF'] as const, prompt: 'Improve this sentence: ' },
  { id: 'translate',          icon: 'language',   label: 'Translate',       sub: 'Hindi ↔ English',     gradient: ['#22D3EE', '#7C5CFF'] as const, prompt: 'Translate: ' },
  { id: 'explain_meaning',    icon: 'book',       label: 'Explain Meaning', sub: 'Word or phrase',      gradient: ['#34D399', '#22D3EE'] as const, prompt: 'Explain the meaning of: ' },
  { id: 'interview_practice', icon: 'briefcase',  label: 'Interview Prep',  sub: 'Mock HR/Tech Qs',     gradient: ['#FACC15', '#FF6B9D'] as const, prompt: 'Ask me one common interview question.', autoSend: true },
  { id: 'daily_conversation', icon: 'chatbubbles',label: 'Daily Chat',      sub: 'Casual practice',     gradient: ['#FF7A6B', '#FFA396'] as const, prompt: "Let's have a casual English conversation. Start with a fun question.", autoSend: true },
];

function Bubble({
  msg,
  companion,
  index,
  onLongPress,
  onUseFollowup,
}: {
  msg: ChatMessage;
  companion: ReturnType<typeof useCompanion>['companion'];
  index: number;
  onLongPress: (msg: ChatMessage) => void;
  onUseFollowup: (text: string) => void;
}) {
  const isUser = msg.role === 'user';
  const onSpeak = () => {
    speechService.speakWithAI(msg.text, { companionId: companion.id });
  };
  return (
    <FadeInView
      delay={index * 30}
      duration={250}
      direction="up"
      style={[styles.bubbleRow, isUser && { justifyContent: 'flex-end' }]}
    >
      {!isUser && <CompanionAvatar companion={companion} size={28} style={{ marginRight: 8 }} />}
      <View style={{ maxWidth: '78%', flexShrink: 1 }}>
        {isUser ? (
          <Pressable onLongPress={() => onLongPress(msg)} delayLongPress={250}>
            <LinearGradient
              colors={companion.gradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={[styles.bubble, styles.bubbleUser]}
            >
              <Text style={styles.bubbleTextUser}>{msg.text}</Text>
            </LinearGradient>
          </Pressable>
        ) : (
          <Pressable onLongPress={() => onLongPress(msg)} delayLongPress={250} style={[styles.bubble, styles.bubbleAi]}>
            <Text style={styles.bubbleTextAi}>{msg.text}</Text>
            {msg.correction && (
              <View style={styles.metaCard}>
                <Ionicons name="checkmark-circle" size={14} color="#34D399" />
                <Text style={styles.metaText}>{msg.correction}</Text>
              </View>
            )}
            {msg.suggestion && (
              <View style={[styles.metaCard, { borderColor: 'rgba(250,204,21,0.3)', backgroundColor: 'rgba(250,204,21,0.08)' }]}>
                <Ionicons name="bulb" size={14} color="#FACC15" />
                <Text style={styles.metaText}>{msg.suggestion}</Text>
              </View>
            )}
            {msg.vocab && (
              <View style={[styles.metaCard, { borderColor: 'rgba(34,211,238,0.3)', backgroundColor: 'rgba(34,211,238,0.08)' }]}>
                <Ionicons name="book" size={14} color="#22D3EE" />
                <Text style={styles.metaText}>
                  <Text style={{ fontWeight: '800' }}>{msg.vocab.word}</Text> — {msg.vocab.meaning}
                  {msg.vocab.hindi ? `  ·  ${msg.vocab.hindi}` : ''}
                </Text>
              </View>
            )}
            <View style={styles.bubbleActionsRow}>
              <Pressable onPress={onSpeak} style={styles.speakBtn} testID={`tutor-speak-${msg.id}`}>
                <Ionicons name="volume-high" size={12} color={companion.accent} />
                <Text style={[styles.speakBtnText, { color: companion.accent }]}>Play</Text>
              </Pressable>
              {msg.followup && (
                <Pressable
                  onPress={() => onUseFollowup(msg.followup!)}
                  style={[styles.followupChip, { borderColor: `${companion.accent}55` }]}
                  testID={`tutor-followup-${msg.id}`}
                >
                  <Ionicons name="arrow-forward" size={11} color={companion.accent} />
                  <Text style={[styles.followupChipText, { color: companion.accent }]} numberOfLines={1}>
                    {msg.followup}
                  </Text>
                </Pressable>
              )}
            </View>
          </Pressable>
        )}
      </View>
    </FadeInView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  headerName: { color: '#F2EEFF', fontSize: 16, fontWeight: '800' },
  quotaChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(124,92,255,0.1)',
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    marginHorizontal: spacing.lg,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: 'rgba(124,92,255,0.25)',
    marginBottom: spacing.sm,
  },
  quotaChipWarn: {
    backgroundColor: 'rgba(250,204,21,0.12)',
    borderColor: 'rgba(250,204,21,0.4)',
  },
  quotaChipText: { color: '#A992FF', fontSize: 11, fontWeight: '700', flex: 1 },
  paywallBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.75)', alignItems: 'center', justifyContent: 'center', padding: spacing.lg },
  paywallCard: { width: '100%', maxWidth: 360, backgroundColor: '#1A0F3D', borderRadius: radius.xxl, padding: spacing.xl, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
  paywallIconWrap: { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.md, shadowColor: '#FF6B9D', shadowOpacity: 0.6, shadowRadius: 16 },
  paywallTitle: { color: '#F2EEFF', fontSize: 18, fontWeight: '800', marginBottom: spacing.sm, textAlign: 'center' },
  paywallBody: { color: 'rgba(242,238,255,0.75)', fontSize: 13, lineHeight: 19, textAlign: 'center', marginBottom: spacing.lg },
  paywallActions: { flexDirection: 'row', gap: spacing.sm, width: '100%' },
  paywallSecondary: { flex: 1, padding: spacing.md, alignItems: 'center', borderRadius: radius.pill, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  paywallSecondaryText: { color: 'rgba(242,238,255,0.7)', fontSize: 13, fontWeight: '700' },
  paywallPrimary: { paddingHorizontal: spacing.lg, paddingVertical: spacing.md, borderRadius: radius.pill, alignItems: 'center' },
  paywallPrimaryText: { color: '#FFFFFF', fontSize: 13, fontWeight: '800' },
  paywallNote: { color: 'rgba(242,238,255,0.45)', fontSize: 10, fontStyle: 'italic', marginTop: spacing.md, textAlign: 'center' },
  headerSub: { color: 'rgba(242,238,255,0.6)', fontSize: 11 },
  dot: { width: 6, height: 6, borderRadius: 3 },
  iconCircle: {
    width: 36, height: 36, borderRadius: 18,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  welcome: { alignItems: 'center', padding: spacing.lg, gap: spacing.md, paddingTop: spacing.xl },
  welcomeTitle: { color: '#F2EEFF', fontSize: 18, fontWeight: '800', textAlign: 'center', marginTop: spacing.md },
  welcomeSub: { color: 'rgba(242,238,255,0.6)', fontSize: 13, textAlign: 'center', paddingHorizontal: spacing.md, marginBottom: spacing.sm },
  actionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    width: '100%',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  actionTile: {
    width: '48%',
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: radius.xl,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    gap: 4,
  },
  actionIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  actionLabel: { color: '#F2EEFF', fontSize: 14, fontWeight: '800' },
  actionSub: { color: 'rgba(242,238,255,0.55)', fontSize: 11, fontWeight: '600' },
  starterRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center', marginTop: spacing.lg },
  starter: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
  },
  starterText: { color: '#F2EEFF', fontSize: 12 },
  list: { padding: spacing.md, paddingBottom: 8 },
  bubbleRow: { flexDirection: 'row', alignItems: 'flex-end', marginBottom: spacing.sm },
  bubble: { borderRadius: radius.lg, padding: spacing.md },
  bubbleUser: { borderBottomRightRadius: 4 },
  bubbleAi: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  bubbleTextUser: { color: '#FFFFFF', fontSize: 14, lineHeight: 20 },
  bubbleTextAi: { color: '#F2EEFF', fontSize: 14, lineHeight: 20 },
  metaCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    backgroundColor: 'rgba(52,211,153,0.1)',
    borderRadius: 10,
    padding: 8,
    marginTop: 8,
    borderWidth: 1,
    borderColor: 'rgba(52,211,153,0.25)',
  },
  metaText: { color: '#F2EEFF', fontSize: 12, flex: 1 },
  speakBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
    marginTop: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  speakBtnText: { fontSize: 11, fontWeight: '700' },
  thinkingRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.md, paddingBottom: spacing.sm, gap: 8 },
  typingBubble: {
    flexDirection: 'row',
    gap: 4,
    backgroundColor: 'rgba(255,255,255,0.08)',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: radius.pill,
  },
  typingDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#A992FF' },
  errorBar: { paddingHorizontal: spacing.lg, paddingVertical: spacing.sm },
  quickRow: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
    gap: 8,
  },
  bubbleActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
    flexWrap: 'wrap',
  },
  followupChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
    backgroundColor: 'rgba(255,255,255,0.04)',
    maxWidth: 200,
  },
  followupChipText: { fontSize: 11, fontWeight: '700' },
  quickChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(124,92,255,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(124,92,255,0.3)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radius.pill,
    marginRight: 6,
  },
  quickChipText: { color: '#F2EEFF', fontSize: 12, fontWeight: '700' },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    padding: spacing.md,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.06)',
  },
  input: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: radius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    color: '#F2EEFF',
    fontSize: 14,
    maxHeight: 120,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  sendBtn: { borderRadius: radius.pill, overflow: 'hidden' },
  sendBg: {
    width: 44, height: 44,
    alignItems: 'center', justifyContent: 'center',
    borderRadius: 22,
  },
});
