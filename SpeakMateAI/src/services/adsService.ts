// AdsService — central AdMob manager (Phase 2, native).
//
// Uses `react-native-google-mobile-ads` when the native module is present
// (release AAB / custom dev client). In Expo Go the module is absent, so
// every function silently no-ops. This keeps `expo start` usable while the
// physical-device release AAB shows real ads.
//
// Ad Unit IDs are baked in; App ID lives in app.json (config plugin).
// During __DEV__ we always use Google's official TEST IDs so we never risk
// invalidating our AdMob account by clicking live ads on our own device.

import { Platform } from 'react-native';

// ---- Production Ad Unit IDs (Android) -------------------------------------
const PROD_BANNER       = 'ca-app-pub-3735972538807236/9248949370';
const PROD_INTERSTITIAL = 'ca-app-pub-3735972538807236/9256241120';
const PROD_REWARDED     = 'ca-app-pub-3735972538807236/4056332447';

// ---- Dynamic native module load (Expo-Go safe) ----------------------------
type Ads = {
  default: any;
  BannerAd: any;
  BannerAdSize: any;
  InterstitialAd: any;
  RewardedAd: any;
  AdEventType: any;
  RewardedAdEventType: any;
  TestIds: any;
  MaxAdContentRating: any;
};

let ads: Ads | null = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  ads = require('react-native-google-mobile-ads');
} catch {
  ads = null;
}

export const adsAvailable = () => Platform.OS === 'android' && ads !== null;

// ---- SSV context (uid + endpoint carried into custom_data) ---------------
let ssvUid: string | null = null;
export function setAdsAuthContext(uid: string | null) {
  ssvUid = uid;
}

// Public unit-ID getters (Banner is a React component so exported from here).
export function bannerAdUnitId(): string {
  if (!ads) return PROD_BANNER;
  return __DEV__ ? ads.TestIds.BANNER : PROD_BANNER;
}
export function bannerAdSize() {
  return ads?.BannerAdSize?.ANCHORED_ADAPTIVE_BANNER ?? 'ADAPTIVE_BANNER';
}
export function BannerAdComponent() {
  return ads?.BannerAd ?? null;
}

// ---- Init -----------------------------------------------------------------
let initialized = false;
export async function initAds() {
  if (!adsAvailable() || initialized) return;
  try {
    const mobileAds = ads!.default;
    await mobileAds().setRequestConfiguration({
      maxAdContentRating: ads!.MaxAdContentRating.PG,
      tagForChildDirectedTreatment: false,
      tagForUnderAgeOfConsent: false,
    });
    await mobileAds().initialize();
    initialized = true;
    // Warm up interstitial + rewarded in parallel (safe if it fails).
    preloadInterstitial();
    preloadRewarded();
  } catch (e) {
    console.warn('[ads] init failed', e);
  }
}

// ---- Interstitial ---------------------------------------------------------
let interstitial: any = null;
let interstitialLoaded = false;

export function preloadInterstitial() {
  if (!adsAvailable()) return;
  try {
    const unitId = __DEV__ ? ads!.TestIds.INTERSTITIAL : PROD_INTERSTITIAL;
    interstitial = ads!.InterstitialAd.createForAdRequest(unitId, {
      requestNonPersonalizedAdsOnly: true,
    });
    interstitial.addAdEventListener(ads!.AdEventType.LOADED, () => {
      interstitialLoaded = true;
    });
    interstitial.addAdEventListener(ads!.AdEventType.CLOSED, () => {
      interstitialLoaded = false;
      // Preload the next one silently.
      try { interstitial.load(); } catch {}
    });
    interstitial.addAdEventListener(ads!.AdEventType.ERROR, () => {
      interstitialLoaded = false;
    });
    interstitial.load();
  } catch (e) {
    console.warn('[ads] preload interstitial failed', e);
  }
}

/** Show an interstitial if it's ready. Never blocks the caller flow. */
export async function showInterstitial(): Promise<boolean> {
  if (!adsAvailable() || !interstitial) return false;
  if (!interstitialLoaded) {
    try { interstitial.load(); } catch {}
    return false;
  }
  try {
    await interstitial.show();
    interstitialLoaded = false;
    return true;
  } catch {
    return false;
  }
}

// ---- Rewarded -------------------------------------------------------------
let rewarded: any = null;
let rewardedLoaded = false;

export function preloadRewarded() {
  if (!adsAvailable()) return;
  try {
    const unitId = __DEV__ ? ads!.TestIds.REWARDED : PROD_REWARDED;
    rewarded = ads!.RewardedAd.createForAdRequest(unitId, {
      requestNonPersonalizedAdsOnly: true,
    });
    rewarded.addAdEventListener(ads!.RewardedAdEventType.LOADED, () => {
      rewardedLoaded = true;
    });
    rewarded.addAdEventListener(ads!.AdEventType.CLOSED, () => {
      rewardedLoaded = false;
      try { rewarded.load(); } catch {}
    });
    rewarded.addAdEventListener(ads!.AdEventType.ERROR, () => {
      rewardedLoaded = false;
    });
    rewarded.load();
  } catch (e) {
    console.warn('[ads] preload rewarded failed', e);
  }
}

export function isRewardedReady(): boolean {
  return adsAvailable() && rewardedLoaded;
}

/**
 * Show rewarded ad. Resolves to `true` ONLY if the user earned the reward.
 * If ad is not ready, tries to load it and returns false immediately.
 * If native module not present (Expo Go), returns `true` so dev flow works.
 *
 * When SSV is configured in AdMob console, we tag the request with
 * user_id + custom_data so the backend callback can attribute the reward
 * to the right user.
 */
export function showRewarded(endpoint?: string): Promise<boolean> {
  return new Promise((resolve) => {
    // Expo Go / non-Android: pretend the reward was earned so dev flow works.
    if (!adsAvailable() || !rewarded) {
      resolve(true);
      return;
    }
    if (!rewardedLoaded) {
      try { rewarded.load(); } catch {}
      resolve(false);
      return;
    }
    // Tag with SSV custom data so Google's server callback reaches our
    // backend with { uid, endpoint }. No-op when the API isn't available.
    if (ssvUid && typeof rewarded.setServerSideVerificationOptions === 'function') {
      try {
        rewarded.setServerSideVerificationOptions({
          userId: ssvUid,
          customData: `uid:${ssvUid}${endpoint ? `|endpoint:${endpoint}` : ''}`,
        });
      } catch {}
    }
    let earned = false;
    const offReward = rewarded.addAdEventListener(
      ads!.RewardedAdEventType.EARNED_REWARD,
      () => { earned = true; }
    );
    const offClosed = rewarded.addAdEventListener(ads!.AdEventType.CLOSED, () => {
      try { offReward(); } catch {}
      try { offClosed(); } catch {}
      rewardedLoaded = false;
      // Silently reload for next attempt.
      try { rewarded.load(); } catch {}
      resolve(earned);
    });
    const offError = rewarded.addAdEventListener(ads!.AdEventType.ERROR, () => {
      try { offReward(); } catch {}
      try { offClosed(); } catch {}
      try { offError(); } catch {}
      rewardedLoaded = false;
      resolve(false);
    });
    try {
      rewarded.show();
    } catch {
      resolve(false);
    }
  });
}
