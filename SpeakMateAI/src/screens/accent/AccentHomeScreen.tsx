// Accent Improvement — pick Indian / American / British mode + see progress per mode.
import React, { useCallback, useState } from 'react';
import { View, StyleSheet, ScrollView, Pressable, ActivityIndicator } from 'react-native';
import { Text } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { RootStackParamList } from '@/navigation/types';
import { ACCENTS } from '@/data/accentContent';
import { practiceService, AccentHistory } from '@/services/practiceService';
import { useScreenInsets } from '@/hooks/useScreenInsets';
import { radius, spacing } from '@/config/theme';

type Nav = NativeStackNavigationProp<RootStackParamList>;

export default function AccentHomeScreen() {
  const navigation = useNavigation<Nav>();
  const { headerPaddingTop } = useScreenInsets();
  const [history, setHistory] = useState<AccentHistory | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useFocusEffect(useCallback(() => {
    setError(false);
    practiceService.accentHistory()
      .then(setHistory)
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, []));

  return (
    <View style={{ flex: 1, backgroundColor: '#0A0418' }}>
      <LinearGradient colors={['#1F0E3D', '#0A0418', '#150828']} style={StyleSheet.absoluteFillObject} />
      <ScrollView contentContainerStyle={{ paddingBottom: 100, paddingTop: headerPaddingTop }}>
        <View style={styles.header}>
          <Pressable onPress={() => navigation.goBack()} style={styles.iconBtn} testID="accent-home-back-btn">
            <Ionicons name="chevron-back" size={20} color="#F2EEFF" />
          </Pressable>
          <View style={{ flex: 1, marginLeft: spacing.md }}>
            <Text style={styles.title}>Accent Improvement</Text>
            <Text style={styles.subtitle}>Lessons · Listen & Repeat · AI feedback</Text>
          </View>
        </View>

        <View style={styles.statsRow} testID="accent-home-stats">
          {loading ? <ActivityIndicator color="#A992FF" /> : error ? (
            <Text style={styles.dim}>Could not load your history. Pull back in to retry.</Text>
          ) : (
            <Text style={styles.dim}>
              {history?.attempts ? `${history.attempts} practice attempts so far` : 'No attempts yet — pick a mode to start.'}
            </Text>
          )}
        </View>

        {ACCENTS.map((a) => {
          const avg = history?.average?.[a.id];
          const best = history?.best?.[a.id];
          return (
            <Pressable key={a.id} onPress={() => navigation.navigate('AccentPractice', { accent: a.id })} style={[styles.card, { borderColor: `${a.color}55` }]} testID={`accent-mode-${a.id}`}>
              <View style={[styles.badge, { backgroundColor: `${a.color}25` }]}>
                <Ionicons name="mic" size={22} color={a.color} />
              </View>
              <View style={{ flex: 1, marginLeft: spacing.md }}>
                <Text style={styles.cardTitle}>{a.label}</Text>
                <Text style={styles.dim}>{a.tagline}</Text>
                {typeof avg === 'number' ? (
                  <Text style={[styles.meta, { color: a.color }]} testID={`accent-mode-${a.id}-stats`}>Avg {avg} · Best {best}</Text>
                ) : null}
              </View>
              <Ionicons name="chevron-forward" size={20} color="#F2EEFF" />
            </Pressable>
          );
        })}

        <Text style={styles.note}>
          Feedback is based on what our speech recogniser understood from your recording plus AI review of your words and pace. It is not phoneme-level audio analysis.
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.lg, paddingBottom: spacing.md },
  iconBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: 'rgba(255,255,255,0.06)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center' },
  title: { color: '#F2EEFF', fontSize: 20, fontWeight: '800' },
  subtitle: { color: '#A992FF', fontSize: 12, fontWeight: '700', marginTop: 2 },
  statsRow: { paddingHorizontal: spacing.lg, marginBottom: spacing.md },
  card: { flexDirection: 'row', alignItems: 'center', marginHorizontal: spacing.lg, marginBottom: spacing.md, padding: spacing.md, borderRadius: radius.lg, borderWidth: 1, backgroundColor: 'rgba(255,255,255,0.04)' },
  badge: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  cardTitle: { color: '#F2EEFF', fontSize: 16, fontWeight: '800' },
  meta: { fontSize: 12, fontWeight: '800', marginTop: 4 },
  dim: { color: 'rgba(242,238,255,0.65)', fontSize: 12, marginTop: 2 },
  note: { color: 'rgba(242,238,255,0.45)', fontSize: 11, fontStyle: 'italic', marginHorizontal: spacing.lg, marginTop: spacing.md, lineHeight: 16 },
});
