import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { useGamification } from '@/contexts/GamificationContext';
import { radius, spacing } from '@/config/theme';

interface Props {
  compact?: boolean;
}

export const XPBar: React.FC<Props> = ({ compact = false }) => {
  const { state, level, nextLevel, progressToNext } = useGamification();
  return (
    <View style={{ width: '100%' }}>
      <View style={styles.row}>
        <Text style={[styles.label, compact && { fontSize: 11 }]}>
          {level.badge} {level.name}
        </Text>
        <Text style={[styles.xp, compact && { fontSize: 11 }]}>
          {state.xp} XP{nextLevel ? ` / ${nextLevel.minXp}` : ''}
        </Text>
      </View>
      <View style={styles.track}>
        <LinearGradient
          colors={[level.color, nextLevel?.color || level.color]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={{
            width: `${Math.max(4, progressToNext * 100)}%`,
            height: '100%',
            borderRadius: radius.pill,
          }}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  label: { color: '#F2EEFF', fontWeight: '700', fontSize: 13 },
  xp: { color: 'rgba(242,238,255,0.7)', fontWeight: '600', fontSize: 12 },
  track: {
    height: 8,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: radius.pill,
    overflow: 'hidden',
  },
});

export default XPBar;
