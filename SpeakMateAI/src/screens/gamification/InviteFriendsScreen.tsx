// Invite Friends — referral with WhatsApp / Instagram share
import React, { useMemo } from 'react';
import { View, StyleSheet, Pressable, ScrollView, Share, Alert } from 'react-native';
import { Text } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import * as Clipboard from 'expo-clipboard';

import { useAuth } from '@/contexts/AuthContext';
import GlassCard from '@/components/common/GlassCard';
import { radius, spacing } from '@/config/theme';

export default function InviteFriendsScreen() {
  const navigation = useNavigation();
  const { user } = useAuth();

  const code = useMemo(() => {
    if (!user) return 'SPEAK100';
    return `SM${user.uid.slice(0, 6).toUpperCase()}`;
  }, [user]);

  const link = `https://speakmate.ai/invite/${code}`;

  const message =
    `🎯 I'm using SpeakMate AI to crack interviews and level up my English.\n\n` +
    `Use my code *${code}* to get 7 days of Premium FREE! 🎁\n\n` +
    `Download: ${link}`;

  const onShare = async () => {
    try {
      await Share.share({ message, title: 'Join me on SpeakMate AI' });
    } catch (e: any) {
      Alert.alert('Could not share', e?.message || 'Try again');
    }
  };

  const onCopy = async () => {
    await Clipboard.setStringAsync(code);
    Alert.alert('Copied!', `Referral code ${code} copied to clipboard.`);
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#0A0418' }}>
      <LinearGradient colors={['#1F0E3D', '#0A0418']} style={StyleSheet.absoluteFillObject} />
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        <View style={styles.head}>
          <Pressable onPress={() => navigation.goBack()} testID="invite-back-btn">
            <Ionicons name="chevron-back" size={26} color="#F2EEFF" />
          </Pressable>
          <Text style={styles.title}>Invite Friends</Text>
          <View style={{ width: 26 }} />
        </View>

        <ScrollView contentContainerStyle={{ paddingBottom: 60 }}>
          {/* Hero */}
          <View style={styles.hero}>
            <LinearGradient
              colors={['#FACC15', '#FF6B9D', '#7C5CFF']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.heroBadge}
            >
              <Ionicons name="gift" size={42} color="#fff" />
            </LinearGradient>
            <Text style={styles.heroTitle}>Earn Premium Free</Text>
            <Text style={styles.heroSub}>
              Invite a friend → both of you get{'\n'}<Text style={{ color: '#FACC15', fontWeight: '800' }}>7 days of Premium</Text>
            </Text>
          </View>

          {/* Code card */}
          <GlassCard style={{ marginHorizontal: spacing.lg, marginTop: spacing.lg }}>
            <Text style={styles.codeLabel}>Your referral code</Text>
            <View style={styles.codeRow}>
              <Text style={styles.codeText}>{code}</Text>
              <Pressable onPress={onCopy} style={styles.copyBtn} testID="invite-copy-btn">
                <Ionicons name="copy" size={16} color="#A992FF" />
                <Text style={styles.copyText}>Copy</Text>
              </Pressable>
            </View>
            <Text style={styles.linkText}>{link}</Text>
          </GlassCard>

          {/* Share buttons */}
          <View style={styles.shareGrid}>
            <ShareTile
              icon="logo-whatsapp"
              label="Share on WhatsApp"
              colors={['#25D366', '#128C7E']}
              onPress={onShare}
              testID="invite-whatsapp-btn"
            />
            <ShareTile
              icon="logo-instagram"
              label="Share on Instagram"
              colors={['#E4405F', '#833AB4']}
              onPress={onShare}
              testID="invite-instagram-btn"
            />
            <ShareTile
              icon="share-social"
              label="More options"
              colors={['#7C5CFF', '#A992FF']}
              onPress={onShare}
              testID="invite-more-btn"
            />
          </View>

          {/* How it works */}
          <Text style={styles.section}>How it works</Text>
          <View style={{ paddingHorizontal: spacing.lg, gap: spacing.sm }}>
            <Step n={1} title="Share your code" desc="Send via WhatsApp / Instagram" />
            <Step n={2} title="Friend signs up" desc="They install SpeakMate AI" />
            <Step n={3} title="Both get rewarded" desc="7 days of Premium added instantly" />
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

function ShareTile({
  icon,
  label,
  colors,
  onPress,
  testID,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  colors: [string, string];
  onPress: () => void;
  testID?: string;
}) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [{ opacity: pressed ? 0.85 : 1 }]} testID={testID}>
      <LinearGradient colors={colors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.shareTile}>
        <Ionicons name={icon} size={22} color="#fff" />
        <Text style={styles.shareLabel}>{label}</Text>
        <Ionicons name="chevron-forward" size={18} color="#fff" />
      </LinearGradient>
    </Pressable>
  );
}

function Step({ n, title, desc }: { n: number; title: string; desc: string }) {
  return (
    <View style={styles.step}>
      <View style={styles.stepNum}>
        <Text style={styles.stepNumText}>{n}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.stepTitle}>{title}</Text>
        <Text style={styles.stepDesc}>{desc}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  head: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  title: { color: '#F2EEFF', fontWeight: '800', fontSize: 20 },
  hero: { alignItems: 'center', paddingTop: spacing.lg, paddingHorizontal: spacing.lg },
  heroBadge: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
    shadowColor: '#7C5CFF',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.6,
    shadowRadius: 16,
    elevation: 12,
  },
  heroTitle: { color: '#F2EEFF', fontSize: 28, fontWeight: '800' },
  heroSub: {
    color: 'rgba(242,238,255,0.7)',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 22,
    marginTop: 8,
  },
  codeLabel: { color: 'rgba(242,238,255,0.6)', fontSize: 11, marginBottom: 8 },
  codeRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  codeText: { color: '#F2EEFF', fontWeight: '900', fontSize: 28, letterSpacing: 2 },
  copyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(124,92,255,0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: 'rgba(124,92,255,0.4)',
  },
  copyText: { color: '#A992FF', fontWeight: '700', fontSize: 12 },
  linkText: { color: 'rgba(242,238,255,0.5)', fontSize: 11, marginTop: 10 },
  shareGrid: { paddingHorizontal: spacing.lg, marginTop: spacing.lg, gap: spacing.sm },
  shareTile: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.lg,
  },
  shareLabel: { color: '#fff', fontWeight: '800', fontSize: 14, flex: 1 },
  section: {
    color: '#F2EEFF',
    fontWeight: '800',
    fontSize: 14,
    paddingHorizontal: spacing.lg,
    marginTop: spacing.xl,
    marginBottom: spacing.md,
  },
  step: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  stepNum: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(124,92,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepNumText: { color: '#A992FF', fontWeight: '800' },
  stepTitle: { color: '#F2EEFF', fontWeight: '700', fontSize: 14 },
  stepDesc: { color: 'rgba(242,238,255,0.6)', fontSize: 12, marginTop: 2 },
});
