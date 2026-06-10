import React from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { Text, useTheme } from 'react-native-paper';

interface Props {
  score: number; // 0-100
  size?: number;
  label?: string;
  sublabel?: string;
}

export default function ScoreRing({ score, size = 140, label, sublabel }: Props) {
  const theme = useTheme();
  const strokeWidth = 12;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.max(0, Math.min(100, score));
  const dashOffset = circumference * (1 - clamped / 100);

  const color =
    clamped >= 80 ? theme.colors.tertiary : clamped >= 60 ? theme.colors.primary : theme.colors.secondary;

  return (
    <View style={[styles.wrap, { width: size, height: size }]}>
      <Svg width={size} height={size}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={theme.colors.surfaceVariant}
          strokeWidth={strokeWidth}
          fill="none"
        />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth={strokeWidth}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={dashOffset}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
      <View style={styles.center}>
        <Text variant="displaySmall" style={[styles.score, { color }]}>
          {clamped}
        </Text>
        {label ? (
          <Text style={{ color: theme.colors.onSurfaceVariant, fontSize: 11, fontWeight: '700', letterSpacing: 0.5 }}>
            {label}
          </Text>
        ) : null}
        {sublabel ? (
          <Text style={{ color: theme.colors.onSurfaceVariant, fontSize: 10 }}>{sublabel}</Text>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', justifyContent: 'center' },
  center: { position: 'absolute', alignItems: 'center' },
  score: { fontWeight: '800', lineHeight: 44 },
});
