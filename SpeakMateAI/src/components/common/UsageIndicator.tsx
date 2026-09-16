// UsageIndicator — small pill showing "3 of 5 daily left" for a specific
// AI endpoint. Hidden for premium users. Tapping opens the Premium screen.
//
// Usage:
//   <UsageIndicator endpoint="interview_live" />
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { usageService, QuotaStatus } from '@/services/usageService';
import { useAuth } from '@/contexts/AuthContext';

interface Props {
  endpoint: string;
  onLimitHit?: () => void;
}

export default function UsageIndicator({ endpoint, onLimitHit }: Props) {
  const nav = useNavigation<any>();
  const { user } = useAuth();
  const [quota, setQuota] = useState<QuotaStatus | null>(null);

  useEffect(() => {
    if (!user?.uid || user?.isPremium) return;
    let cancelled = false;
    usageService.getQuota().then((q) => {
      if (!cancelled) setQuota(q);
    });
    return () => { cancelled = true; };
  }, [user?.uid, user?.isPremium, endpoint]);

  if (!user?.uid || user?.isPremium || !quota) return null;
  const ep = quota.per_endpoint?.[endpoint];
  if (!ep) return null;
  const isOut = ep.remaining <= 0;

  if (isOut && onLimitHit) onLimitHit();

  return (
    <Pressable
      onPress={() => nav.navigate('Premium')}
      style={[styles.pill, isOut && styles.pillOut]}
      testID={`usage-indicator-${endpoint}`}
    >
      <Ionicons name={isOut ? 'lock-closed' : 'flash'} size={12} color={isOut ? '#FCA5A5' : '#FACC15'} />
      <Text style={[styles.text, isOut && styles.textOut]}>
        {isOut ? 'Limit reached — Upgrade' : `${ep.remaining} of ${ep.limit + ep.bonus} daily left`}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    alignSelf: 'flex-start',
    paddingHorizontal: 10, paddingVertical: 5,
    backgroundColor: 'rgba(250,204,21,0.12)',
    borderRadius: 999,
    borderWidth: 1, borderColor: 'rgba(250,204,21,0.3)',
  },
  pillOut: { backgroundColor: 'rgba(252,165,165,0.15)', borderColor: 'rgba(252,165,165,0.4)' },
  text: { color: '#FACC15', fontSize: 11, fontWeight: '700' },
  textOut: { color: '#FCA5A5' },
});
