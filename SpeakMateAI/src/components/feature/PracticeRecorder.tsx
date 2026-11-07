// Mic button + status line shared by Roadmap day practice and Accent practice.
import React from 'react';
import { View, Pressable, StyleSheet, ActivityIndicator } from 'react-native';
import { Text } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { RecPhase } from '@/hooks/useVoiceRecorder';

interface Props {
  phase: RecPhase;
  evaluating: boolean;
  seconds: number;
  onStart: () => void;
  onStop: () => void;
  testID: string;
}

export function PracticeRecorder({ phase, evaluating, seconds, onStart, onStop, testID }: Props) {
  const busy = phase === 'transcribing' || evaluating;
  const label = phase === 'recording'
    ? `Recording… ${seconds}s · tap to stop`
    : phase === 'transcribing' ? 'Listening to your recording…'
    : evaluating ? 'AI is reviewing…' : 'Tap the mic and speak';
  return (
    <View style={styles.wrap}>
      <Pressable onPress={phase === 'recording' ? onStop : onStart} disabled={busy} testID={testID}>
        <LinearGradient
          colors={phase === 'recording' ? ['#FF6B9D', '#7C5CFF'] : ['#7C5CFF', '#A992FF']}
          style={[styles.btn, busy && { opacity: 0.6 }]}
        >
          {busy ? <ActivityIndicator color="#fff" /> : <Ionicons name={phase === 'recording' ? 'stop' : 'mic'} size={34} color="#fff" />}
        </LinearGradient>
      </Pressable>
      <Text style={styles.label} testID={`${testID}-status`}>{label}</Text>
    </View>
  );
}

export function ScoreBar({ label, value, testID }: { label: string; value: number; testID?: string }) {
  const color = value >= 75 ? '#34D399' : value >= 50 ? '#FACC15' : '#FF6B9D';
  return (
    <View style={{ marginTop: 10 }} testID={testID}>
      <View style={styles.barHead}>
        <Text style={styles.barLabel}>{label}</Text>
        <Text style={[styles.barLabel, { color }]}>{value}/100</Text>
      </View>
      <View style={styles.track}><View style={[styles.fill, { width: `${value}%`, backgroundColor: color }]} /></View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', marginVertical: 16, gap: 10 },
  btn: { width: 88, height: 88, borderRadius: 44, alignItems: 'center', justifyContent: 'center', elevation: 8 },
  label: { color: 'rgba(242,238,255,0.75)', fontSize: 12, fontWeight: '700' },
  barHead: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  barLabel: { color: '#F2EEFF', fontSize: 12, fontWeight: '700' },
  track: { height: 7, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.08)', overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 4 },
});
