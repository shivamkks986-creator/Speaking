// AdBanner — real AdMob banner when native module present, otherwise nothing.
//
// Rules:
//   • Premium users: never render.
//   • Placement blocklist (voice/interview screens): never render.
//   • Non-Android or Expo Go: renders a tiny placeholder pill so the layout
//     doesn't collapse during dev.
//
// Usage:
//   <AdBanner placement="home_bottom" />
import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import { adsAvailable, bannerAdUnitId, bannerAdSize, BannerAdComponent } from '@/services/adsService';

interface Props {
  placement: string;
  testID?: string;
}

// Screens where ads must NEVER appear (AdMob policy + UX):
const NEVER_SHOW = new Set([
  'speaking_practice',
  'interview_live',
  'voice_call',
  'tmay_recording',
  'sales_roleplay',
]);

export default function AdBanner({ placement, testID }: Props) {
  const { user } = useAuth();
  if (user?.isPremium) return null;
  if (NEVER_SHOW.has(placement)) return null;
  if (Platform.OS !== 'android') return null;

  const BannerAd = BannerAdComponent();
  if (adsAvailable() && BannerAd) {
    return (
      <View style={styles.wrap} testID={testID ?? `ad-banner-${placement}`}>
        <BannerAd
          unitId={bannerAdUnitId()}
          size={bannerAdSize()}
          requestOptions={{ requestNonPersonalizedAdsOnly: true }}
          onAdFailedToLoad={(e: any) => console.warn('[banner]', e?.message ?? e)}
        />
      </View>
    );
  }

  // Expo-Go fallback placeholder (dev only).
  return (
    <View style={styles.placeholder} testID={testID ?? `ad-banner-${placement}`}>
      <Text style={styles.label}>Ad</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', marginVertical: 6 },
  placeholder: {
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
