// Share Score Card — viral component for sharing achievements
import React from 'react';
import { View, StyleSheet, Pressable, Share, Alert } from 'react-native';
import { Text } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

import { radius, spacing } from '@/config/theme';

interface Props {
  title: string;           // e.g. "Speaking Score" / "Interview Result"
  score: number;           // 0-100
  subtitle?: string;       // e.g. "HR Interview · 12 questions"
  breakdown?: { label: string; value: number }[];
  hashtags?: string[];
}

export default function ShareScoreCard({
  title,
  score,
  subtitle,
  breakdown = [],
  hashtags = ['SpeakMateAI', 'EnglishGoals', 'AIInterview'],
}: Props) {
  const onShare = async (channel: 'whatsapp' | 'instagram' | 'general') => {
    const text =
      `🎯 I scored ${score}/100 on ${title} with SpeakMate AI!\n\n` +
      (subtitle ? `${subtitle}\n` : '') +
      (breakdown.length
        ? breakdown.map((b) => `• ${b.label}: ${b.value}/100`).join('\n') + '\n\n'
        : '') +
      `Practice English & ace interviews 🚀\n` +
      `${hashtags.map((h) => `#${h}`).join(' ')}\n\n` +
      `Download SpeakMate AI: https://speakmate.ai`;

    try {
      await Share.share({
        message: text,
        title: `My ${title} on SpeakMate AI`,
      });
    } catch (e: any) {
      Alert.alert('Could not share', e?.message || 'Try again');
    }
  };

  const color = score >= 80 ? '#34D399' : score >= 60 ? '#FACC15' : '#FF6B9D';

  return (
    <View style={styles.wrap}>
      <LinearGradient
        colors={['rgba(124,92,255,0.18)', 'rgba(255,107,157,0.10)']}
        style={styles.card}
      >
        {/* Hero */}
        <View style={styles.headRow}>
          <LinearGradient
            colors={['#FACC15', '#FF6B9D', '#7C5CFF']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.brandDot}
          >
            <Ionicons name="diamond" size={12} color="#fff" />
          </LinearGradient>
          <Text style={styles.brand}>SpeakMate AI</Text>
        </View>

        <Text style={styles.title}>{title}</Text>
        {!!subtitle && <Text style={styles.sub}>{subtitle}</Text>}

        <View style={styles.scoreRow}>
          <Text style={[styles.scoreBig, { color }]}>{score}</Text>
          <Text style={styles.scoreUnit}>/100</Text>
        </View>

        {breakdown.length > 0 && (
          <View style={styles.breakdown}>
            {breakdown.map((b) => (
              <View key={b.label} style={styles.bRow}>
                <Text style={styles.bLabel}>{b.label}</Text>
                <View style={styles.bTrack}>
                  <View style={[styles.bFill, { width: `${b.value}%`, backgroundColor: color }]} />
                </View>
                <Text style={styles.bValue}>{b.value}</Text>
              </View>
            ))}
          </View>
        )}
      </LinearGradient>

      {/* Share buttons */}
      <View style={styles.actions}>
        <ShareBtn
          icon="logo-whatsapp"
          label="WhatsApp"
          color="#25D366"
          onPress={() => onShare('whatsapp')}
          testID="share-card-whatsapp"
        />
        <ShareBtn
          icon="logo-instagram"
          label="Instagram"
          color="#E4405F"
          onPress={() => onShare('instagram')}
          testID="share-card-instagram"
        />
        <ShareBtn
          icon="share-social"
          label="More"
          color="#7C5CFF"
          onPress={() => onShare('general')}
          testID="share-card-general"
        />
      </View>
    </View>
  );
}

function ShareBtn({
  icon,
  label,
  color,
  onPress,
  testID,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  color: string;
  onPress: () => void;
  testID?: string;
}) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.shareBtn, pressed && { opacity: 0.7 }]} testID={testID}>
      <View style={[styles.shareIcon, { backgroundColor: `${color}22`, borderColor: `${color}55` }]}>
        <Ionicons name={icon} size={20} color={color} />
      </View>
      <Text style={styles.shareLabel}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: { marginTop: spacing.md },
  card: {
    borderRadius: radius.xl,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  headRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  brandDot: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brand: { color: '#F2EEFF', fontWeight: '800', fontSize: 13 },
  title: { color: '#F2EEFF', fontWeight: '800', fontSize: 18, marginTop: spacing.md },
  sub: { color: 'rgba(242,238,255,0.65)', fontSize: 12, marginTop: 2 },
  scoreRow: { flexDirection: 'row', alignItems: 'flex-end', marginTop: spacing.md, gap: 4 },
  scoreBig: { fontWeight: '900', fontSize: 56 },
  scoreUnit: { color: 'rgba(242,238,255,0.6)', fontSize: 18, marginBottom: 10 },
  breakdown: { marginTop: spacing.md, gap: 8 },
  bRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  bLabel: { color: 'rgba(242,238,255,0.8)', fontSize: 12, width: 96 },
  bTrack: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.08)',
    overflow: 'hidden',
  },
  bFill: { height: '100%', borderRadius: 3 },
  bValue: { color: '#F2EEFF', fontWeight: '700', fontSize: 12, width: 24, textAlign: 'right' },
  actions: { flexDirection: 'row', marginTop: spacing.md, gap: spacing.md, justifyContent: 'center' },
  shareBtn: { alignItems: 'center', gap: 6 },
  shareIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  shareLabel: { color: '#F2EEFF', fontSize: 11, fontWeight: '600' },
});
