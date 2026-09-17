// InterstitialTrigger — throttles interstitial ads for free-tier users.
//
// Rule: show interstitial after every N practice completions (default 3).
// Never shown to premium users. Never blocks the caller — fire-and-forget.
//
// Counter is persisted in AsyncStorage so it survives navigation but resets
// after each ad is shown (or every 24h to be polite).
import AsyncStorage from '@react-native-async-storage/async-storage';
import { showInterstitial, adsAvailable } from '@/services/adsService';

const KEY_COUNT = 'interstitial.completions_since_last_ad';
const KEY_LAST_SHOWN = 'interstitial.last_shown_at';
const AD_INTERVAL = 3;                       // Show every 3rd completion
const MIN_GAP_MS = 3 * 60 * 1000;            // ...but not more often than every 3 min
const COUNTER_RESET_MS = 24 * 60 * 60 * 1000; // Auto-reset stale counter every 24h

async function readCount(): Promise<number> {
  try {
    const raw = await AsyncStorage.getItem(KEY_COUNT);
    return raw ? parseInt(raw, 10) || 0 : 0;
  } catch { return 0; }
}
async function writeCount(v: number): Promise<void> {
  try { await AsyncStorage.setItem(KEY_COUNT, String(v)); } catch {}
}
async function readLastShown(): Promise<number> {
  try {
    const raw = await AsyncStorage.getItem(KEY_LAST_SHOWN);
    return raw ? parseInt(raw, 10) || 0 : 0;
  } catch { return 0; }
}
async function writeLastShown(v: number): Promise<void> {
  try { await AsyncStorage.setItem(KEY_LAST_SHOWN, String(v)); } catch {}
}

/**
 * Call this at the end of a successful practice (evaluate/mock/tmay etc).
 * If user is premium OR the interval isn't reached, no-op.
 * If native ads aren't available (Expo Go), also no-op.
 */
export async function recordPracticeCompleted(isPremium: boolean): Promise<boolean> {
  if (isPremium || !adsAvailable()) return false;

  // Enforce minimum gap so back-to-back completions don't spam ads.
  const now = Date.now();
  const lastShown = await readLastShown();
  if (now - lastShown < MIN_GAP_MS) return false;

  // Read current count; auto-reset if stale (>24h since last ad).
  let count = await readCount();
  if (lastShown && now - lastShown > COUNTER_RESET_MS) count = 0;
  count += 1;

  if (count < AD_INTERVAL) {
    await writeCount(count);
    return false;
  }

  // Threshold hit — attempt to show the ad.
  const shown = await showInterstitial();
  if (shown) {
    await writeCount(0);
    await writeLastShown(now);
  } else {
    // Ad wasn't ready — leave counter so the very next completion tries again.
    await writeCount(count);
  }
  return shown;
}

/** For debugging / settings screen. */
export async function debugInterstitialState(): Promise<{ count: number; lastShown: number; interval: number }> {
  return {
    count: await readCount(),
    lastShown: await readLastShown(),
    interval: AD_INTERVAL,
  };
}
