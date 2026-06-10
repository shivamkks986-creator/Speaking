import React from 'react';
import { View, StyleSheet, ScrollView, Pressable } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Text } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Animated, { FadeInUp } from 'react-native-reanimated';

import { useCompanion } from '@/contexts/CompanionContext';
import { useAuth } from '@/contexts/AuthContext';
import { RootStackParamList } from '@/navigation/types';
import CompanionAvatar from '@/components/feature/CompanionAvatar';
import { radius, spacing } from '@/config/theme';

type Nav = NativeStackNavigationProp<RootStackParamList>;

export default function CompanionsScreen() {
  const { companions, companion: selected, selectCompanion } = useCompanion();
  const { user } = useAuth();
  const navigation = useNavigation<Nav>();

  return (
    <View style={{ flex: 1, backgroundColor: '#0A0418' }}>
      <LinearGradient colors={['#0A0418', '#150828', '#1F0E3D']} style={StyleSheet.absoluteFillObject} />
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        <View style={styles.header}>
          <Pressable onPress={() => navigation.goBack()} style={styles.backBtn} testID="companions-back-btn">
            <Ionicons name="chevron-back" size={22} color="#F2EEFF" />
          </Pressable>
          <Text style={styles.title}>AI Companions</Text>
          <View style={{ width: 36 }} />
        </View>
        <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: 140 }} showsVerticalScrollIndicator={false}>
          <Text style={styles.subtitle}>
            Pick the companion that matches your goal. Switch anytime.
          </Text>
          {companions.map((c, i) => {
            const active = c.id === selected.id;
            const locked = c.isPremium && !user?.isPremium;
            return (
              <Animated.View key={c.id} entering={FadeInUp.delay(i * 80).duration(400)}>
                <Pressable
                  onPress={() => {
                    if (locked) {
                      navigation.navigate('Premium');
                      return;
                    }
                    selectCompanion(c.id);
                  }}
                  style={[styles.card, active && { borderColor: c.accent, borderWidth: 2 }]}
                  testID={`companion-card-${c.id}`}
                >
                  <View style={styles.row}>
                    <CompanionAvatar companion={c} size={64} showRing={active} />
                    <View style={{ flex: 1, marginLeft: spacing.md }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Text style={styles.name}>{c.name}</Text>
                        {locked && (
                          <View style={styles.lockChip}>
                            <Ionicons name="lock-closed" size={10} color="#FACC15" />
                            <Text style={styles.lockText}>Premium</Text>
                          </View>
                        )}
                      </View>
                      <Text style={styles.role}>{c.role}</Text>
                      <Text style={styles.tagline} numberOfLines={2}>
                        {c.tagline}
                      </Text>
                    </View>
                    {active && (
                      <View style={[styles.activePill, { backgroundColor: c.accent }]}>
                        <Ionicons name="checkmark" size={14} color="#FFFFFF" />
                      </View>
                    )}
                  </View>
                  <View style={styles.tagsRow}>
                    {c.personality.slice(0, 3).map((p) => (
                      <View key={p} style={styles.tag}>
                        <Text style={styles.tagText}>{p}</Text>
                      </View>
                    ))}
                    <View style={[styles.tag, { backgroundColor: 'rgba(124,92,255,0.2)' }]}>
                      <Ionicons name="trending-up" size={11} color="#A992FF" />
                      <Text style={[styles.tagText, { color: '#A992FF', marginLeft: 4 }]}>{c.difficulty}</Text>
                    </View>
                  </View>
                  <Text style={styles.bio}>{c.bio}</Text>
                </Pressable>
              </Animated.View>
            );
          })}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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
  title: { color: '#F2EEFF', fontSize: 18, fontWeight: '800' },
  subtitle: { color: 'rgba(242,238,255,0.7)', marginBottom: spacing.lg, fontSize: 14 },
  card: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: radius.xl,
    padding: spacing.lg,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  row: { flexDirection: 'row', alignItems: 'center' },
  name: { color: '#F2EEFF', fontSize: 18, fontWeight: '800' },
  role: { color: 'rgba(242,238,255,0.7)', fontSize: 12, marginTop: 2 },
  tagline: { color: '#F2EEFF', fontSize: 13, marginTop: 6 },
  activePill: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  lockChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(250,204,21,0.15)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radius.pill,
  },
  lockText: { color: '#FACC15', fontSize: 10, fontWeight: '700' },
  tagsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: spacing.md },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.pill,
  },
  tagText: { color: '#F2EEFF', fontSize: 11, fontWeight: '600' },
  bio: { color: 'rgba(242,238,255,0.72)', fontSize: 12, marginTop: spacing.md, lineHeight: 18 },
});
