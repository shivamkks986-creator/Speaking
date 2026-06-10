import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, useTheme } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';

interface Props {
  streak: number;
}

export default function StreakBadge({ streak }: Props) {
  const theme = useTheme();
  return (
    <View
      testID="streak-badge"
      style={[styles.badge, { backgroundColor: theme.colors.tertiaryContainer }]}
    >
      <Ionicons name="flame" size={16} color={theme.colors.tertiary} />
      <Text
        variant="labelLarge"
        style={[styles.text, { color: theme.colors.onTertiaryContainer }]}
      >
        {streak} day{streak === 1 ? '' : 's'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    gap: 6,
  },
  text: { fontWeight: '700' },
});
