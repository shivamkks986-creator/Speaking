import React from 'react';
import { View, StyleSheet, ViewStyle, StyleProp } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from 'react-native-paper';
import { radius } from '@/config/theme';

interface Props {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  colors?: [string, string, ...string[]];
}

export default function GradientCard({ children, style, colors }: Props) {
  const theme = useTheme();
  const defaultColors: [string, string] = [
    theme.colors.primary,
    theme.colors.secondary,
  ];
  return (
    <View style={[styles.wrap, style]}>
      <LinearGradient
        colors={colors ?? defaultColors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradient}
      >
        {children}
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderRadius: radius.xl,
    overflow: 'hidden',
  },
  gradient: {
    padding: 20,
  },
});
