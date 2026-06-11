// Word of the Day — rotates daily from a curated list, calls backend if available
import React, { useEffect, useMemo, useState } from 'react';
import { View, StyleSheet, Pressable, Alert } from 'react-native';
import { Text } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

import { radius, spacing } from '@/config/theme';
import { todayKey } from '@/utils/helpers';

interface Word {
  word: string;
  phonetic: string;
  meaning: string;
  usage: string;
}

const CURATED: Word[] = [
  { word: 'Eloquent', phonetic: '/ˈɛləkwənt/', meaning: 'Fluent and persuasive in speaking or writing', usage: 'She gave an eloquent speech about leadership.' },
  { word: 'Resilient', phonetic: '/rɪˈzɪlɪənt/', meaning: 'Able to recover quickly from difficulties', usage: 'Resilient people thrive in tough times.' },
  { word: 'Articulate', phonetic: '/ɑːˈtɪkjʊlət/', meaning: 'Express thoughts clearly and effectively', usage: 'He is an articulate communicator at work.' },
  { word: 'Diligent', phonetic: '/ˈdɪlɪdʒənt/', meaning: 'Showing care and effort in work or duties', usage: 'A diligent student finishes assignments on time.' },
  { word: 'Pragmatic', phonetic: '/præɡˈmætɪk/', meaning: 'Practical and sensible approach to problems', usage: 'We need a pragmatic solution, not a perfect one.' },
  { word: 'Ambitious', phonetic: '/æmˈbɪʃəs/', meaning: 'Having strong desire to succeed', usage: 'She has ambitious career goals for next year.' },
  { word: 'Empathy', phonetic: '/ˈɛmpəθi/', meaning: 'Ability to understand others’ feelings', usage: 'Great leaders show empathy to their team.' },
  { word: 'Innovative', phonetic: '/ˈɪnəveɪtɪv/', meaning: 'Featuring new methods; original and creative', usage: 'The startup launched an innovative product.' },
  { word: 'Persistent', phonetic: '/pəˈsɪstənt/', meaning: 'Continuing firmly despite difficulty', usage: 'Persistent effort beats raw talent.' },
  { word: 'Adept', phonetic: '/əˈdɛpt/', meaning: 'Very skilled or proficient at something', usage: 'She is adept at public speaking.' },
];

export default function WordOfTheDayCard() {
  const [word, setWord] = useState<Word>(CURATED[0]);

  const todayIndex = useMemo(() => {
    // Pick word deterministically by day
    const dayNum = parseInt(todayKey().replace(/-/g, ''), 10);
    return dayNum % CURATED.length;
  }, []);

  useEffect(() => {
    setWord(CURATED[todayIndex]);
  }, [todayIndex]);

  const onShare = () => {
    Alert.alert(
      '📚 ' + word.word,
      `${word.phonetic}\n\n${word.meaning}\n\nUsage:\n${word.usage}`,
      [{ text: 'Got it' }]
    );
  };

  return (
    <Pressable onPress={onShare} testID="home-word-of-the-day">
      <LinearGradient
        colors={['rgba(34,211,238,0.16)', 'rgba(124,92,255,0.08)']}
        style={styles.card}
      >
        <View style={styles.head}>
          <View style={styles.tag}>
            <Ionicons name="book" size={12} color="#22D3EE" />
            <Text style={styles.tagText}>WORD OF THE DAY</Text>
          </View>
          <Ionicons name="volume-medium" size={16} color="rgba(242,238,255,0.5)" />
        </View>

        <Text style={styles.word}>{word.word}</Text>
        <Text style={styles.phonetic}>{word.phonetic}</Text>
        <Text style={styles.meaning} numberOfLines={2}>{word.meaning}</Text>
        <View style={styles.usageWrap}>
          <Text style={styles.usageLabel}>Usage</Text>
          <Text style={styles.usage} numberOfLines={2}>"{word.usage}"</Text>
        </View>
      </LinearGradient>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.xl,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: 'rgba(34,211,238,0.25)',
    marginTop: spacing.lg,
  },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(34,211,238,0.15)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: 'rgba(34,211,238,0.3)',
  },
  tagText: { color: '#22D3EE', fontWeight: '800', fontSize: 10, letterSpacing: 0.5 },
  word: { color: '#F2EEFF', fontWeight: '900', fontSize: 28, marginTop: spacing.md },
  phonetic: { color: 'rgba(242,238,255,0.55)', fontSize: 13, marginTop: 2, fontStyle: 'italic' },
  meaning: { color: '#F2EEFF', fontSize: 14, marginTop: spacing.sm, lineHeight: 20 },
  usageWrap: { marginTop: spacing.md, paddingTop: spacing.sm, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.08)' },
  usageLabel: { color: 'rgba(242,238,255,0.5)', fontSize: 10, fontWeight: '800', letterSpacing: 0.5 },
  usage: { color: 'rgba(242,238,255,0.85)', fontSize: 13, fontStyle: 'italic', marginTop: 4, lineHeight: 18 },
});
