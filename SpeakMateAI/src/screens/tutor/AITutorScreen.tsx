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
} from 'react-native';
import { Text, ActivityIndicator } from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import Animated, { FadeIn, FadeInUp } from 'react-native-reanimated';

import { ChatMessage } from '@/types';
import { aiService } from '@/services/aiService';
import { speechService } from '@/services/speechService';
import { useProgress } from '@/contexts/ProgressContext';
import { useCompanion } from '@/contexts/CompanionContext';
import { useGamification } from '@/contexts/GamificationContext';
import { randomId } from '@/utils/helpers';
import CompanionAvatar from '@/components/feature/CompanionAvatar';
import { radius, spacing } from '@/config/theme';

export default function AITutorScreen() {
  const navigation = useNavigation();
  const { recordActivity } = useProgress();
  const { companion } = useCompanion();
  const { awardAction } = useGamification();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [thinking, setThinking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const listRef = useRef<FlatList<ChatMessage>>(null);

  // Reset chat session when companion changes
  useEffect(() => {
    aiService.resetTutorSession?.();
    setMessages([]);
  }, [companion.id]);

  const onSend = useCallback(async (overrideText?: string) => {
    const text = (overrideText ?? input).trim();
    if (!text || thinking) return;
    const userMsg: ChatMessage = {
      id: randomId(),
      role: 'user',
      text,
      timestamp: Date.now(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setThinking(true);
    setError(null);
    try {
      const reply = await aiService.chat(text, companion.id, companion.systemPrompt);
      setMessages((prev) => [...prev, reply]);
      recordActivity(1, 'chat').catch(() => {});
      awardAction('CHAT_MESSAGE').catch(() => {});
      requestAnimationFrame(() => listRef.current?.scrollToEnd({ animated: true }));
    } catch {
      setError('Could not reach the AI tutor. Try again.');
    } finally {
      setThinking(false);
    }
  }, [input, thinking, recordActivity, awardAction, companion.id, companion.systemPrompt]);

  const onClear = useCallback(() => {
    setMessages([]);
    setError(null);
    aiService.resetTutorSession?.();
  }, []);

  return (
    <View style={{ flex: 1, backgroundColor: '#0A0418' }}>
      <LinearGradient colors={['#0A0418', '#150828', '#1F0E3D']} style={StyleSheet.absoluteFillObject} />
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        {/* Header */}
        <View style={styles.header}>
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

        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={64}
        >
          {messages.length === 0 ? (
            <View style={styles.welcome}>
              <CompanionAvatar companion={companion} size={84} showRing />
              <Text style={styles.welcomeTitle}>{companion.greeting}</Text>
              <Text style={styles.welcomeSub}>
                Type in English or Hindi — I'll fix grammar and suggest natural phrasing.
              </Text>
              <View style={styles.starterRow}>
                {STARTERS.map((s) => (
                  <Pressable key={s} onPress={() => setInput(s)} style={styles.starter} testID={`tutor-starter-${s.slice(0, 8)}`}>
                    <Text style={styles.starterText}>{s}</Text>
                  </Pressable>
                ))}
              </View>
            </View>
          ) : (
            <FlatList
              ref={listRef}
              data={messages}
              keyExtractor={(m) => m.id}
              renderItem={({ item, index }) => <Bubble msg={item} companion={companion} index={index} />}
              contentContainerStyle={styles.list}
              onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
            />
          )}

          {thinking && (
            <Animated.View entering={FadeIn.duration(200)} style={styles.thinkingRow}>
              <CompanionAvatar companion={companion} size={28} />
              <View style={styles.typingBubble}>
                <View style={styles.typingDot} />
                <View style={styles.typingDot} />
                <View style={styles.typingDot} />
              </View>
            </Animated.View>
          )}

          {error && (
            <View style={styles.errorBar}>
              <Text style={{ color: '#FF6B6B', fontSize: 13 }}>{error}</Text>
            </View>
          )}

          {/* Quick action chips — auto-send the prompt for instant feedback */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.quickRow}
            keyboardShouldPersistTaps="handled"
          >
            {[
              { icon: 'construct' as const, label: 'Fix my grammar', prompt: 'Please correct the grammar of my recent message and explain the mistakes.' },
              { icon: 'sparkles' as const, label: 'Improve sentence', prompt: 'Suggest a more natural, advanced way to say my last message.' },
              { icon: 'book' as const, label: 'Explain meaning', prompt: 'Explain the meaning of any difficult word I used recently, with examples.' },
              { icon: 'language' as const, label: 'Translate Hindi → English', prompt: 'Help me translate Hindi to English. Ask me what sentence I want to translate.' },
              { icon: 'briefcase' as const, label: 'Interview prep', prompt: 'Ask me one common HR interview question. I will answer.' },
              { icon: 'chatbubbles' as const, label: 'Daily conversation', prompt: "Let's have a casual English conversation. Start with a fun question." },
            ].map((q) => (
              <Pressable
                key={q.label}
                onPress={() => onSend(q.prompt)}
                disabled={thinking}
                style={({ pressed }) => [styles.quickChip, pressed && { opacity: 0.6 }]}
                testID={`tutor-quick-${q.label.split(' ')[0].toLowerCase()}`}
              >
                <Ionicons name={q.icon} size={14} color="#A992FF" />
                <Text style={styles.quickChipText}>{q.label}</Text>
              </Pressable>
            ))}
          </ScrollView>

          <View style={styles.inputBar}>
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
    </View>
  );
}

const STARTERS = [
  'How are you today?',
  'मुझे interview की तैयारी करनी है',
  'Teach me a new word',
];

function Bubble({ msg, companion, index }: { msg: ChatMessage; companion: ReturnType<typeof useCompanion>['companion']; index: number }) {
  const isUser = msg.role === 'user';
  const onSpeak = () => {
    speechService.speakWithAI(msg.text, { companionId: companion.id });
  };
  return (
    <Animated.View
      entering={FadeInUp.delay(index * 30).duration(250)}
      style={[styles.bubbleRow, isUser && { justifyContent: 'flex-end' }]}
    >
      {!isUser && <CompanionAvatar companion={companion} size={28} style={{ marginRight: 8 }} />}
      <View style={{ maxWidth: '78%' }}>
        {isUser ? (
          <LinearGradient
            colors={companion.gradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[styles.bubble, styles.bubbleUser]}
          >
            <Text style={styles.bubbleTextUser}>{msg.text}</Text>
          </LinearGradient>
        ) : (
          <View style={[styles.bubble, styles.bubbleAi]}>
            <Text style={styles.bubbleTextAi}>{msg.text}</Text>
            {msg.correction && (
              <View style={styles.metaCard}>
                <Ionicons name="checkmark-circle" size={14} color="#34D399" />
                <Text style={styles.metaText}>{msg.correction}</Text>
              </View>
            )}
            {msg.suggestion && (
              <View style={[styles.metaCard, { borderColor: 'rgba(250,204,21,0.3)' }]}>
                <Ionicons name="bulb" size={14} color="#FACC15" />
                <Text style={styles.metaText}>{msg.suggestion}</Text>
              </View>
            )}
            <Pressable onPress={onSpeak} style={styles.speakBtn} testID={`tutor-speak-${msg.id}`}>
              <Ionicons name="volume-high" size={12} color={companion.accent} />
              <Text style={[styles.speakBtnText, { color: companion.accent }]}>Play</Text>
            </Pressable>
          </View>
        )}
      </View>
    </Animated.View>
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
  headerSub: { color: 'rgba(242,238,255,0.6)', fontSize: 11 },
  dot: { width: 6, height: 6, borderRadius: 3 },
  iconCircle: {
    width: 36, height: 36, borderRadius: 18,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  welcome: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.lg, gap: spacing.md },
  welcomeTitle: { color: '#F2EEFF', fontSize: 18, fontWeight: '800', textAlign: 'center', marginTop: spacing.md },
  welcomeSub: { color: 'rgba(242,238,255,0.6)', fontSize: 13, textAlign: 'center' },
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
