// ErrorBoundary — catches React errors and shows a friendly recovery UI
import React from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { Text } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

import { radius, spacing } from '@/config/theme';

interface State {
  hasError: boolean;
  error?: Error;
}

interface Props {
  children: React.ReactNode;
}

export default class ErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    // eslint-disable-next-line no-console
    console.error('[ErrorBoundary]', error, info.componentStack);
  }

  reset = () => this.setState({ hasError: false, error: undefined });

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <View style={styles.wrap}>
        <LinearGradient colors={['#1A1038', '#0B0618']} style={StyleSheet.absoluteFillObject} />
        <View style={styles.iconWrap}>
          <LinearGradient
            colors={['#FF6B9D', '#7C5CFF']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.iconCircle}
          >
            <Ionicons name="warning" size={36} color="#fff" />
          </LinearGradient>
        </View>
        <Text style={styles.title}>Something went wrong</Text>
        <Text style={styles.sub}>
          {this.state.error?.message || 'An unexpected error occurred. Please try again.'}
        </Text>

        <Pressable onPress={this.reset} style={{ marginTop: spacing.xl }} testID="error-boundary-retry">
          <LinearGradient
            colors={['#7C5CFF', '#FF6B9D']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.cta}
          >
            <Ionicons name="refresh" size={16} color="#fff" />
            <Text style={styles.ctaText}>Try Again</Text>
          </LinearGradient>
        </Pressable>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  wrap: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl },
  iconWrap: { marginBottom: spacing.xl },
  iconCircle: {
    width: 88, height: 88, borderRadius: 44,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#FF6B9D', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.6, shadowRadius: 20, elevation: 12,
  },
  title: { color: '#F2EEFF', fontSize: 22, fontWeight: '800', textAlign: 'center' },
  sub: { color: 'rgba(242,238,255,0.65)', fontSize: 14, textAlign: 'center', marginTop: spacing.sm, lineHeight: 20 },
  cta: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 32, paddingVertical: 14, borderRadius: radius.pill },
  ctaText: { color: '#fff', fontWeight: '800', fontSize: 14 },
});
