import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Modal, Pressable } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  Easing,
} from 'react-native-reanimated';

import { useGamification, PendingReward } from '@/contexts/GamificationContext';
import { radius, spacing } from '@/config/theme';

const AnimatedView = Animated.createAnimatedComponent(View);

export const RewardModal: React.FC = () => {
  const { state, popReward } = useGamification();
  const [current, setCurrent] = useState<PendingReward | null>(null);
  const scale = useSharedValue(0);

  useEffect(() => {
    if (!current && state.pendingRewards.length > 0) {
      const next = popReward();
      if (next) {
        setCurrent(next);
        scale.value = 0;
        scale.value = withSpring(1, { damping: 12, stiffness: 120 });
      }
    }
  }, [state.pendingRewards, current, popReward, scale]);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: scale.value,
  }));

  if (!current) return null;

  const handleClose = () => {
    scale.value = withTiming(0, { duration: 200, easing: Easing.in(Easing.quad) }, (finished) => {
      if (finished) {
        // eslint-disable-next-line react-hooks/exhaustive-deps
      }
    });
    setTimeout(() => setCurrent(null), 220);
  };

  const validIcon = (Ionicons.glyphMap as Record<string, number>)[current.icon];

  return (
    <Modal transparent visible animationType="fade" onRequestClose={handleClose}>
      <View style={styles.backdrop}>
        <AnimatedView style={[styles.cardWrap, animStyle]}>
          <LinearGradient
            colors={[current.color, '#7C5CFF']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.card}
          >
            <View style={styles.iconCircle}>
              {validIcon ? (
                <Ionicons name={current.icon as keyof typeof Ionicons.glyphMap} size={56} color="#FFFFFF" />
              ) : (
                <Text style={{ fontSize: 48 }}>{current.icon}</Text>
              )}
            </View>
            <Text style={styles.title}>{current.title}</Text>
            <Text style={styles.desc}>{current.description}</Text>
            <View style={styles.rewardsRow}>
              {current.xp > 0 && (
                <View style={styles.rewardChip}>
                  <Ionicons name="flash" size={14} color="#FACC15" />
                  <Text style={styles.rewardText}>+{current.xp} XP</Text>
                </View>
              )}
              {current.coins > 0 && (
                <View style={styles.rewardChip}>
                  <Ionicons name="logo-bitcoin" size={14} color="#FACC15" />
                  <Text style={styles.rewardText}>+{current.coins}</Text>
                </View>
              )}
            </View>
            <Pressable onPress={handleClose} style={styles.cta} testID="reward-claim-btn">
              <Text style={styles.ctaText}>Awesome!</Text>
            </Pressable>
          </LinearGradient>
        </AnimatedView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  cardWrap: {
    width: '100%',
    maxWidth: 360,
  },
  card: {
    borderRadius: radius.xxl,
    padding: spacing.xl,
    alignItems: 'center',
  },
  iconCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.4)',
  },
  title: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '800',
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  desc: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  rewardsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  rewardChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(0,0,0,0.25)',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.pill,
  },
  rewardText: { color: '#FFFFFF', fontWeight: '700', fontSize: 12 },
  cta: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: radius.pill,
  },
  ctaText: { color: '#1A0F3D', fontWeight: '800', fontSize: 15 },
});

export default RewardModal;
