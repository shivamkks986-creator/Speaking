// UMP (User Messaging Platform) consent service.
//
// Google requires app publishers serving EEA/UK/CH users to present a
// consent form for personalised ads (GDPR/DPA/nFADP). This wraps the
// AdsConsent APIs from `react-native-google-mobile-ads` and exposes:
//
//   - initConsent(): call ONCE on app cold-start BEFORE initAds()
//   - showPrivacyOptions(): let the user re-open the form (Settings → Privacy)
//   - canRequestAds(): tells adsService whether it's safe to load ads yet
//
// Outside the EEA/UK/CH region Google will report NOT_REQUIRED and this
// module resolves immediately without showing any UI.

import { Platform } from 'react-native';

let ads: any = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  ads = require('react-native-google-mobile-ads');
} catch {
  ads = null;
}

// When native module isn't available (Expo Go, iOS Simulator without RN AdMob),
// we assume ads can be requested (test IDs, no personal data anyway).
let cachedCanRequest = true;
let inFlight: Promise<void> | null = null;

/**
 * Blocking call — resolves once the consent form (if any) is dismissed.
 * MUST be awaited BEFORE `initAds()` per Google's UMP integration guide.
 */
export async function initConsent(): Promise<void> {
  if (!ads || !ads.AdsConsent) return;
  if (Platform.OS === 'web') return;
  if (inFlight) return inFlight;

  inFlight = (async () => {
    try {
      // Ask Google whether this user needs to see a consent form.
      // `tagForUnderAgeOfConsent` false + no debug settings → default UMP behaviour.
      const info = await ads.AdsConsent.requestInfoUpdate({
        // Add EEA test-region here during QA only (leave default in production):
        // debugGeography: ads.AdsConsentDebugGeography.EEA,
      });

      // status: REQUIRED | NOT_REQUIRED | OBTAINED | UNKNOWN
      // Only launch the form if user hasn't already responded.
      if (info && info.isConsentFormAvailable) {
        try {
          await ads.AdsConsent.loadAndShowConsentFormIfRequired();
        } catch {
          // User dismissed or offline — proceed with non-personalized ads.
        }
      }

      // Ask the SDK whether we may serve ads now.
      const can = await ads.AdsConsent.getConsentInfo();
      cachedCanRequest = !!can?.canRequestAds;
    } catch {
      // Any UMP error → fall back to non-personalized ads (still safe & legal).
      cachedCanRequest = true;
    }
  })();

  return inFlight;
}

/** True when Google says we can request ads (or when UMP isn't applicable). */
export function canRequestAds(): boolean {
  return cachedCanRequest;
}

/**
 * Re-open the privacy options form so a user can withdraw / change their
 * consent. Wire this to a "Manage privacy settings" button in Settings.
 * Silently no-ops when the user isn't in an applicable jurisdiction.
 */
export async function showPrivacyOptions(): Promise<void> {
  if (!ads?.AdsConsent?.showPrivacyOptionsForm) return;
  try {
    await ads.AdsConsent.showPrivacyOptionsForm();
    const can = await ads.AdsConsent.getConsentInfo();
    cachedCanRequest = !!can?.canRequestAds;
  } catch {
    // ignore — form couldn't be shown (unsupported region)
  }
}

/** Debug-only: reset locally-stored consent (use during QA). */
export async function resetConsent(): Promise<void> {
  if (!ads?.AdsConsent?.reset) return;
  try {
    await ads.AdsConsent.reset();
  } catch {
    // ignore
  }
}
