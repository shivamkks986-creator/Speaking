// AdBanner — placeholder banner ad component.
//
// Phase 1 (current): renders NOTHING for premium users, otherwise renders a
// subtle "Ad space" placeholder pill. Zero risk of policy violation.
//
// Phase 2 (next session, with native prebuild): will import
// `BannerAd, BannerAdSize` from `react-native-google-mobile-ads` and render
// the real AdMob banner. See PHASE_2_PLAN.md for wiring instructions.
//
// Usage:
//   <AdBanner placement="home_bottom" />
import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { useAuth } from '@/contexts/AuthContext';

interface Props {
  /** Semantic name of where the ad appears (used for future analytics + AdMob unit routing). */
  placement: string;
  /** Test-ID for QA. */
  testID?: string;
}

/**
 * Screens where ads must NEVER appear (Google AdMob policy + UX rules):
 *   - Any live speaking / voice / interview screen
 *   - Any modal or interactive AI conversation
 *   - Placement names should include a screen prefix so this stays enforceable.
 */
const NEVER_SHOW = new Set([
  'speaking_practice',
  'interview_live',
  'voice_call',
  'tmay_recording',
  'sales_roleplay',
]);

export default function AdBanner({ placement, testID }: Props) {
  const { user } = useAuth();

  // Premium users: never show ads.
  if (user?.isPremium) return null;
  // Enforced blocklist by placement name.
  if (NEVER_SHOW.has(placement)) return null;
  // Web / non-Android: no native AdMob support.
  if (Platform.OS !== 'android') return null;

  // Phase 1 placeholder — this will be replaced by <BannerAd ... /> in Phase 2.
  return (
    <View style={styles.wrap} testID={testID ?? `ad-banner-${placement}`}>
      <Text style={styles.label}>Ad</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    height: 50,
    marginHorizontal: 16,
    marginVertical: 8,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    color: 'rgba(242,238,255,0.35)',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
});
