// Google Sign-In hook — uses @react-native-google-signin/google-signin
// (the OFFICIAL native Android Google Sign-In SDK). This is the production-grade
// approach used by major apps (Uber, Swiggy, Zomato, etc.).
//
// Why native SDK over expo-auth-session:
//   • Reads google-services.json directly — no custom URI scheme registration
//   • Uses Google Play Services account picker (better UX)
//   • Returns id_token automatically — directly usable with Firebase
//   • SHA-1 validation handled by Google Play Services itself
//   • No "Custom URI scheme not allowed" / "invalid_request" / redirect loops
//
// SETUP CHECKLIST:
//   • Firebase Console → Authentication → Sign-in method → Google ENABLED
//   • Firebase Console → Project Settings → Android app registered with the
//     release-keystore SHA-1 and package name (com.speakmate.ai)
//   • google-services.json placed at project root (referenced from app.json)
//   • app.json plugins array contains "@react-native-google-signin/google-signin"
//   • .env contains EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID (the WEB OAuth Client ID
//     from google-services.json — type 3 — used as the ID-token AUDIENCE)
//   • Rebuild the APK after any of the above changes (native module — requires
//     `npx expo prebuild --clean` + `gradlew assembleRelease`).
import { useCallback, useEffect, useState } from 'react';
import {
  GoogleSignin,
  statusCodes,
  isErrorWithCode,
} from '@react-native-google-signin/google-signin';

import { authService } from '@/services/authService';

export type GoogleAuthState = {
  signIn: () => Promise<void>;
  loading: boolean;
  error: string | null;
  configured: boolean;
};

let configured = false;
function configureOnce() {
  if (configured) return;
  const webClientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;
  if (!webClientId) return; // hook will report this via `configured: false`
  GoogleSignin.configure({
    webClientId,             // Required — used as the ID-token audience for Firebase
    offlineAccess: false,    // We only need a one-time ID token for Firebase
    scopes: ['profile', 'email'],
  });
  configured = true;
}

export function useGoogleAuth(): GoogleAuthState {
  const webClientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;
  // Feature flag — set EXPO_PUBLIC_FEATURE_GOOGLE_SIGNIN=true in .env to enable.
  // Default OFF until production OAuth setup (SHA-1, consent screen) is finalised.
  const featureEnabled = process.env.EXPO_PUBLIC_FEATURE_GOOGLE_SIGNIN === 'true';
  const isConfigured = !!webClientId && featureEnabled;

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isConfigured) configureOnce();
  }, [isConfigured]);

  const signIn = useCallback(async () => {
    if (!isConfigured) {
      setError(
        'Google Sign-In not configured. Add EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID to your .env file.'
      );
      return;
    }
    setError(null);
    setLoading(true);
    try {
      configureOnce();
      // Ensure Google Play Services is available (Android-only check, no-op on iOS)
      await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });

      // Launch the native account picker
      const userInfo = await GoogleSignin.signIn();
      // v16+ returns { type: 'success' | 'cancelled', data?: { idToken, user, ... } }
      // v13-15 returns { idToken, user, ... } directly. Support both shapes.
      const data: { idToken?: string | null; user?: { email?: string | null; name?: string | null } } =
        (userInfo as { data?: unknown }).data
          ? ((userInfo as { data: { idToken?: string | null; user?: { email?: string | null; name?: string | null } } }).data)
          : (userInfo as { idToken?: string | null; user?: { email?: string | null; name?: string | null } });

      if ((userInfo as { type?: string }).type === 'cancelled') {
        setLoading(false);
        return;
      }

      const idToken = data?.idToken ?? null;
      if (!idToken) {
        setError(
          'Google Sign-In did not return an ID token. Verify that EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID is the WEB client (type 3) from google-services.json.'
        );
        setLoading(false);
        return;
      }
      await authService.signInWithGoogleCredential({ idToken, accessToken: null });
    } catch (e) {
      if (isErrorWithCode(e)) {
        switch (e.code) {
          case statusCodes.SIGN_IN_CANCELLED:
            setError(null); // user cancelled, no error to show
            break;
          case statusCodes.IN_PROGRESS:
            setError('Google Sign-In is already in progress.');
            break;
          case statusCodes.PLAY_SERVICES_NOT_AVAILABLE:
            setError('Google Play Services is missing or out of date on this device.');
            break;
          default:
            setError(`Google Sign-In failed (${e.code}): ${e.message}`);
        }
      } else {
        setError(e instanceof Error ? e.message : 'Google Sign-In failed');
      }
    } finally {
      setLoading(false);
    }
  }, [isConfigured]);

  return { signIn, loading, error, configured: isConfigured };
}
