// Flashcards screen — swipeable vocabulary flashcards with AI lookup
import React, { useEffect, useState, useCallback, useRef } from 'react';
import { View, StyleSheet, Pressable, ScrollView, ActivityIndicator, Animated , Platform, StatusBar } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Text } from 'react-native-paper';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';

import { useGamification } from '@/contexts/GamificationContext';
import { speechService } from '@/services/speechService';
import { radius, spacing } from '@/config/theme';

const WORDS = [
  { word: 'Articulate', level: 'intermediate' },
  { word: 'Resilient', level: 'intermediate' },
  { word: 'Diligent', level: 'intermediate' },
  { word: 'Ambiguous', level: 'advanced' },
  { word: 'Pragmatic', level: 'advanced' },
  { word: 'Concise', level: 'beginner' },
  { word: 'Enthusiastic', level: 'beginner' },
  { word: 'Innovative', level: 'intermediate' },
];

interface CardData {
  word: string;
  partOfSpeech: string;
  definition: string;
  hindi: string;
  example: string;
  level: string;
}

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL || '';
const AI = BACKEND_URL ? `${BACKEND_URL.replace(/\/$/, '')}/api/ai` : '';

export default function FlashcardsScreen() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { awardAction } = useGamification();
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [card, setCard] = useState<CardData | null>(null);
  const [loading, setLoading] = useState(true);
  const flip = useRef(new Animated.Value(0)).current;

  const fetchCard = useCallback(async (wordIdx: number) => {
    const wordItem = WORDS[wordIdx % WORDS.length];
    setLoading(true);
    setFlipped(false);
    flip.setValue(0);
    try {
      const res = await fetch(`${AI}/vocabulary/lookup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ word: wordItem.word }),
      });
      const data = await res.json();
      setCard({ ...data, level: wordItem.level });
    } catch {
      setCard({
        word: wordItem.word,
        partOfSpeech: '—',
        definition: 'Could not load definition. Check connection.',
        hindi: '',
        example: '',
        level: wordItem.level,
      });
    } finally {
      setLoading(false);
    }
  }, [flip]);

  useEffect(() => {
    fetchCard(index);
  }, [index, fetchCard]);

  const onFlip = () => {
    const next = !flipped;
    setFlipped(next);
    Animated.spring(flip, {
      toValue: next ? 180 : 0,
      damping: 12,
      useNativeDriver: true,
    }).start();
  };

  const onNext = async () => {
    await awardAction('VOCAB_WORD_LEARNED');
    setIndex((i) => i + 1);
  };

  const frontRotate = flip.interpolate({ inputRange: [0, 180], outputRange: ['0deg', '180deg'] });
  const backRotate = flip.interpolate({ inputRange: [0, 180], outputRange: ['180deg', '360deg'] });
  const frontOpacity = flip.interpolate({ inputRange: [0, 89, 90, 180], outputRange: [1, 1, 0, 0] });
  const backOpacity = flip.interpolate({ inputRange: [0, 89, 90, 180], outputRange: [0, 0, 1, 1] });
  const frontStyle = { transform: [{ perspective: 1000 }, { rotateY: frontRotate }], opacity: frontOpacity };
  const backStyle = { transform: [{ perspective: 1000 }, { rotateY: backRotate }], opacity: backOpacity };

  return (
    <View style={{ flex: 1, backgroundColor: '#0A0418' }}>
      <LinearGradient colors={['#0A0418', '#150828', '#1F0E3D']} style={StyleSheet.absoluteFillObject} />
      <SafeAreaView style={{ flex: 1 }} edges={['left', 'right']}>
        <View style={[styles.header, { paddingTop: Math.max(insets.top, StatusBar.currentHeight ?? 0, 48) + 16 }]}>
          <Pressable onPress={() => navigation.goBack()} style={styles.backBtn} testID="flashcards-back">
            <Ionicons name="chevron-back" size={22} color="#F2EEFF" />
          </Pressable>
          <Text style={styles.title}>Flashcards</Text>
          <Text style={styles.counter}>{(index % WORDS.length) + 1}/{WORDS.length}</Text>
        </View>

        <View style={styles.center}>
          {loading ? (
            <ActivityIndicator color="#A992FF" size="large" />
          ) : (
            <Pressable onPress={onFlip} style={{ width: '100%' }} testID="flashcard-flip">
              <View style={styles.cardWrap}>
                <Animated.View style={[styles.card, frontStyle]}>
                  <LinearGradient colors={['#7C5CFF', '#FF6B9D']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.cardBg}>
                    <View style={styles.cardChip}>
                      <Text style={styles.cardChipText}>{card?.level}</Text>
                    </View>
                    <Text style={styles.cardWord}>{card?.word}</Text>
                    <Text style={styles.cardPos}>{card?.partOfSpeech}</Text>
                    <Pressable
                      onPress={(e) => { e.stopPropagation(); speechService.speakWithAI(card?.word || '', { companionId: 'emma' }); }}
                      style={styles.speakBtn}
                      testID="flashcard-speak"
                    >
                      <Ionicons name="volume-high" size={22} color="#FFFFFF" />
                    </Pressable>
                    <Text style={styles.cardHint}>Tap to flip</Text>
                  </LinearGradient>
                </Animated.View>
                <Animated.View style={[styles.card, styles.cardBack, backStyle]}>
                  <LinearGradient colors={['#22D3EE', '#34D399']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.cardBg}>
                    <Text style={styles.cardBackLabel}>Definition</Text>
                    <Text style={styles.cardBackText}>{card?.definition}</Text>
                    {card?.hindi ? (
                      <>
                        <Text style={styles.cardBackLabel}>Hindi</Text>
                        <Text style={styles.cardBackText}>{card.hindi}</Text>
                      </>
                    ) : null}
                    {card?.example ? (
                      <>
                        <Text style={styles.cardBackLabel}>Example</Text>
                        <Text style={[styles.cardBackText, { fontStyle: 'italic' }]}>"{card.example}"</Text>
                      </>
                    ) : null}
                  </LinearGradient>
                </Animated.View>
              </View>
            </Pressable>
          )}

          <View style={styles.actions}>
            <Pressable onPress={onNext} style={styles.actionBtn} testID="flashcard-next">
              <LinearGradient colors={['#7C5CFF', '#A992FF']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.actionBg}>
                <Ionicons name="checkmark-circle" size={18} color="#FFFFFF" />
                <Text style={styles.actionText}>I Know This (+10 XP)</Text>
              </LinearGradient>
            </Pressable>
          </View>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  backBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.06)' },
  title: { color: '#F2EEFF', fontSize: 18, fontWeight: '800' },
  counter: { color: 'rgba(242,238,255,0.7)', fontSize: 13, fontWeight: '700' },
  center: { flex: 1, padding: spacing.lg, justifyContent: 'center' },
  cardWrap: { width: '100%', aspectRatio: 0.8, position: 'relative' },
  card: { ...StyleSheet.absoluteFillObject, backfaceVisibility: 'hidden', borderRadius: radius.xxl, overflow: 'hidden' },
  cardBack: {},
  cardBg: { flex: 1, padding: spacing.xl, alignItems: 'center', justifyContent: 'center', gap: spacing.md },
  cardChip: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: radius.pill, backgroundColor: 'rgba(0,0,0,0.25)', alignSelf: 'center' },
  cardChipText: { color: '#FFFFFF', fontSize: 10, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 1 },
  cardWord: { color: '#FFFFFF', fontSize: 42, fontWeight: '800', textAlign: 'center' },
  cardPos: { color: 'rgba(255,255,255,0.85)', fontSize: 14, fontStyle: 'italic' },
  speakBtn: { width: 56, height: 56, borderRadius: 28, backgroundColor: 'rgba(0,0,0,0.3)', alignItems: 'center', justifyContent: 'center', marginTop: spacing.lg },
  cardHint: { color: 'rgba(255,255,255,0.6)', fontSize: 11, marginTop: spacing.md },
  cardBackLabel: { color: 'rgba(255,255,255,0.75)', fontSize: 11, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 1, alignSelf: 'flex-start' },
  cardBackText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600', alignSelf: 'flex-start' },
  actions: { marginTop: spacing.xl },
  actionBtn: { borderRadius: radius.pill, overflow: 'hidden' },
  actionBg: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 16 },
  actionText: { color: '#FFFFFF', fontWeight: '800', fontSize: 14 },
});
