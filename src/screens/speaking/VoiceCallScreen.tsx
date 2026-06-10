// Voice call experience screen — full-screen companion with real STT (Whisper) + real TTS (OpenAI)
import React, { useEffect, useRef, useState } from 'react';
import { View, StyleSheet, Pressable, ScrollView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Text } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';

import { useCompanion } from '@/contexts/CompanionContext';
import { useGamification } from '@/contexts/GamificationContext';
import { useProgress } from '@/contexts/ProgressContext';
import { aiService } from '@/services/aiService';
import { speechService } from '@/services/speechService';
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
  const [speed, setSpeed] = useState(1.0);
  const startedRef = useRef(Date.now());
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    tickRef.current = setInterval(() => setElapsed(Math.floor((Date.now() - startedRef.current) / 1000)), 1000);
    return () => {
      if (tickRef.current) clearInterval(tickRef.current);
      speechService.stopAudio();
    };
  }, []);

  const handleMicTap = async () => {
    if (state === 'speaking') {
      await speechService.stopAudio();
      setState('idle');
      return;
    }
    if (state === 'listening') {
      try {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        const { uri } = await speechService.stopRecording();
        if (!uri) { setState('idle'); return; }
        setState('thinking');
        const text = await speechService.transcribe(uri);
        if (!text) { setState('idle'); return; }
        setTranscript(text);
        await runAi(text);
      } catch (e) {
        console.warn('STT error', e);
        setState('idle');
      }
      return;
    }
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      await speechService.startRecording();
      setState('listening');
    } catch (e) {
      console.warn('Recording failed', e);
    }
  };

  const runAi = async (text: string) => {
    try {
      const msg = await aiService.chat(text, companion.id, companion.systemPrompt);
      setAiReply(msg.text);
      setState('speaking');
      await speechService.speakWithAI(msg.text, { companionId: companion.id, speed });
      setState('idle');
      await recordActivity(1, 'chat');
      await awardAction('CHAT_MESSAGE');
    } catch {
      setState('idle');
    }
  };

  const endCall = async () => {
    await speechService.stopAudio();
    const minutes = Math.max(1, Math.round(elapsed / 60));
    await recordActivity(minutes, 'chat');
    navigation.goBack();
  };

  const stateLabel: Record<CallState, string> = {
    idle: 'Tap mic to talk',
    listening: 'Listening... tap to send',
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
          <View style={styles.speedRow}>
            {[0.75, 1.0, 1.25].map((s) => (
              <Pressable
                key={s}
                onPress={() => setSpeed(s)}
                style={[styles.speedPill, speed === s && { backgroundColor: companion.accent }]}
                testID={`voicecall-speed-${s}`}
              >
                <Text style={[styles.speedText, speed === s && { color: '#FFFFFF' }]}>{s}x</Text>
              </Pressable>
            ))}
          </View>
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
            Real-time AI voice powered by OpenAI Whisper + premium voices. Speak naturally.
          </Text>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  endBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.08)' },
  callPill: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(52,211,153,0.15)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: radius.pill },
  callPillText: { color: '#34D399', fontWeight: '700', fontSize: 12 },
  speedRow: { flexDirection: 'row', gap: 4 },
  speedPill: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: radius.pill, backgroundColor: 'rgba(255,255,255,0.08)' },
  speedText: { color: '#F2EEFF', fontSize: 11, fontWeight: '700' },
  dot: { width: 8, height: 8, borderRadius: 4 },
  center: { alignItems: 'center', marginTop: spacing.xl, gap: spacing.sm },
  name: { color: '#F2EEFF', fontSize: 28, fontWeight: '800', marginTop: spacing.md },
  role: { color: 'rgba(242,238,255,0.7)', fontSize: 14 },
  stateChip: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(255,255,255,0.06)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: radius.pill, marginTop: spacing.sm },
  stateText: { color: '#F2EEFF', fontSize: 12, fontWeight: '700' },
  bubble: { backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: radius.lg, padding: spacing.md, marginBottom: spacing.sm, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
  bubbleLabel: { color: 'rgba(242,238,255,0.6)', fontSize: 11, fontWeight: '700', marginBottom: 4 },
  bubbleText: { color: '#F2EEFF', fontSize: 14, lineHeight: 20 },
  bottom: { alignItems: 'center', paddingHorizontal: spacing.lg, paddingBottom: spacing.md },
  hint: { color: 'rgba(242,238,255,0.5)', fontSize: 11, textAlign: 'center', marginTop: spacing.sm, paddingHorizontal: spacing.lg },
});
