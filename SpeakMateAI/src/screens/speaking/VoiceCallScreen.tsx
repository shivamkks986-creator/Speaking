// Voice call experience screen — full-screen companion with mic + STT/TTS placeholder
import React, { useEffect, useRef, useState } from 'react';
import { View, StyleSheet, Pressable, ScrollView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Text } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import * as Speech from 'expo-speech';
import * as Haptics from 'expo-haptics';

import { useCompanion } from '@/contexts/CompanionContext';
import { useGamification } from '@/contexts/GamificationContext';
import { useProgress } from '@/contexts/ProgressContext';
import { aiService } from '@/services/aiService';
import CompanionAvatar from '@/components/feature/CompanionAvatar';
import VoiceMicButton from '@/components/feature/VoiceMicButton';
import { radius, spacing } from '@/config/theme';

type CallState = 'idle' | 'listening' | 'thinking' | 'speaking';

export default function VoiceCallScreen() {
  const navigation = useNavigation();
  const { companion } = useCompanion();
  const { awardAction } = useGamification();
  const { recordActivity } = useProgress();
  const [state, setState] = useState<CallState>('idle');
  const [transcript, setTranscript] = useState('');
  const [aiReply, setAiReply] = useState('');
  const [elapsed, setElapsed] = useState(0);
  const startedRef = useRef(Date.now());
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    tickRef.current = setInterval(() => setElapsed(Math.floor((Date.now() - startedRef.current) / 1000)), 1000);
    return () => {
      if (tickRef.current) clearInterval(tickRef.current);
      Speech.stop();
    };
  }, []);

  // Note: Real STT is not available in Expo Go without a dev build (expo-speech-recognition needs native).
  // For now we simulate with a tap: user taps mic, we use a sample prompt and call the AI.
  const handleMicTap = async () => {
    if (state === 'speaking') {
      Speech.stop();
      setState('idle');
      return;
    }
    if (state === 'idle') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      setState('listening');
      // simulate listening for 1.5s
      setTimeout(() => {
        const sample = pickSample();
        setTranscript(sample);
        runAi(sample);
      }, 1500);
    }
  };

  const runAi = async (text: string) => {
    setState('thinking');
    try {
      const msg = await aiService.chat(text);
      setAiReply(msg.text);
      setState('speaking');
      Speech.speak(msg.text, {
        rate: 1,
        pitch: 1,
        onDone: () => setState('idle'),
        onStopped: () => setState('idle'),
      });
      await recordActivity(1, 'chat');
      await awardAction('CHAT_MESSAGE');
    } catch {
      setState('idle');
    }
  };

  const endCall = async () => {
    Speech.stop();
    const minutes = Math.max(1, Math.round(elapsed / 60));
    await recordActivity(minutes, 'chat');
    navigation.goBack();
  };

  const stateLabel: Record<CallState, string> = {
    idle: 'Tap mic to start',
    listening: 'Listening...',
    thinking: 'Thinking...',
    speaking: 'Speaking',
  };

  const fmt = (s: number) => `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`;

  return (
    <View style={{ flex: 1, backgroundColor: '#0A0418' }}>
      <LinearGradient
        colors={[`${companion.accent}55`, '#0A0418', '#1F0E3D']}
        style={StyleSheet.absoluteFillObject}
      />
      <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
        <View style={styles.header}>
          <Pressable onPress={endCall} style={styles.endBtn} testID="voicecall-end-btn">
            <Ionicons name="close" size={22} color="#F2EEFF" />
          </Pressable>
          <View style={styles.callPill}>
            <View style={[styles.dot, { backgroundColor: '#34D399' }]} />
            <Text style={styles.callPillText}>{fmt(elapsed)}</Text>
          </View>
          <View style={{ width: 36 }} />
        </View>

        <View style={styles.center}>
          <CompanionAvatar companion={companion} size={160} showRing state={state} />
          <Text style={styles.name}>{companion.name}</Text>
          <Text style={styles.role}>{companion.role}</Text>
          <View style={styles.stateChip}>
            <View style={[styles.dot, { backgroundColor: state === 'listening' ? '#22D3EE' : state === 'speaking' ? '#34D399' : state === 'thinking' ? '#FACC15' : '#9C8FFF' }]} />
            <Text style={styles.stateText}>{stateLabel[state]}</Text>
          </View>
        </View>

        <ScrollView style={{ maxHeight: 200 }} contentContainerStyle={{ padding: spacing.lg }}>
          {transcript ? (
            <View style={styles.bubble}>
              <Text style={styles.bubbleLabel}>You</Text>
              <Text style={styles.bubbleText}>{transcript}</Text>
            </View>
          ) : null}
          {aiReply ? (
            <View style={[styles.bubble, { backgroundColor: `${companion.accent}25`, borderColor: `${companion.accent}55` }]}>
              <Text style={[styles.bubbleLabel, { color: companion.accent }]}>{companion.name}</Text>
              <Text style={styles.bubbleText}>{aiReply}</Text>
            </View>
          ) : null}
        </ScrollView>

        <View style={styles.bottom}>
          <VoiceMicButton onPress={handleMicTap} recording={state === 'listening'} state={state} />
          <Text style={styles.hint}>
            Note: Voice recognition needs a dev build. Tapping mic uses a sample prompt to demo the AI voice call flow.
          </Text>
        </View>
      </SafeAreaView>
    </View>
  );
}

const SAMPLES = [
  'Hi, how are you today?',
  'Can you help me improve my English speaking?',
  'I want to practice for a job interview next week.',
  'Tell me about your day.',
  'What is the best way to learn new vocabulary?',
];
const pickSample = () => SAMPLES[Math.floor(Math.random() * SAMPLES.length)];

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  endBtn: {
    width: 36, height: 36, borderRadius: 18,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  callPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(52,211,153,0.15)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.pill,
  },
  callPillText: { color: '#34D399', fontWeight: '700', fontSize: 12 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  center: { alignItems: 'center', marginTop: spacing.xl, gap: spacing.sm },
  name: { color: '#F2EEFF', fontSize: 28, fontWeight: '800', marginTop: spacing.md },
  role: { color: 'rgba(242,238,255,0.7)', fontSize: 14 },
  stateChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.06)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.pill,
    marginTop: spacing.sm,
  },
  stateText: { color: '#F2EEFF', fontSize: 12, fontWeight: '700' },
  bubble: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  bubbleLabel: { color: 'rgba(242,238,255,0.6)', fontSize: 11, fontWeight: '700', marginBottom: 4 },
  bubbleText: { color: '#F2EEFF', fontSize: 14, lineHeight: 20 },
  bottom: { alignItems: 'center', paddingHorizontal: spacing.lg, paddingBottom: spacing.md },
  hint: { color: 'rgba(242,238,255,0.5)', fontSize: 11, textAlign: 'center', marginTop: spacing.sm, paddingHorizontal: spacing.lg },
});
