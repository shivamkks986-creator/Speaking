// MaintenanceScreen — shown when a module's kill switch is OFF.
// Replaces the screen content with a friendly explanation + retry CTA.
import React from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { Text } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';

import { radius, spacing } from '@/config/theme';
import { useRemoteConfig } from '@/contexts/RemoteConfigContext';

interface Props {
  moduleName: string; // human label, e.g. "AI Tutor"
  onRetry?: () => void;
}

export default function MaintenanceScreen({ moduleName, onRetry }: Props) {
  const { config, refresh } = useRemoteConfig();

  return (
    <View style={{ flex: 1, backgroundColor: '#0A0418' }}>
      <LinearGradient
        colors={['#1F0E3D', '#0A0418']}
        style={StyleSheet.absoluteFillObject}
      />
      <SafeAreaView style={{ flex: 1, padding: spacing.lg }}>
        <View style={styles.center}>
          <LinearGradient
            colors={['#FACC15', '#FF6B9D']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.iconWrap}
          >
            <Ionicons name="construct" size={48} color="#FFFFFF" />
          </LinearGradient>
          <Text style={styles.title}>{moduleName} is taking a quick break</Text>
          <Text style={styles.message}>{config.maintenanceMessage}</Text>

          <View style={styles.infoCard}>
            <Ionicons name="time" size={16} color="#A992FF" />
            <Text style={styles.infoText}>
              Usually back online within a few hours
            </Text>
          </View>

          <Pressable
            onPress={() => {
              refresh();
              onRetry?.();
            }}
            style={styles.retry}
            testID="maintenance-retry"
          >
            <LinearGradient
              colors={['#7C5CFF', '#A992FF']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.retryInner}
            >
              <Ionicons name="refresh" size={16} color="#FFFFFF" />
              <Text style={styles.retryText}>Try again</Text>
            </LinearGradient>
          </Pressable>

          {config.budgetRemainingPct < 10 && (
            <Text style={styles.budgetNote}>
              Today's free quota is almost full — premium users continue uninterrupted.
            </Text>
          )}
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.md },
  iconWrap: { width: 96, height: 96, borderRadius: 48, alignItems: 'center', justifyContent: 'center', shadowColor: '#FF6B9D', shadowOpacity: 0.5, shadowRadius: 20 },
  title: { color: '#F2EEFF', fontSize: 22, fontWeight: '800', textAlign: 'center', marginTop: spacing.md, paddingHorizontal: spacing.md },
  message: { color: 'rgba(242,238,255,0.7)', fontSize: 14, textAlign: 'center', lineHeight: 21, paddingHorizontal: spacing.lg },
  infoCard: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: 'rgba(124,92,255,0.12)', paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: radius.pill, borderWidth: 1, borderColor: 'rgba(124,92,255,0.3)', marginTop: spacing.sm },
  infoText: { color: '#A992FF', fontSize: 12, fontWeight: '700' },
  retry: { marginTop: spacing.lg },
  retryInner: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: spacing.xl, paddingVertical: spacing.md, borderRadius: radius.pill },
  retryText: { color: '#FFFFFF', fontSize: 14, fontWeight: '800' },
  budgetNote: { color: 'rgba(242,238,255,0.45)', fontSize: 11, fontStyle: 'italic', textAlign: 'center', marginTop: spacing.lg, paddingHorizontal: spacing.lg },
});
