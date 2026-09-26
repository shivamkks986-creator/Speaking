// JobTermsScreen — pre-interview vocabulary primer. Shows curated glossary
// for the selected track as flip-through cards. Learners land here from the
// Interview Dashboard's "Study terms" button.

import React, { useMemo, useState } from 'react';
import { View, StyleSheet, ScrollView, Pressable } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Text } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { RootStackParamList } from '@/navigation/types';
import { getJobTerms } from '@/data/jobTerms';
import { getTrackMeta } from '@/data/interviewTracks';
import { radius, spacing } from '@/config/theme';

type Nav = NativeStackNavigationProp<RootStackParamList>;
type Rt = RouteProp<RootStackParamList, 'JobTerms'>;

export default function JobTermsScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Rt>();
  const track = route.params?.track || 'hr';
  const meta = getTrackMeta(track);
  const terms = useMemo(() => getJobTerms(track), [track]);

  const [expanded, setExpanded] = useState<number | null>(0);

  return (
    <View style={{ flex: 1, backgroundColor: '#0A0418' }}>
      <LinearGradient colors={['#0A0418', '#150828', '#1F0E3D']} style={StyleSheet.absoluteFillObject} />
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        <View style={styles.header}>
          <Pressable
            onPress={() => navigation.goBack()}
            style={styles.backBtn}
            testID="job-terms-back-btn"
          >
            <Ionicons name="chevron-back" size={22} color="#F2EEFF" />
          </Pressable>
          <View style={{ flex: 1, marginLeft: spacing.md }}>
            <Text style={styles.title} numberOfLines={1}>{meta.title} Vocabulary</Text>
            <Text style={styles.subtitle}>{terms.length} terms · Tap any card to expand</Text>
          </View>
        </View>

        <ScrollView
          contentContainerStyle={{ padding: spacing.lg, paddingBottom: 120 }}
          showsVerticalScrollIndicator={false}
        >
          <LinearGradient
            colors={meta.colors}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.heroCard}
          >
            <Ionicons name={meta.icon} size={26} color="#FFFFFF" />
            <Text style={styles.heroTitle}>Master these before your interview</Text>
            <Text style={styles.heroSub}>
              Interviewers throw jargon to test depth. Skim these cards 5 minutes before your session.
            </Text>
          </LinearGradient>

          {terms.map((t, idx) => {
            const open = expanded === idx;
            return (
              <Pressable
                key={t.term}
                onPress={() => setExpanded(open ? null : idx)}
                style={[styles.termCard, open && styles.termCardOpen]}
                testID={`job-term-${idx}`}
              >
                <View style={styles.termHeader}>
                  <View style={styles.termIndex}>
                    <Text style={styles.termIndexText}>{String(idx + 1).padStart(2, '0')}</Text>
                  </View>
                  <Text style={styles.termName}>{t.term}</Text>
                  <Ionicons
                    name={open ? 'chevron-up' : 'chevron-down'}
                    size={20}
                    color="#A992FF"
                  />
                </View>
                {open && (
                  <View style={styles.termBody}>
                    <Text style={styles.termLabel}>DEFINITION</Text>
                    <Text style={styles.termDefinition}>{t.definition}</Text>
                    <Text style={[styles.termLabel, { marginTop: spacing.md }]}>INTERVIEW EXAMPLE</Text>
                    <View style={styles.exampleBox}>
                      <Text style={styles.termExample}>{t.example}</Text>
                    </View>
                  </View>
                )}
              </Pressable>
            );
          })}

          <Pressable
            style={styles.startBtn}
            onPress={() => navigation.replace('LiveInterview', { track, targetQuestions: 8 })}
            testID="job-terms-start-interview"
          >
            <LinearGradient
              colors={['#7C5CFF', '#5B3FE0']}
              style={styles.startBtnGrad}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <Ionicons name="play-circle" size={22} color="#FFFFFF" />
              <Text style={styles.startBtnText}>I'm ready — start interview</Text>
            </LinearGradient>
          </Pressable>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  title: { color: '#F2EEFF', fontSize: 17, fontWeight: '800' },
  subtitle: { color: 'rgba(242,238,255,0.5)', fontSize: 12, marginTop: 2 },
  heroCard: {
    borderRadius: radius.xl,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    alignItems: 'flex-start',
  },
  heroTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '800',
    marginTop: spacing.sm,
  },
  heroSub: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 13,
    marginTop: 4,
    lineHeight: 18,
  },
  termCard: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  termCardOpen: {
    backgroundColor: 'rgba(124,92,255,0.12)',
    borderColor: 'rgba(124,92,255,0.4)',
  },
  termHeader: { flexDirection: 'row', alignItems: 'center' },
  termIndex: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(124,92,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  termIndexText: { color: '#A992FF', fontSize: 12, fontWeight: '800' },
  termName: { flex: 1, color: '#F2EEFF', fontSize: 15, fontWeight: '700' },
  termBody: { paddingTop: spacing.md, paddingLeft: 42 },
  termLabel: {
    color: 'rgba(242,238,255,0.5)',
    fontSize: 10,
    letterSpacing: 1,
    fontWeight: '800',
  },
  termDefinition: {
    color: '#F2EEFF',
    fontSize: 14,
    lineHeight: 20,
    marginTop: 4,
  },
  exampleBox: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: radius.md,
    padding: spacing.md,
    marginTop: 4,
    borderLeftWidth: 3,
    borderLeftColor: '#7C5CFF',
  },
  termExample: {
    color: 'rgba(242,238,255,0.9)',
    fontSize: 13,
    fontStyle: 'italic',
    lineHeight: 19,
  },
  startBtn: { marginTop: spacing.lg, borderRadius: radius.xl, overflow: 'hidden' },
  startBtnGrad: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
  },
  startBtnText: { color: '#FFFFFF', fontSize: 15, fontWeight: '800' },
});
