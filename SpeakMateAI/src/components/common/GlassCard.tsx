import React from 'react';
import { View, ViewStyle, StyleProp } from 'react-native';
import { radius, spacing } from '@/config/theme';

interface Props {
  style?: StyleProp<ViewStyle>;
  children: React.ReactNode;
  borderRadius?: number;
  tone?: 'dark' | 'light';
  padding?: number;
}

export const GlassCard: React.FC<Props> = ({
  style,
  children,
  borderRadius = radius.lg,
  tone = 'dark',
  padding = spacing.lg,
}) => {
  const bg = tone === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.85)';
  const border = tone === 'dark' ? 'rgba(255,255,255,0.14)' : 'rgba(0,0,0,0.08)';
  return (
    <View
      style={[
        {
          backgroundColor: bg,
          borderRadius,
          borderWidth: 1,
          borderColor: border,
          padding,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
};

export default GlassCard;
