import React, { useEffect, useMemo } from 'react';
import { View, StyleSheet, ScrollView, Pressable, StatusBar } from 'react-native';
import { Text, useTheme, Avatar } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import FadeInView from '@/components/common/FadeInView';

import { RootStackParamList } from '@/navigation/types';
import { useAuth } from '@/contexts/AuthContext';
import { useProgress } from '@/contexts/ProgressContext';
import { useGamification } from '@/contexts/GamificationContext';
import { useCompanion } from '@/contexts/CompanionContext';
import CompanionAvatar from '@/components/feature/CompanionAvatar';
import XPBar from '@/components/feature/XPBar';
import GlassCard from '@/components/common/GlassCard';
import WordOfTheDayCard from '@/components/feature/WordOfTheDayCard';
import { computeDynamicGreeting } from '@/utils/greetings';
import { radius, spacing } from '@/config/theme';

type Nav = NativeStackNavigationProp<RootStackParamList>;

export default function HomeScreen() {
  const theme = useTheme();
  const navigation = useNavigation<Nav>();
  const { user } = useAuth();
  const { stats } = useProgress();
  const { state: gam, level } = useGamification();
  const { companion } = useCompanion();
  const { claimDailyLogin } = useGamification();
  const insets = useSafeAreaInsets();
  const tabBarHeight = useBottomTabBarHeight();

  useEffect(() => {
    // attempt daily login reward on mount
    claimDailyLogin();
  }, [claimDailyLogin]);

  const firstName = (user?.displayName || 'Learner').split(' ')[0];

  const dailyGoalMinutes = 10;
  const todayMinutes = stats.weeklyMinutes[new Date().getDay() === 0 ? 6 : new Date().getDay() - 1] || 0;
  const goalProgress = Math.min(1, todayMinutes / dailyGoalMinutes);

  const dynamicGreeting = useMemo(
    () =>
      computeDynamicGreeting({
        firstName,
        hour: new Date().getHours(),
        xp: gam.xp,
        streak: stats.streak,
        todayMinutes,
        dailyGoalMinutes,
        isPremium: !!user?.isPremium,
      }),
    [firstName, gam.xp, stats.streak, todayMinutes, user?.isPremium]
  );

  return (
    <View style={{ flex: 1, backgroundColor: '#0A0418' }}>
      <LinearGradient
        colors={['#0A0418', '#150828', '#1F0E3D']}
        style={StyleSheet.absoluteFillObject}
      />
      <SafeAreaView style={{ flex: 1 }} edges={['left', 'right']}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: tabBarHeight + 32, paddingHorizontal: spacing.lg }}
        >
          {/* Top bar */}
          <View style={[styles.topBar, { paddingTop: Math.max(insets.top, StatusBar.currentHeight ?? 0, 64) + 16 }]}>
            <View style={{ flex: 1, paddingRight: 12 }}>
              <Text style={styles.dim}>{dynamicGreeting.greeting}</Text>
              <Text style={styles.userName}>{firstName} {dynamicGreeting.emoji}</Text>
              <Text style={styles.nudge} numberOfLines={2}>{dynamicGreeting.nudge}</Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Pressable
                onPress={() => navigation.navigate('Achievements')}
                style={styles.coinChip}
                testID="home-coins-btn"
              >
                <Ionicons name="logo-bitcoin" size={14} color="#FACC15" />
                <Text style={styles.coinText}>{gam.coins}</Text>
              </Pressable>
              <Pressable
                onPress={() => navigation.navigate('Main', { screen: 'Settings' })}
                style={styles.settingsBtn}
                testID="home-settings-btn"
                hitSlop={6}
              >
                <Ionicons name="settings-outline" size={20} color="#F2EEFF" />
              </Pressable>
              <Pressable onPress={() => navigation.navigate('Profile')} testID="home-profile-btn">
                {user?.photoURL ? (
                  <Avatar.Image size={40} source={{ uri: user.photoURL }} />
                ) : (
                  <Avatar.Text
                    size={40}
                    label={(user?.displayName || 'U').slice(0, 1).toUpperCase()}
                    color="#fff"
                    style={{ backgroundColor: companion.accent }}
                  />
                )}
              </Pressable>
            </View>
          </View>

          {/* Companion hero card */}
          <FadeInView duration={500} direction="down">
            <LinearGradient
              colors={[`${companion.accent}30`, 'rgba(124,92,255,0.08)']}
              style={styles.heroCard}
            >
              <View style={styles.heroRow}>
                <CompanionAvatar companion={companion} size={84} showRing />
                <View style={{ flex: 1, marginLeft: spacing.lg }}>
                  <Text style={styles.heroName}>{companion.name}</Text>
                  <Text style={styles.heroRole}>{companion.role}</Text>
                </View>
                <Pressable
                  onPress={() => navigation.navigate('Companions')}
                  style={styles.swapBtn}
                  testID="home-swap-companion-btn"
                >
                  <Ionicons name="swap-horizontal" size={18} color="#F2EEFF" />
                </Pressable>
              </View>
              <Text style={styles.heroGreeting}>
                Hi {firstName} 👋 {companion.greeting}
              </Text>
              <View style={styles.heroActions}>
                <Pressable
                  onPress={() => navigation.navigate('Main', { screen: 'Tutor' })}
                  style={[styles.primaryBtn]}
                  testID="home-start-conversation-btn"
                >
                  <LinearGradient
                    colors={companion.gradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.primaryBtnBg}
                  >
                    <Ionicons name="chatbubbles" size={18} color="#FFFFFF" />
                    <Text style={styles.primaryBtnText}>Start Conversation</Text>
                  </LinearGradient>
                </Pressable>
                <Pressable
                  onPress={() => navigation.navigate('VoiceCall')}
                  style={styles.iconBtn}
                  testID="home-voice-call-btn"
                >
                  <Ionicons name="call" size={20} color="#F2EEFF" />
                </Pressable>
                <Pressable
                  onPress={() => navigation.navigate('DailyMissions')}
                  style={styles.iconBtn}
                  testID="home-daily-challenge-btn"
                >
                  <Ionicons name="trophy" size={20} color="#FACC15" />
                </Pressable>
              </View>
            </LinearGradient>
          </FadeInView>

          {/* Progression card */}
          <FadeInView delay={80} duration={500} direction="down">
            <GlassCard style={{ marginTop: spacing.lg }}>
              <XPBar />
              <View style={styles.progRow}>
                <ProgStat icon="flame" color="#FF6B9D" label="Streak" value={`${stats.streak}d`} />
                <ProgStat icon="trophy" color="#FACC15" label="Best" value={`${Math.max(stats.bestSpeakingScore, stats.bestInterviewScore)}`} />
                <ProgStat icon="ribbon" color="#22D3EE" label="Badges" value={`${gam.unlockedBadgeIds.length}`} />
              </View>
              <View style={styles.goalRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.goalLabel}>
                    Daily goal · {todayMinutes}/{dailyGoalMinutes} min
                  </Text>
                  <View style={styles.goalTrack}>
                    <LinearGradient
                      colors={['#34D399', '#22D3EE']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={{
                        width: `${Math.max(4, goalProgress * 100)}%`,
                        height: '100%',
                        borderRadius: radius.pill,
                      }}
                    />
                  </View>
                </View>
              </View>
            </GlassCard>
          </FadeInView>

          {/* Quick actions grid */}
          <FadeInView delay={140} duration={500} direction="down">
            <Text style={styles.section}>Quick start</Text>
            <View style={styles.grid}>
              <QuickAction
                icon="chatbubbles"
                title="AI Tutor"
                sub="Chat & corrections"
                colors={['#7C5CFF', '#A992FF']}
                onPress={() => navigation.navigate('Main', { screen: 'Tutor' })}
                testID="home-action-tutor"
              />
              <QuickAction
                icon="mic"
                title="Speak"
                sub="Practise voice"
                colors={['#FF6B9D', '#FFA496']}
                onPress={() => navigation.navigate('Main', { screen: 'Speaking' })}
                testID="home-action-speak"
              />
              <QuickAction
                icon="briefcase"
                title="Interview"
                sub="HR · Fresher · Tech"
                colors={['#5B3FE0', '#22D3EE']}
                onPress={() => navigation.navigate('Main', { screen: 'Interview' })}
                testID="home-action-interview"
              />
              <QuickAction
                icon="person"
                title="TMAY"
                sub="Tell-me-about-you"
                colors={['#FACC15', '#FF6B9D']}
                onPress={() => navigation.navigate('TmayTrainer')}
                testID="home-action-tmay"
              />
            </View>
          </FadeInView>

          {/* 30-Day Job Ready Roadmap banner */}
          <FadeInView delay={170} duration={500}>
            <Pressable onPress={() => navigation.navigate('Roadmap')} testID="home-roadmap-banner">
              <LinearGradient
                colors={['#7C5CFF', '#22D3EE']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.roadmapBanner}
              >
                <View style={styles.roadmapIconWrap}>
                  <Ionicons name="rocket" size={26} color="#FFFFFF" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.roadmapLabel}>NEW · CAREER LAUNCHPAD</Text>
                  <Text style={styles.roadmapTitle}>30-Day Job Ready Roadmap</Text>
                  <Text style={styles.roadmapSub}>AI-personalised daily plan · TMAY · interview · communication</Text>
                </View>
                <Ionicons name="chevron-forward" size={22} color="#FFFFFF" />
              </LinearGradient>
            </Pressable>
          </FadeInView>

          {/* Career Tools row — Sales Trainer + Resume Upload */}
          <FadeInView delay={200} duration={500}>
            <View style={styles.careerRow}>
              <Pressable
                onPress={() => navigation.navigate('SalesTrainer')}
                style={{ flex: 1 }}
                testID="home-sales-trainer-btn"
              >
                <LinearGradient
                  colors={['#FACC15', '#FF6B9D']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.careerTile}
                >
                  <Ionicons name="megaphone" size={22} color="#fff" />
                  <View style={{ flex: 1, flexShrink: 1 }}>
                    <Text style={styles.careerTitle} numberOfLines={1} ellipsizeMode="tail">Sales Trainer</Text>
                    <Text style={styles.careerSub} numberOfLines={2} ellipsizeMode="tail">Indian roleplay · 6 scenarios</Text>
                  </View>
                </LinearGradient>
              </Pressable>
              <Pressable
                onPress={() => navigation.navigate('ResumeUpload')}
                style={{ flex: 1 }}
                testID="home-resume-upload-btn"
              >
                <LinearGradient
                  colors={['#34D399', '#7C5CFF']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.careerTile}
                >
                  <Ionicons name="document-text" size={22} color="#fff" />
                  <View style={{ flex: 1, flexShrink: 1 }}>
                    <Text style={styles.careerTitle} numberOfLines={1} ellipsizeMode="tail">Resume Mock</Text>
                    <Text style={styles.careerSub} numberOfLines={2} ellipsizeMode="tail">Upload PDF · AI Qs</Text>
                  </View>
                </LinearGradient>
              </Pressable>
            </View>
          </FadeInView>

          {/* Companions strip */}
          <FadeInView delay={220} duration={500}>
            <View style={styles.sectionRow}>
              <Text style={[styles.section, { flex: 1 }]} numberOfLines={1}>AI Companions</Text>
              <Pressable
                onPress={() => navigation.navigate('Companions')}
                testID="home-see-all-companions"
                hitSlop={8}
              >
                <Text style={styles.seeAll}>See all →</Text>
              </Pressable>
            </View>
            <CompanionsStrip />
          </FadeInView>

          {/* Word of the Day */}
          <FadeInView delay={180} duration={500}>
            <WordOfTheDayCard />
          </FadeInView>

          {/* Social row — Leaderboard + Invite Friends */}
          <FadeInView delay={250} duration={500}>
            <View style={styles.socialRow}>
              <Pressable
                onPress={() => navigation.navigate('Leaderboard')}
                style={{ flex: 1 }}
                testID="home-leaderboard-btn"
              >
                <LinearGradient
                  colors={['#FACC15', '#F59E0B']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.socialTile}
                >
                  <Ionicons name="trophy" size={22} color="#fff" />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.socialTitle}>Leaderboard</Text>
                    <Text style={styles.socialSub}>See your rank</Text>
                  </View>
                </LinearGradient>
              </Pressable>
              <Pressable
                onPress={() => navigation.navigate('InviteFriends')}
                style={{ flex: 1 }}
                testID="home-invite-btn"
              >
                <LinearGradient
                  colors={['#34D399', '#22D3EE']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.socialTile}
                >
                  <Ionicons name="gift" size={22} color="#fff" />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.socialTitle}>Invite Friends</Text>
                    <Text style={styles.socialSub}>Get 7d free</Text>
                  </View>
                </LinearGradient>
              </Pressable>
            </View>
          </FadeInView>

          {/* Premium dashboard preview */}
          <FadeInView delay={280} duration={500}>
            <Pressable
              onPress={() => navigation.navigate('PremiumDashboard')}
              testID="home-premium-dashboard-btn"
            >
              <GlassCard style={{ marginTop: spacing.lg }}>
                <View style={styles.dashHead}>
                  <View>
                    <Text style={styles.dashTitle}>Premium Dashboard</Text>
                    <Text style={styles.dim}>Speaking · Confidence · Pronunciation · Grammar</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color="#C8BBE0" />
                </View>
                <View style={styles.dashRow}>
                  <DashStat label="Speaking" value={stats.bestSpeakingScore || '—'} color="#FF6B9D" />
                  <DashStat label="Best Mock" value={stats.bestInterviewScore || '—'} color="#7C5CFF" />
                  <DashStat label="Level" value={level.id} color={level.color} />
                </View>
              </GlassCard>
            </Pressable>
          </FadeInView>

          {/* Premium CTA */}
          {!user?.isPremium && (
            <FadeInView delay={340} duration={500}>
              <Pressable
                onPress={() => navigation.navigate('Premium')}
                testID="home-premium-cta"
              >
                <LinearGradient
                  colors={['#FACC15', '#FF6B9D', '#7C5CFF']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.premiumCta}
                >
                  <Ionicons name="diamond" size={28} color="#FFFFFF" />
                  <View style={{ flex: 1, marginLeft: spacing.md }}>
                    <Text style={styles.premiumCtaTitle}>Unlock Premium</Text>
                    <Text style={styles.premiumCtaSub}>Unlimited AI · Voice Practice · IELTS Mode</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={22} color="#FFFFFF" />
                </LinearGradient>
              </Pressable>
            </FadeInView>
          )}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

function CompanionsStrip() {
  const { companions, companion: current, selectCompanion } = useCompanion();
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ paddingVertical: spacing.sm, gap: spacing.md }}
    >
      {companions.map((c) => {
        const active = c.id === current.id;
        return (
          <Pressable
            key={c.id}
            onPress={() => selectCompanion(c.id)}
            style={[styles.companionStripCard, active && { borderColor: c.accent }]}
            testID={`home-companion-${c.id}`}
          >
            <CompanionAvatar companion={c} size={48} />
            <Text style={styles.companionStripName}>{c.name}</Text>
            <Text style={styles.companionStripRole} numberOfLines={1}>
              {c.role}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

function QuickAction({
  icon,
  title,
  sub,
  colors,
  onPress,
  testID,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  sub: string;
  colors: [string, string];
  onPress: () => void;
  testID: string;
}) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.quickWrap, { opacity: pressed ? 0.85 : 1 }]} testID={testID}>
      <LinearGradient colors={colors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.quickCard}>
        <Ionicons name={icon} size={22} color="#FFFFFF" />
        <Text style={styles.quickTitle}>{title}</Text>
        <Text style={styles.quickSub}>{sub}</Text>
      </LinearGradient>
    </Pressable>
  );
}

function ProgStat({
  icon,
  color,
  label,
  value,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  label: string;
  value: string | number;
}) {
  return (
    <View style={styles.progStat}>
      <Ionicons name={icon} size={18} color={color} />
      <Text style={styles.progStatValue}>{value}</Text>
      <Text style={styles.progStatLabel}>{label}</Text>
    </View>
  );
}

function DashStat({ label, value, color }: { label: string; value: string | number; color: string }) {
  return (
    <View style={{ alignItems: 'center', flex: 1 }}>
      <Text style={[styles.dashValue, { color }]}>{value}</Text>
      <Text style={styles.dim}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: spacing.sm,
    paddingBottom: spacing.lg,
  },
  dim: { color: 'rgba(242,238,255,0.6)', fontSize: 12 },
  userName: { color: '#F2EEFF', fontSize: 22, fontWeight: '800', marginTop: 2 },
  nudge: { color: '#A992FF', fontSize: 12, fontWeight: '700', marginTop: 6, lineHeight: 17 },
  coinChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(250,204,21,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(250,204,21,0.35)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radius.pill,
  },
  coinText: { color: '#FACC15', fontWeight: '800', fontSize: 12 },
  heroCard: {
    padding: spacing.lg,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  heroRow: { flexDirection: 'row', alignItems: 'center' },
  heroName: { color: '#F2EEFF', fontSize: 22, fontWeight: '800' },
  heroRole: { color: 'rgba(242,238,255,0.7)', fontSize: 13, marginTop: 2 },
  swapBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  heroGreeting: {
    color: '#F2EEFF',
    fontSize: 15,
    marginTop: spacing.md,
    lineHeight: 22,
  },
  heroActions: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.lg },
  primaryBtn: { flex: 1, borderRadius: radius.pill, overflow: 'hidden' },
  primaryBtnBg: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
  },
  primaryBtnText: { color: '#FFFFFF', fontWeight: '800', fontSize: 14 },
  iconBtn: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  progRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.lg,
    gap: spacing.sm,
  },
  progStat: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: radius.md,
    paddingVertical: spacing.sm,
  },
  progStatValue: { color: '#F2EEFF', fontWeight: '800', fontSize: 16, marginTop: 2 },
  progStatLabel: { color: 'rgba(242,238,255,0.6)', fontSize: 11 },
  goalRow: { flexDirection: 'row', alignItems: 'center', marginTop: spacing.md },
  goalLabel: { color: '#F2EEFF', fontSize: 12, fontWeight: '600', marginBottom: 6 },
  goalTrack: { height: 6, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: radius.pill, overflow: 'hidden' },
  section: { color: '#F2EEFF', fontWeight: '700', fontSize: 16 },
  sectionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 32, marginBottom: spacing.md },
  seeAll: { color: '#A992FF', fontWeight: '700', fontSize: 13 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  quickWrap: { width: '48%' },
  quickCard: {
    borderRadius: radius.lg,
    padding: spacing.md,
    height: 104,
    justifyContent: 'space-between',
  },
  quickTitle: { color: '#FFFFFF', fontWeight: '800', fontSize: 15 },
  quickSub: { color: 'rgba(255,255,255,0.85)', fontSize: 11 },
  companionStripCard: {
    width: 110,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: radius.lg,
    padding: spacing.md,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  companionStripName: { color: '#F2EEFF', fontWeight: '800', fontSize: 13, marginTop: 8 },
  companionStripRole: { color: 'rgba(242,238,255,0.6)', fontSize: 10, marginTop: 2 },
  dashHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  dashTitle: { color: '#F2EEFF', fontSize: 16, fontWeight: '800' },
  dashRow: { flexDirection: 'row', marginTop: spacing.md, gap: spacing.sm },
  dashValue: { fontWeight: '800', fontSize: 22 },
  premiumCta: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.lg,
    borderRadius: radius.xl,
    marginTop: spacing.lg,
  },
  premiumCtaTitle: { color: '#FFFFFF', fontSize: 16, fontWeight: '800' },
  premiumCtaSub: { color: 'rgba(255,255,255,0.9)', fontSize: 12, marginTop: 2 },
  socialRow: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.lg },
  socialTile: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.lg,
  },
  socialTitle: { color: '#fff', fontWeight: '800', fontSize: 14 },
  socialSub: { color: 'rgba(255,255,255,0.85)', fontSize: 11, marginTop: 1 },
  settingsBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 4,
  },
  roadmapBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: radius.xl,
    marginTop: spacing.lg,
    shadowColor: '#7C5CFF',
    shadowOpacity: 0.4,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  roadmapIconWrap: { width: 50, height: 50, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  roadmapLabel: { color: 'rgba(255,255,255,0.7)', fontSize: 9, fontWeight: '800', letterSpacing: 1 },
  roadmapTitle: { color: '#FFFFFF', fontSize: 16, fontWeight: '800', marginTop: 2 },
  roadmapSub: { color: 'rgba(255,255,255,0.85)', fontSize: 11, marginTop: 2, lineHeight: 15 },
  careerRow: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.md },
  careerTile: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.md, borderRadius: radius.lg },
  careerTitle: { color: '#FFFFFF', fontSize: 13, fontWeight: '800' },
  careerSub: { color: 'rgba(255,255,255,0.85)', fontSize: 10, marginTop: 1 },
});
