import React from 'react';
import { View, StyleSheet, ViewStyle, StyleProp } from 'react-native';
import { Text, useTheme } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';

interface Props {
  size?: 'sm' | 'md';
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

export default function PremiumBadge({ size = 'md', style, testID }: Props) {
  const theme = useTheme();
  const isSmall = size === 'sm';
  return (
    <View
      testID={testID ?? 'premium-badge'}
      style={[
        styles.badge,
        {
          backgroundColor: theme.colors.tertiaryContainer,
          paddingHorizontal: isSmall ? 6 : 10,
          paddingVertical: isSmall ? 2 : 4,
        },
        style,
      ]}
    >
      <Ionicons
        name="diamond"
        size={isSmall ? 10 : 13}
        color={theme.colors.tertiary}
      />
      <Text
        style={{
          color: theme.colors.onTertiaryContainer,
          fontSize: isSmall ? 9 : 11,
          fontWeight: '800',
          marginLeft: 4,
          letterSpacing: 0.4,
        }}
      >
        PREMIUM
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 999,
    alignSelf: 'flex-start',
  },
});
